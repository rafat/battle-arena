// hooks/useBattle.ts
import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent, useAccount, useChainId, useConfig } from 'wagmi';
import { parseEventLogs, TransactionReceipt } from 'viem';
import { readContract } from 'viem/actions';
import { BattleTactics } from '@/lib/types/contracts';
import { CONTRACTS } from '@/lib/web3/config';
import { ARENA_ABI, AGENT_FACTORY_ABI } from '@/lib/contracts/abis';
import { Log, ChainMismatchError } from 'viem';
import { decodeEventLog } from 'viem';
import { useRandomnessFee } from './useRandomnessFee';

// Define the event argument types
interface BattleStartedEventArgs {
  battleId: bigint;
  agent1: bigint;
  agent2: bigint;
  arena: number;
}
interface BattleFinishedEventArgs {
  battleId: bigint;
  winner: bigint;
  loser: bigint;
}

interface CreateBattleParams {
  agent1: bigint;
  agent2: bigint;
  tactics1: BattleTactics;
  tactics2: BattleTactics;
  arenaType: number;
}

interface BattleData {
  battleId: bigint;
  agentIds: bigint[];
  agentHealths: bigint[];
  tactics: BattleTactics[];
  arena: number;
  status: number;
  winner: bigint;
}

export const useBattle = () => {
  const [currentBattleId, setCurrentBattleId] = useState<bigint | null>(null);
  const [battleState, setBattleState] = useState<'idle' | 'creating' | 'waiting' | 'fighting' | 'finished'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasBattleId, setHasBattleId] = useState(false);

  // Get wallet and network info for debugging
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();

  // Get randomness fee from PythEntropy contract
  const { fee: randomnessFee, isLoading: isFeeLoading, isConfigured: isFeeConfigured } = useRandomnessFee();

  const ARENA_CONTRACT_ADDRESS = CONTRACTS.ARENA 
  ? (CONTRACTS.ARENA as `0x${string}`) 
  : undefined;

  const AGENT_FACTORY_CONTRACT_ADDRESS = CONTRACTS.AGENT_FACTORY 
  ? (CONTRACTS.AGENT_FACTORY as `0x${string}`) 
  : undefined;

  // Write contract hooks
  const { 
    writeContractAsync: writeStartBattle, 
    data: startBattleHash, 
    isPending: isCreating,
    error: startBattleError
  } = useWriteContract();
  
  const { 
    writeContractAsync: writeFight, 
    data: fightHash, 
    isPending: isFighting,
    error: fightError
  } = useWriteContract();

  // Read battle data from contract
  const { data: battleData, refetch: refetchBattle } = useReadContract({
    address: ARENA_CONTRACT_ADDRESS,
    abi: ARENA_ABI,
    functionName: 'getBattle',
    args: currentBattleId ? [currentBattleId] : undefined,
    query: {
      enabled: !!currentBattleId,
      // Only refetch when battle is actively fighting and not finished
      // Stop all refreshing once battle state is 'finished'
      refetchInterval: (battleState === 'fighting') ? 2000 : false,
      // Add a stale time to prevent unnecessary refetches
      staleTime: battleState === 'finished' ? 60000 : (battleState === 'fighting' ? 1000 : 5000), 
    },
  }) as { data: BattleData | undefined, refetch: () => Promise<any> };

  // Read battle count
  const { data: battleCount } = useReadContract({
    address: ARENA_CONTRACT_ADDRESS,
    abi: ARENA_ABI,
    functionName: 'getBattleCount',
  });

  // Effect to update battle state based on contract data
  useEffect(() => {
    if (battleData && currentBattleId) {
      const battle = battleData as BattleData;
      
      // If contract shows battle is finished but our state is not updated
      if (battle.status === 1 && battleState !== 'finished') {
        console.log('📊 Contract shows battle is finished, updating state to finished');
        setBattleState('finished');
        // Clear any ongoing intervals by forcing a state update
        setTimeout(() => {
          console.log('✅ Battle state confirmed as finished, stopping all refresh intervals');
        }, 100);
      }
      
      // If contract shows battle is ongoing and we're in fighting state, that's correct
      if (battle.status === 0 && battleState === 'fighting') {
        console.log('📊 Battle is ongoing as expected');
      }
    }
  }, [battleData, currentBattleId, battleState]);

  // Wait for battle creation transaction
  const startReceipt = useWaitForTransactionReceipt({
    hash: startBattleHash,
    query: {
      enabled: !!startBattleHash,
    },
  });

  // Wait for fight transaction
  const fightReceipt = useWaitForTransactionReceipt({
    hash: fightHash,
    query: {
      enabled: !!fightHash,
    },
  });

  // Event listener for BattleStarted
  // The 'enabled' property is crucial here. Only enable when the contract address is known.
  useWatchContractEvent({
    address: ARENA_CONTRACT_ADDRESS,
    abi: ARENA_ABI,
    eventName: 'BattleStarted',
    onLogs: (logs) => { // No need for 'async' here as it's not directly doing async logic from here
      console.log('BattleStarted event received. Contract:', ARENA_CONTRACT_ADDRESS);
      console.log('Logs count:', logs.length);
      
      // Crucial: Check if logs array is not empty before attempting to iterate or access elements.
      if (!logs || logs.length === 0) {
        console.warn('BattleStarted event: No logs received or logs array is empty.');
        return;
      }

      logs.forEach(log => {
        try {
          // This check is good but if logs itself is null, the outer check prevents errors
          if (!log) {
            console.warn('Skipping null log within BattleStarted event loop.');
            return;
          }
          
          const decoded = decodeEventLog({
            abi: ARENA_ABI,
            eventName: 'BattleStarted',
            data: log.data,
            topics: log.topics,
          });
          
          // Use more specific type assertion for decoded.args for safety
          const args = decoded.args as unknown as BattleStartedEventArgs;
          
          // Safely check for args, as it can be null or undefined
          if (!args || args.battleId === undefined) { // Check for a key that must exist
            console.warn('BattleStarted event had no valid args or battleId.');
            return;
          }
          
          const battleId = args.battleId;
          const agent1 = args.agent1;
          const agent2 = args.agent2;
          const arena = args.arena;
          
          console.log('Battle started with ID:', battleId.toString());
          
          setCurrentBattleId(battleId);
          setHasBattleId(true);
          setBattleState('waiting');
          setError(null);
          
          syncBattleStartedToDatabase(battleId, agent1, agent2, arena);
        } catch (decodeError) {
          console.error('Failed to decode BattleStarted log or process:', log, decodeError);
          // If the error happens during processing, don't necessarily stop watching.
          // But if it's a critical error that implies malformed data, it might indicate
          // a deeper issue with the RPC or ABI.
        }
      });
    },
    onError: (error) => {
      // This onError captures errors from the underlying watch mechanism (e.g., RPC issues)
      console.error('Error watching BattleStarted event:', error);
      setError(`Failed to listen for battle start event: ${error.message || error}`);
      // Consider setting state back to idle or an error state if watch fails critically
      // setBattleState('idle'); 
    },
    // Ensure this is only enabled when the contract address is definitely available
    enabled: !!ARENA_CONTRACT_ADDRESS && (isCreating || startReceipt.isLoading),
    // Add strict polling interval to ensure consistent fetching if needed,
    // though the default should be fine for most cases.
    // pollingInterval: 3000, 
  });

  // Event listener for BattleFinished
  useWatchContractEvent({
    address: ARENA_CONTRACT_ADDRESS,
    abi: ARENA_ABI,
    eventName: 'BattleFinished',
    onLogs: (logs) => { // No need for 'async' here
      console.log('BattleFinished event received. Contract:', ARENA_CONTRACT_ADDRESS);
      console.log('Logs count:', logs.length);
      
      // Crucial: Check if logs array is not empty
      if (!logs || logs.length === 0) {
        console.warn('BattleFinished event: No logs received or logs array is empty.');
        return;
      }

      logs.forEach(log => {
        try {
          if (!log) {
            console.warn('Skipping null log within BattleFinished event loop.');
            return;
          }
          
          const decoded = decodeEventLog({
            abi: ARENA_ABI,
            eventName: 'BattleFinished',
            data: log.data,
            topics: log.topics,
          });
          
          // Use more specific type assertion for decoded.args for safety
          const args = decoded.args as unknown as BattleFinishedEventArgs;
          
          // Safely check for args
          if (!args || args.battleId === undefined) {
            console.warn('BattleFinished event had no valid args or battleId.');
            return;
          }
          
          const battleId = args.battleId;
          const winner = args.winner;
          const loser = args.loser;
          
          console.log('🏁 Battle finished - ID:', battleId.toString(), 'Winner:', winner.toString());
          
          if (currentBattleId && battleId === currentBattleId) {
            console.log('🎯 Setting battle state to finished for current battle');
            setBattleState('finished');
            setError(null);
            syncBattleFinishedToDatabase(battleId, winner, loser);
          }
        } catch (decodeError) {
          console.error('Failed to decode BattleFinished log or process:', log, decodeError);
        }
      });
    },
    onError: (error) => {
      console.error('Error watching BattleFinished event:', error);
      setError(`Failed to listen for battle finish event: ${error.message || error}`);
    },
    // Only watch for BattleFinished events when we have a current battle and it's not already finished
    // This prevents the watcher from staying active after battle completion
    enabled: (() => {
      const isEnabled = !!ARENA_CONTRACT_ADDRESS && !!currentBattleId && battleState !== 'finished' && (battleState === 'fighting' || isFighting || fightReceipt.isLoading);
      console.log('👀 BattleFinished event watcher enabled:', isEnabled, {
        hasContract: !!ARENA_CONTRACT_ADDRESS,
        hasBattleId: !!currentBattleId,
        battleState,
        isFighting,
        isLoadingReceipt: fightReceipt.isLoading
      });
      return isEnabled;
    })(),
  });

  // Fixed getBattleFromContract function
  const getBattleFromContract = useCallback(async (battleId: bigint): Promise<BattleData | null> => {
    try {
      // Force refetch and wait for it to complete
      const result = await refetchBattle();
      
      // Return the fresh data from the refetch result
      if (result.data) {
        return result.data as BattleData;
      }
      
      // Fallback to current battleData if refetch doesn't return data
      // (though with a direct refetch, `result.data` should be preferred)
      return battleData || null;
    } catch (err) {
      console.error('Failed to fetch battle from contract:', err);
      return null;
    }
  }, [refetchBattle, battleData]); // Include battleData in dependency array if you use it as a fallback

  // Handle battle creation success (from transaction receipt)
  const handleBattleCreated = useCallback(async (receipt: TransactionReceipt) => {
    try {
      console.log('Battle creation transaction confirmed:', receipt.transactionHash);
      console.log('Transaction receipt logs count:', receipt.logs.length);
      
      // Prefer event listener for state updates, but parse from receipt as a robust backup
      const logs = parseEventLogs({
        abi: ARENA_ABI,
        eventName: 'BattleStarted',
        logs: receipt.logs,
      });
      
      console.log('Parsed BattleStarted logs count:', logs.length);
      
      if (logs.length > 0) {
        const battleStartedLog = logs[0];
        console.log('Raw battle started log:', battleStartedLog);
        
        // Use proper event decoding instead of type assertion
        const decoded = decodeEventLog({
          abi: ARENA_ABI,
          eventName: 'BattleStarted',
          data: battleStartedLog.data,
          topics: battleStartedLog.topics,
        });
        
        console.log('Decoded event:', decoded);
        const args = decoded.args as unknown as BattleStartedEventArgs;
        console.log('Event args:', args);
        
        const battleId = args.battleId;
        console.log('Battle ID from transaction receipt:', battleId.toString());
        
        // Validate that battleId is not 0
        if (battleId === BigInt(0)) {
          console.error('⚠️ Battle ID is 0! This indicates an issue with the contract or event parsing.');
          console.log('Full event args:', args);
          console.log('Raw log data:', battleStartedLog.data);
          console.log('Raw log topics:', battleStartedLog.topics);
          
          // Try to get the battle count as a fallback
          try {
            console.log('🔄 Attempting to get battle count as fallback for battle ID...');
            const battleCountResponse = await fetch('/api/arena/battle-count');
            if (battleCountResponse.ok) {
              const countData = await battleCountResponse.json();
              const fallbackBattleId = BigInt(countData.count || 1);
              console.log('📊 Using fallback battle ID from count:', fallbackBattleId.toString());
              
              // Use the fallback battle ID
              setCurrentBattleId(fallbackBattleId);
              setHasBattleId(true);
              setBattleState('waiting');
              
              // Wait and sync with fallback ID
              await new Promise(resolve => setTimeout(resolve, 3000));
              await syncBattleToDatabase(fallbackBattleId, receipt);
              return; // Exit early with fallback
            }
          } catch (fallbackError) {
            console.error('❌ Fallback battle count fetch failed:', fallbackError);
          }
          
          throw new Error('Battle ID is 0 and fallback failed');
        }
        
        // Only set if we don't already have it from the event listener (race condition safety)
        if (!hasBattleId || currentBattleId !== battleId) {
          setCurrentBattleId(battleId);
          setHasBattleId(true);
          setBattleState('waiting');
        }
        
        // Wait a bit for the blockchain state to be updated before fetching battle data
        // This is crucial, as the chain might not be instantly consistent across RPC nodes.
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased delay
        
        // Only attempt to sync to database if we have a valid battle ID
        if (battleId !== BigInt(0)) {
          // Sync to database - but don't fail the entire process if sync fails
          try {
            await syncBattleToDatabase(battleId, receipt);
          } catch (syncError) {
            console.error('⚠️ Database sync failed, but battle creation was successful on blockchain:', syncError);
            // Don't throw here - the battle was created successfully on-chain
            // Database sync issues shouldn't break the user flow
          }
        } else {
          console.error('❌ Cannot sync battle with ID 0 to database');
          // Still proceed since the battle might exist on-chain
        }
      } else {
        console.warn('No BattleStarted event found in transaction receipt logs.');
        console.log('All receipt logs:', receipt.logs);
        
        // Try to parse any events from the logs to see what's there
        receipt.logs.forEach((log, index) => {
          console.log(`Log ${index}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          });
        });
      }
    } catch (err) {
      console.error('Failed to process battle creation from receipt:', err);
      setError(`Failed to process battle creation from receipt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [hasBattleId, currentBattleId]);

  // Handle fight completion
  const handleFightCompleted = useCallback(async (receipt: TransactionReceipt) => {
    try {
      console.log('🏁 Fight transaction confirmed:', receipt.transactionHash);
      console.log('📋 Fight receipt logs count:', receipt.logs.length);
      
      // Parse BattleFinished events from the receipt
      const battleFinishedLogs = parseEventLogs({
        abi: ARENA_ABI,
        eventName: 'BattleFinished',
        logs: receipt.logs,
      });
      
      console.log('🏆 Parsed BattleFinished logs count:', battleFinishedLogs.length);
      
      if (battleFinishedLogs.length > 0) {
        const battleFinishedLog = battleFinishedLogs[0];
        console.log('🏅 Raw battle finished log:', battleFinishedLog);
        
        const decoded = decodeEventLog({
          abi: ARENA_ABI,
          eventName: 'BattleFinished',
          data: battleFinishedLog.data,
          topics: battleFinishedLog.topics,
        });
        
        console.log('🎯 Decoded BattleFinished event:', decoded);
        const args = decoded.args as unknown as BattleFinishedEventArgs;
        console.log('🛡️ BattleFinished event args:', args);
        
        const battleId = args.battleId;
        const winner = args.winner;
        const loser = args.loser;
        
        console.log('🏆 Battle completed - ID:', battleId.toString(), 'Winner:', winner.toString(), 'Loser:', loser.toString());
        
        if (currentBattleId && battleId === currentBattleId) {
          console.log('🎆 Setting battle state to finished for current battle');
          setBattleState('finished');
          setError(null);
          
          // Sync battle finished to database
          await syncBattleFinishedToDatabase(battleId, winner, loser);
        }
      } else {
        console.warn('⚠️ No BattleFinished event found in fight transaction receipt');
        console.log('🗺 All fight receipt logs:', receipt.logs);
      }
      
      // The BattleFinished event listener will ideally handle state updates.
      // This section can focus on syncing additional data related to the fight receipt.
      if (currentBattleId) {
        // Wait for potential state updates from the BattleFinished event listener
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give event listener time
        await syncBattleResults(currentBattleId, receipt);
      }
    } catch (err) {
      console.error('❌ Failed to process battle results from receipt:', err);
      setError(`Failed to process battle results from receipt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [currentBattleId]);

  // Sync battle started event to database
  const syncBattleStartedToDatabase = async (
    battleId: bigint, 
    agent1: bigint, 
    agent2: bigint, 
    arena: number
  ) => {
    try {
      const response = await fetch('/api/battles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: Number(battleId),
          agent1_id: Number(agent1),
          agent2_id: Number(agent2),
          arena_type: arena,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      console.log('Battle started event synced to database');
    } catch (err) {
      console.error('Failed to sync battle started event:', err);
      // Do not re-throw if it's just a database sync issue and the on-chain event was successful
    }
  };

  // Sync agent data from smart contract to database
  const syncAgentToDatabase = async (agentId: bigint) => {
    try {
      console.log(`🔄 Syncing agent ${agentId} data from contract to database`);
      
      // Get agent data from smart contract using wagmi's readContract
      const agent = await readContract(config.getClient(), {
        address: AGENT_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
        abi: AGENT_FACTORY_ABI,
        functionName: 'getAgent',
        args: [agentId],
      }) as any;

      if (!agent || agent.id === BigInt(0)) {
        console.warn(`Agent ${agentId} not found on contract`);
        return;
      }

      // Update agent in database
      const response = await fetch(`/api/agents/${agentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: Number(agent.level),
          experience: Number(agent.experience),
          dna: {
            strength: Number(agent.dna.strength),
            agility: Number(agent.dna.agility),
            intelligence: Number(agent.dna.intelligence),
            elemental_affinity: Number(agent.dna.elementalAffinity),
          },
          equipped_item: Number(agent.equippedItem),
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to sync agent ${agentId} to database:`, response.status);
      } else {
        console.log(`✅ Agent ${agentId} synced to database successfully`);
      }
    } catch (err) {
      console.warn(`Failed to sync agent ${agentId}:`, err);
      // Don't throw - agent sync shouldn't break battle flow
    }
  };

  // Sync battle finished event to database - DEPRECATED: Use syncBattleResults instead
  const syncBattleFinishedToDatabase = async (
    battleId: bigint,
    winner: bigint,
    loser: bigint
  ) => {
    // This function is deprecated - syncBattleResults handles the winner update
    console.log('syncBattleFinishedToDatabase called but deprecated - using syncBattleResults instead');
    return;
  };

  // Fixed syncBattleToDatabase function
  const syncBattleToDatabase = async (battleId: bigint, receipt: TransactionReceipt) => {
    try {
      // Validate battle ID first
      if (battleId === BigInt(0)) {
        throw new Error('Cannot sync battle with ID 0 to database');
      }
      
      console.log('Syncing battle to database with ID:', battleId.toString());
      
      // Get battle data from contract with retry logic
      let battle = await getBattleFromContract(battleId);
      let retryCount = 0;
      const maxRetries = 5; // Increased retries
      const retryDelayMs = 2000; // 2 seconds

      // Retry if battle data is not available or if status isn't 'Ongoing' initially
      while ((!battle || battle.status !== 0) && retryCount < maxRetries) { // 0 for Ongoing
        console.log(`Retrying to fetch battle data for sync, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs)); 
        battle = await getBattleFromContract(battleId);
        retryCount++;
      }
      
      if (!battle) {
        throw new Error('Failed to fetch battle data from contract after retries for initial sync');
      }
      
      console.log('Successfully fetched battle data:', {
        battleId: battle.battleId.toString(),
        status: battle.status,
        agentIds: battle.agentIds.map(id => id.toString()),
        arena: battle.arena
      });

      const response = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: Number(battleId),
          agent1_id: Number(battle.agentIds[0]),
          agent2_id: Number(battle.agentIds[1]),
          agent1_tactics: battle.tactics[0],
          agent2_tactics: battle.tactics[1],
          arena_type: battle.arena,
          battle_data: { 
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber?.toString(),
            gasUsed: receipt.gasUsed?.toString(),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
        
        // Check if it's a duplicate key constraint (battle already exists)
        if (errorData.error && errorData.error.includes('duplicate key') || errorData.error.includes('already exists')) {
          console.log('⚠️ Battle already exists in database, this is expected on page refresh or reconnection');
          // Don't throw error for duplicates - just log and continue
          return;
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Battle synced to database:', result);
    } catch (err) {
      const error = err as Error;
      console.error('❌ Failed to sync battle to database:', error.message);
      
      // Only throw for non-duplicate errors to avoid breaking the user experience
      if (!error.message.includes('duplicate key') && !error.message.includes('already exists')) {
        throw err; // Re-throw to handle in calling function
      } else {
        console.log('🔄 Ignoring duplicate battle error - battle likely already exists in database');
      }
    }
  };

  const syncBattleResults = async (battleId: bigint, receipt: TransactionReceipt) => {
    try {
      // Parse battle events from receipt
      const attackLogs = parseEventLogs({
        abi: ARENA_ABI,
        eventName: 'Attack',
        logs: receipt.logs,
      });
      
      const battleFinishedLogs = parseEventLogs({
        abi: ARENA_ABI,
        eventName: 'BattleFinished',
        logs: receipt.logs,
      });

      // Get final battle state with retry logic
      let battle = await getBattleFromContract(battleId);
      let retryCount = 0;
      const maxRetries = 5; // Increased retries
      const retryDelayMs = 2000; // 2 seconds

      while ((!battle || battle.status !== 1) && retryCount < maxRetries) { // 1 for Finished
        console.log(`Retrying to fetch final battle data for sync, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        battle = await getBattleFromContract(battleId);
        retryCount++;
      }
      
      if (!battle) {
        throw new Error('Failed to fetch final battle data after retries for result sync');
      }

      // Prepare battle events for database
      const battleEvents = attackLogs.map((log: Log, index: number) => { // Explicitly type log
        const decodedAttack = decodeEventLog({
          abi: ARENA_ABI,
          eventName: 'Attack',
          data: log.data,
          topics: log.topics,
        });
        const attackArgs = decodedAttack.args as unknown as { attacker: bigint, defender: bigint, damage: bigint };
        return {
          event_type: 'attack',
          attacker_id: attackArgs.attacker.toString(),
          defender_id: attackArgs.defender.toString(),
          damage: Number(attackArgs.damage),
          event_data: { 
            transactionHash: receipt.transactionHash,
            logIndex: index,
            blockNumber: receipt.blockNumber?.toString(),
          },
        };
      });

      const winner = battleFinishedLogs.length > 0 ? 
        ((battleFinishedLogs[0] as unknown as { args: BattleFinishedEventArgs }).args.winner) : 
        battle.winner;

      // Sync battle completion
      const syncResponse = await fetch('/api/battles/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: Number(battleId),
          winner_id: Number(winner),
          battle_data: {
            finalHealths: battle.agentHealths.map(h => h.toString()),
            events: battleEvents,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber?.toString(),
            gasUsed: receipt.gasUsed?.toString(),
          },
        }),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || `Failed to sync battle completion: ${syncResponse.status}`);
      }

      // Sync individual battle events (if needed, or batch this in the main sync)
      // Make this resilient - don't let event sync failures break the main battle flow
      for (const event of battleEvents) {
        try {
          const eventResponse = await fetch(`/api/battles/${battleId}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });

          if (!eventResponse.ok) {
            console.warn(`Failed to sync event: ${event.event_type} - ${eventResponse.status}`);
            // Don't throw error here - just log and continue
          } else {
            console.log(`✅ Synced event: ${event.event_type}`);
          }
        } catch (eventError) {
          console.warn(`Failed to sync event: ${event.event_type}`, eventError);
          // Don't throw error here - just log and continue
        }
      }

      // IMPORTANT: Sync agent data after battle completion
      // This ensures agent level/experience updates are reflected in the database
      console.log('🔄 Syncing agent data after battle completion...');
      
      // Sync both agents (winner gained experience, loser's stats may have changed)
      const agentsToSync = [battle.agentIds[0], battle.agentIds[1]];
      for (const agentId of agentsToSync) {
        await syncAgentToDatabase(agentId);
      }
      
      // Also sync agent battle stats (wins, losses, damage, etc.)
      try {
        const statsResponse = await fetch('/api/agents/sync-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            battle_id: Number(battleId),
            winner_id: Number(winner),
            loser_id: Number(battle.agentIds[0] === winner ? battle.agentIds[1] : battle.agentIds[0]),
            battle_events: battleEvents,
          }),
        });

        if (!statsResponse.ok) {
          console.warn('Failed to sync agent battle stats:', statsResponse.status);
        } else {
          console.log('✅ Agent battle stats synced successfully');
        }
      } catch (statsError) {
        console.warn('Failed to sync agent battle stats:', statsError);
        // Don't throw - stats sync shouldn't break battle flow
      }
      
      console.log('✅ Agent synchronization completed');
    } catch (err) {
      console.error('Failed to sync battle results:', err);
      throw err;
    }
  };

  // Effect to handle transaction receipts (battle creation)
  useEffect(() => {
    if (startReceipt.data && startReceipt.isSuccess) {
      handleBattleCreated(startReceipt.data);
    }
  }, [startReceipt.data, startReceipt.isSuccess, handleBattleCreated]);

  // Effect to handle transaction receipts (fight completion)
  useEffect(() => {
    if (fightReceipt.data && fightReceipt.isSuccess) {
      handleFightCompleted(fightReceipt.data);
    }
  }, [fightReceipt.data, fightReceipt.isSuccess, handleFightCompleted]);

  // Additional effect to poll battle status when fighting (backup for unreliable event watchers)
  useEffect(() => {
    if (battleState === 'fighting' && currentBattleId) {
      console.log('🔍 Starting battle status polling for battle ID:', currentBattleId.toString());
      
      const pollBattleStatus = async () => {
        try {
          const battle = await getBattleFromContract(currentBattleId);
          if (battle) {
            console.log('📊 Poll result - Battle status:', battle.status, 'for ID:', battle.battleId.toString());
            
            if (battle.status === 1) { // Battle finished
              console.log('✅ Polling detected battle completion!');
              setBattleState('finished');
              setError(null);
              
              // Determine winner and loser
              const winner = battle.winner;
              let loser: bigint | null = null;
              if (battle.agentIds.length === 2) {
                loser = battle.agentIds[0] === winner ? battle.agentIds[1] : battle.agentIds[0];
              }
              
              // Sync to database
              if (winner && loser) {
                await syncBattleFinishedToDatabase(currentBattleId, winner, loser);
              }
              
              return; // Stop polling
            }
          }
        } catch (error) {
          console.error('❌ Error polling battle status:', error);
        }
      };
      
      // Poll every 5 seconds when fighting (increased from 3 seconds to reduce spam)
      const pollInterval = setInterval(pollBattleStatus, 5000);
      
      // Initial poll after a short delay
      const initialPollTimeout = setTimeout(pollBattleStatus, 2000);
      
      return () => {
        console.log('🚿 Stopping battle status polling for battle ID:', currentBattleId?.toString());
        clearInterval(pollInterval);
        clearTimeout(initialPollTimeout);
      };
    }
  }, [battleState, currentBattleId]); // Removed dependencies that cause unnecessary restarts

  // Additional effect to ensure proper state cleanup when battle finishes
  useEffect(() => {
    if (battleState === 'finished') {
      console.log('🛑 Battle finished - ensuring all refresh intervals are stopped');
      // Force a small delay to ensure all pending operations complete
      const timeoutId = setTimeout(() => {
        console.log('✅ Battle cleanup completed');
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [battleState]);

    const createBattle = useCallback(async ({
    agent1,
    agent2,
    tactics1,
    tactics2,
    arenaType,
  }: CreateBattleParams) => {
    try {
      console.log('Creating battle...');
      setBattleState('creating');
      setError(null);
      setCurrentBattleId(null); // Clear previous battle ID
      setHasBattleId(false);

      if (!ARENA_CONTRACT_ADDRESS) {
        const msg = 'Arena contract address is not configured. Please check CONTRACTS.ARENA.';
        setError(msg);
        console.error(msg);
        setBattleState('idle'); // Revert state on config error
        return;
      }

      if (!isFeeConfigured) {
        const msg = 'Battle system not configured properly. Please try again later.';
        setError(msg);
        console.error(msg);
        setBattleState('idle');
        return;
      }

      if (isFeeLoading) {
        const msg = 'System is initializing. Please wait a moment...';
        setError(msg);
        console.warn(msg);
        setBattleState('idle');
        return;
      }

      console.log('Using randomness fee:', randomnessFee.toString());

      const battleTxHash = await writeStartBattle({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: 'startBattle',
        args: [agent1, tactics1, agent2, tactics2], // Corrected argument order based on Arena.sol
        value: randomnessFee, // Include the fee payment
      });
      
      console.log('🚀 Battle creation transaction submitted with hash:', battleTxHash);
      
      if (!battleTxHash) {
        throw new Error('Battle creation transaction failed to submit - no transaction hash returned');
      }
    } catch (err) {
      console.error('Failed to create battle:', err);
      // Provide more specific error if possible
      setError(`Failed to create battle: ${err instanceof Error ? err.message : String(err)}`);
      setBattleState('idle');
    }
  }, [writeStartBattle, ARENA_CONTRACT_ADDRESS, randomnessFee, isFeeLoading, isFeeConfigured]);

  const executeFight = useCallback(async () => {
    if (!currentBattleId) {
      const msg = 'No battle ID available to start fight.';
      setError(msg);
      console.warn(msg);
      return;
    }
    if (!ARENA_CONTRACT_ADDRESS) {
      const msg = 'Arena contract address is not configured. Please check CONTRACTS.ARENA.';
      setError(msg);
      console.error(msg);
      return;
    }

    if (!isFeeConfigured) {
      const msg = 'Battle system not configured properly. Please try again later.';
      setError(msg);
      console.error(msg);
      return;
    }

    if (isFeeLoading) {
      const msg = 'System is initializing. Please wait a moment...';
      setError(msg);
      console.warn(msg);
      return;
    }

    try {
      console.log('🥊 Executing fight for battle ID:', currentBattleId.toString());
      console.log('💰 Using randomness fee:', randomnessFee.toString());
      console.log('🔍 Contract address:', ARENA_CONTRACT_ADDRESS);
      console.log('🔍 Fee configured:', isFeeConfigured);
      console.log('🔍 Fee loading:', isFeeLoading);
      
      // Debug wallet and network state
      console.log('💼 Wallet connected:', isConnected);
      console.log('💼 Wallet address:', address);
      console.log('🌐 Chain ID:', chainId);
      console.log('🌐 Expected SEI Testnet Chain ID: 1328');
      
      setBattleState('fighting');
      setError(null);

      console.log('🚀 Attempting to submit fight transaction...');
      
      const fightTxHash = await writeFight({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: 'fight',
        args: [currentBattleId],
        value: randomnessFee, // Include the fee payment
        gas: BigInt(2000000), // Explicit gas limit for complex battle execution
      });
      
      console.log('🚀 Fight transaction submitted with hash:', fightTxHash);
      console.log('🚀 Transaction hash type:', typeof fightTxHash);
      console.log('🚀 Transaction hash length:', fightTxHash?.length || 'undefined');
      
      if (!fightTxHash) {
        throw new Error('Fight transaction failed to submit - no transaction hash returned');
      }
      
    } catch (err) {
      console.error('❌ Failed to execute fight - Full error:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error message:', err instanceof Error ? err.message : String(err));
      console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
      setError(`Failed to execute fight: ${err instanceof Error ? err.message : String(err)}`);
      // Revert to 'waiting' if fight fails, allowing re-attempt
      setBattleState('waiting'); 
    }
  }, [currentBattleId, writeFight, ARENA_CONTRACT_ADDRESS, randomnessFee, isFeeLoading, isFeeConfigured]);

  const resetBattle = useCallback(() => {
    console.log('🔄 Resetting battle state to idle');
    setCurrentBattleId(null);
    setBattleState('idle');
    setError(null);
    setHasBattleId(false);
    console.log('✅ Battle state reset completed');
  }, []);

  // Update battle state based on write contract errors
  useEffect(() => {
    if (startBattleError) {
      setError(`Start Battle Error: ${startBattleError.message}`);
      setBattleState('idle');
    }
  }, [startBattleError]);

  useEffect(() => {
    if (fightError) {
      setError(`Fight Error: ${fightError.message}`);
      // If fight fails, we typically want to stay in 'waiting' to allow a retry
      setBattleState('waiting'); 
    }
  }, [fightError]);

  return {
    // Battle state
    battleState,
    currentBattleId,
    battleData,
    battleCount,
    error,
    hasBattleId,

    // Randomness fee information
    randomnessFee,
    isFeeLoading,
    isFeeConfigured,

    // Battle actions
    createBattle,
    executeFight,
    resetBattle,

    // Loading states
    isCreating,
    isFighting,
    isLoadingBattle: startReceipt.isLoading || fightReceipt.isLoading, // Combine these

    // Contract data fetching utility
    getBattleFromContract,
  };
};