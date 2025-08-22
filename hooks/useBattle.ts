// hooks/useBattle.ts
import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useWatchContractEvent } from 'wagmi';
import { parseEventLogs, TransactionReceipt } from 'viem';
import { BattleTactics } from '@/lib/types/contracts';
import { CONTRACTS } from '@/lib/web3/config';
import { ARENA_ABI } from '@/lib/contracts/abis';
import { Log, ChainMismatchError } from 'viem';
import { decodeEventLog } from 'viem';

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

  const ARENA_CONTRACT_ADDRESS = CONTRACTS.ARENA 
  ? (CONTRACTS.ARENA as `0x${string}`) 
  : undefined;

  // Write contract hooks
  const { 
    writeContract: writeStartBattle, 
    data: startBattleHash, 
    isPending: isCreating,
    error: startBattleError
  } = useWriteContract();
  
  const { 
    writeContract: writeFight, 
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
      // Only refetch frequently when battle is ongoing
      refetchInterval: battleState === 'fighting' ? 2000 : false,
      // Add a stale time to prevent unnecessary refetches if data is fresh enough
      staleTime: battleState === 'fighting' ? 1000 : 5000, 
    },
  }) as { data: BattleData | undefined, refetch: () => Promise<any> };

  // Read battle count
  const { data: battleCount } = useReadContract({
    address: ARENA_CONTRACT_ADDRESS,
    abi: ARENA_ABI,
    functionName: 'getBattleCount',
  });

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
          
          console.log('Battle finished - ID:', battleId.toString(), 'Winner:', winner.toString());
          
          if (currentBattleId && battleId === currentBattleId) {
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
      // Consider actions if the watch fails, e.g., prompt user to refresh.
    },
    // Ensure this is only enabled when the contract address is definitely available
    enabled: !!ARENA_CONTRACT_ADDRESS && (isFighting || fightReceipt.isLoading),
    // pollingInterval: 3000,
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
      
      // Prefer event listener for state updates, but parse from receipt as a robust backup
      const logs = parseEventLogs({
        abi: ARENA_ABI,
        eventName: 'BattleStarted',
        logs: receipt.logs,
      });
      
      if (logs.length > 0) {
        const battleStartedLog = logs[0];
        // Use type assertion for args directly
        const args = (battleStartedLog as unknown as { args: BattleStartedEventArgs }).args;
        const battleId = args.battleId;
        
        console.log('Battle ID from transaction receipt:', battleId.toString());
        
        // Only set if we don't already have it from the event listener (race condition safety)
        if (!hasBattleId || currentBattleId !== battleId) { // Added currentBattleId check
          setCurrentBattleId(battleId);
          setHasBattleId(true);
          setBattleState('waiting');
        }
        
        // Wait a bit for the blockchain state to be updated before fetching battle data
        // This is crucial, as the chain might not be instantly consistent across RPC nodes.
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased delay
        
        // Sync to database
        await syncBattleToDatabase(battleId, receipt);
      } else {
        console.warn('No BattleStarted event found in transaction receipt logs.');
      }
    } catch (err) {
      console.error('Failed to process battle creation from receipt:', err);
      setError(`Failed to process battle creation from receipt: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [hasBattleId, currentBattleId]); // Added currentBattleId to dependency array

  // Handle fight completion
  const handleFightCompleted = useCallback(async (receipt: TransactionReceipt) => {
    try {
      console.log('Fight transaction confirmed:', receipt.transactionHash);
      
      // The BattleFinished event listener will ideally handle state updates.
      // This section can focus on syncing additional data related to the fight receipt.
      if (currentBattleId) {
        // Wait for potential state updates from the BattleFinished event listener
        await new Promise(resolve => setTimeout(resolve, 2000)); // Give event listener time
        await syncBattleResults(currentBattleId, receipt);
      }
    } catch (err) {
      console.error('Failed to process battle results from receipt:', err);
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

  // Sync battle finished event to database
  const syncBattleFinishedToDatabase = async (
    battleId: bigint,
    winner: bigint,
    loser: bigint
  ) => {
    try {
      const response = await fetch('/api/battles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          battle_id: Number(battleId),
          winner_id: Number(winner),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      console.log('Battle finished event synced to database');
    } catch (err) {
      console.error('Failed to sync battle finished event:', err);
      // Do not re-throw here either if on-chain was successful
    }
  };

  // Fixed syncBattleToDatabase function
  const syncBattleToDatabase = async (battleId: bigint, receipt: TransactionReceipt) => {
    try {
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
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Battle synced to database:', result);
    } catch (err) {
      console.error('Failed to sync battle to database:', err);
      throw err; // Re-throw to handle in calling function
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
      // This loop is fine if each event needs its own endpoint.
      for (const event of battleEvents) {
        const eventResponse = await fetch(`/api/battles/${battleId}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        });

        if (!eventResponse.ok) {
          console.error(`Failed to sync event: ${event.event_type} - ${eventResponse.status}`);
        }
      }
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

      await writeStartBattle({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: 'startBattle',
        args: [agent1, tactics1, agent2, tactics2], // Corrected argument order based on Arena.sol
      });
    } catch (err) {
      console.error('Failed to create battle:', err);
      // Provide more specific error if possible
      setError(`Failed to create battle: ${err instanceof Error ? err.message : String(err)}`);
      setBattleState('idle');
    }
  }, [writeStartBattle, ARENA_CONTRACT_ADDRESS]);

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

    try {
      console.log('Executing fight for battle ID:', currentBattleId.toString());
      setBattleState('fighting');
      setError(null);

      await writeFight({
        address: ARENA_CONTRACT_ADDRESS,
        abi: ARENA_ABI,
        functionName: 'fight',
        args: [currentBattleId],
      });
    } catch (err) {
      console.error('Failed to execute fight:', err);
      setError(`Failed to execute fight: ${err instanceof Error ? err.message : String(err)}`);
      // Revert to 'waiting' if fight fails, allowing re-attempt
      setBattleState('waiting'); 
    }
  }, [currentBattleId, writeFight, ARENA_CONTRACT_ADDRESS]);

  const resetBattle = useCallback(() => {
    setCurrentBattleId(null);
    setBattleState('idle');
    setError(null);
    setHasBattleId(false);
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