// hooks/useContracts.ts
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/config';
import { AGENT_FACTORY_ABI, ARENA_ABI } from '@/lib/contracts/abis';
import type { BattleTactics } from '@/lib/types/contracts';
import { useRandomnessFee } from './useRandomnessFee';

const SEI_TESTNET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_SEI_TESTNET_CHAIN_ID || '1328', 10);


export function useAgentFactory() {
  const { writeContract, writeContractAsync, isPending, error: writeError, data: writeData } = useWriteContract();
  const publicClient = usePublicClient();
  const { fee: randomnessFee, isLoading: isFeeLoading, isConfigured: isFeeConfigured } = useRandomnessFee();

  // RPC and contract health check
  const checkSystemHealth = async () => {
    const results = {
      rpcConnected: false,
      currentBlock: null as bigint | null,
      contractExists: false,
      contractAddress: CONTRACTS.AGENT_FACTORY,
      chainId: SEI_TESTNET_CHAIN_ID,
      error: null as string | null
    };

    try {
      if (!publicClient) {
        throw new Error('No public client available');
      }

      // Test RPC connection
      const blockNumber = await publicClient.getBlockNumber();
      results.rpcConnected = true;
      results.currentBlock = blockNumber;
      console.log('✅ RPC connected, current block:', blockNumber.toString());

      // Test contract exists
      const code = await publicClient.getBytecode({
        address: CONTRACTS.AGENT_FACTORY as `0x${string}`
      });
      results.contractExists = !!code && code !== '0x';
      console.log('📋 Contract bytecode exists:', results.contractExists);

      if (!results.contractExists) {
        results.error = 'Contract not found at address: ' + CONTRACTS.AGENT_FACTORY;
      }

    } catch (error) {
      results.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ System health check failed:', error);
    }

    return results;
  };

  const mintAgent = async (metadataCID: string): Promise<`0x${string}`> => {
    console.log('🚀 mintAgent called with:', {
      metadataCID,
      isFeeConfigured,
      isFeeLoading,
      randomnessFee: randomnessFee.toString(),
      contractAddress: CONTRACTS.AGENT_FACTORY,
      chainId: SEI_TESTNET_CHAIN_ID
    });

    // Validate metadata CID
    if (!metadataCID || metadataCID.trim().length === 0) {
      throw new Error('Metadata CID is required for minting');
    }
    if (!metadataCID.startsWith('Qm') && !metadataCID.startsWith('bafy')) {
      console.warn('⚠️ Metadata CID format might be invalid:', metadataCID);
    }

    if (!isFeeConfigured) {
      throw new Error('Agent creation system not configured properly');
    }
    if (isFeeLoading) {
      throw new Error('System is initializing, please wait');
    }

    // Test RPC connection first
    console.log('🔌 Testing RPC connection...');
    try {
      if (publicClient) {
        const blockNumber = await publicClient.getBlockNumber();
        console.log('✅ RPC connected, current block:', blockNumber.toString());
        
        // Test contract exists
        const code = await publicClient.getBytecode({
          address: CONTRACTS.AGENT_FACTORY as `0x${string}`
        });
        console.log('📋 Contract bytecode exists:', !!code && code !== '0x');
      } else {
        console.warn('⚠️ No public client available');
      }
    } catch (rpcError) {
      console.error('❌ RPC connection failed:', rpcError);
      throw new Error('Unable to connect to SEI testnet. Please check your network connection.');
    }

    // Validate randomness fee
    console.log('💰 Randomness fee details:', {
      fee: randomnessFee.toString(),
      feeInEther: (Number(randomnessFee) / 1e18).toFixed(18),
      isZero: randomnessFee === BigInt(0)
    });
    
    if (randomnessFee === BigInt(0)) {
      console.warn('⚠️ Randomness fee is 0 - this might cause transaction issues');
    }

    // Let wagmi handle gas estimation automatically first
    console.log('⛽ Letting wagmi handle gas estimation automatically');

    const params = {
      address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
      abi: AGENT_FACTORY_ABI,
      functionName: 'mintAgent',
      args: [metadataCID],
      chainId: SEI_TESTNET_CHAIN_ID,
      value: randomnessFee, // Include the fee payment
    };

    console.log('📝 Calling writeContractAsync with parameters:', {
      address: params.address,
      functionName: params.functionName,
      args: params.args,
      chainId: params.chainId,
      value: params.value.toString(),
      metadataCID
    });

    try {
      const hash = await writeContractAsync(params);
      console.log('✅ writeContractAsync succeeded, transaction hash:', hash);
      
      // Immediately verify the transaction exists
      console.log('🔍 Verifying transaction exists on blockchain...');
      try {
        if (publicClient) {
          // Wait a moment for the transaction to propagate
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const tx = await publicClient.getTransaction({ hash });
          console.log('✅ Transaction verified on blockchain:', {
            hash: tx.hash,
            blockNumber: tx.blockNumber,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString()
          });
        }
      } catch (verifyError) {
        console.warn('⚠️ Could not immediately verify transaction (this might be normal):', verifyError);
        console.log('🔗 Please check manually: https://seitrace.com/tx/' + hash);
      }
      
      return hash;
    } catch (error) {
      console.error('❌ writeContractAsync failed:', error);
      throw error;
    }
  };

  const levelUp = async (tokenId: bigint) => {
    return writeContract({
      address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
      abi: AGENT_FACTORY_ABI,
      functionName: 'levelUp',
      args: [tokenId],
      chainId: SEI_TESTNET_CHAIN_ID,
    });
  };

  const getAgent = async (tokenId: bigint) => {
    if (!publicClient) throw new Error("Public client not available");
    
    return publicClient.readContract({
      address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
      abi: AGENT_FACTORY_ABI,
      functionName: 'getAgent',
      args: [tokenId],
    }) as Promise<any>;
  };

  const getTokenIdCounter = async (): Promise<bigint> => {
    if (!publicClient) throw new Error("Public client not available");
    
    return publicClient.readContract({
      address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
      abi: AGENT_FACTORY_ABI,
      functionName: 'tokenIdCounter',
      args: [],
    }) as Promise<bigint>;
  };

  return {
    mintAgent,
    levelUp,
    getAgent,
    getTokenIdCounter,
    checkSystemHealth,
    isPending,
    randomnessFee,
    isFeeLoading,
    isFeeConfigured,
  };
}

export function useAgent(tokenId?: bigint) {
  return useReadContract({
    address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
    abi: AGENT_FACTORY_ABI,
    functionName: 'getAgent',
    args: tokenId ? [tokenId] : undefined,
    query: {
      enabled: !!tokenId,
    },
    chainId: SEI_TESTNET_CHAIN_ID,
  });
}

export function useArena() {
  const { writeContract, isPending } = useWriteContract();

  const startBattle = async (
    agent1Id: bigint,
    tactics1: BattleTactics,
    agent2Id: bigint,
    tactics2: BattleTactics
  ) => {
    return writeContract({
      address: CONTRACTS.ARENA as `0x${string}`,
      abi: ARENA_ABI,
      functionName: 'startBattle',
      args: [agent1Id, tactics1, agent2Id, tactics2],
      chainId: SEI_TESTNET_CHAIN_ID,
    });
  };

  const fight = async (battleId: bigint) => {
    return writeContract({
      address: CONTRACTS.ARENA as `0x${string}`,
      abi: ARENA_ABI,
      functionName: 'fight',
      args: [battleId],
      chainId: SEI_TESTNET_CHAIN_ID,
    });
  };

  return {
    startBattle,
    fight,
    isPending,
  };
}
