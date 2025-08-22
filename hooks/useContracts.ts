// hooks/useContracts.ts
import { useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/config';
import { AGENT_FACTORY_ABI, ARENA_ABI } from '@/lib/contracts/abis';
import type { BattleTactics } from '@/lib/types/contracts';

const SEI_TESTNET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_SEI_TESTNET_CHAIN_ID || '1328', 10);


export function useAgentFactory() {
  const { writeContract, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  const mintAgent = async (metadataCID: string): Promise<void> => {
    return writeContract({
      address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
      abi: AGENT_FACTORY_ABI,
      functionName: 'mintAgent',
      args: [metadataCID],
      chainId: SEI_TESTNET_CHAIN_ID,
    });
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

  return {
    mintAgent,
    levelUp,
    getAgent,
    isPending,
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
