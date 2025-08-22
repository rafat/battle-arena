// context/Web3Provider.tsx
'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { defineChain } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useMemo } from 'react';

interface Web3ProviderProps {
  children: ReactNode;
}

// Define SEI testnet chain
const seiTestnet = defineChain({
  id: 1328,
  name: 'SEI Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SEI Testnet Explorer',
      url: 'https://seitrace.com',
    },
  },
  testnet: true,
});

export function Web3Provider({ children }: Web3ProviderProps) {
  const config = useMemo(() => {
    const rpcUrl = process.env.NEXT_PUBLIC_SEI_TESTNET_RPC;
    
    if (!rpcUrl) {
      console.error('NEXT_PUBLIC_SEI_TESTNET_RPC is not defined');
    }

    return createConfig({
      chains: [seiTestnet],
      connectors: [
        injected({ 
          target: 'metaMask',
        }),
        metaMask(),
      ],
      transports: {
        [seiTestnet.id]: http(rpcUrl || 'https://evm-rpc-testnet.sei-apis.com'),
      },
      ssr: true, // Enable SSR support
    });
  }, []);

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  }), []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
