// hooks/useRandomnessFee.ts
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/config';

// PythEntropyRandomness ABI - minimal interface for getFee
const RANDOMNESS_PROVIDER_ABI = [
  {
    "inputs": [],
    "name": "getFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const useRandomnessFee = () => {
  // This should be the address of the deployed PythEntropyRandomness contract
  // You'll need to add this to your .env file and CONTRACTS config
  const RANDOMNESS_PROVIDER_ADDRESS = process.env.NEXT_PUBLIC_RANDOMNESS_PROVIDER_ADDRESS as `0x${string}` | undefined;

  const { data: fee, isLoading, error, refetch } = useReadContract({
    address: RANDOMNESS_PROVIDER_ADDRESS,
    abi: RANDOMNESS_PROVIDER_ABI,
    functionName: 'getFee',
    query: {
      enabled: !!RANDOMNESS_PROVIDER_ADDRESS,
      // Refetch fee periodically as it might change
      refetchInterval: 30000, // 30 seconds
    },
  });

  return {
    fee: fee || BigInt(0),
    isLoading,
    error,
    refetch,
    isConfigured: !!RANDOMNESS_PROVIDER_ADDRESS,
  };
};