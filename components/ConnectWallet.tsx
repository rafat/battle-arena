// components/ConnectWallet.tsx
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [isClient, setIsClient] = useState(false);

  // Handle hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const truncateAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const handleConnect = async () => {
    try {
      console.log('Available connectors:', connectors);
      
      // Try different connector IDs that MetaMask might use
      const metamask = connectors.find((c) => 
        c.id === 'injected' || 
        c.id === 'metaMask' || 
        c.name.toLowerCase().includes('metamask')
      );
      
      if (metamask) {
        console.log('Found connector:', metamask);
        await connect({ connector: metamask });
      } else {
        console.error('MetaMask connector not found. Available connectors:', connectors);
        // Try the first available connector as fallback
        if (connectors.length > 0) {
          await connect({ connector: connectors[0] });
        }
      }
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="text-red-500 text-sm mb-2">
          Connection failed: {error.message}
        </div>
      )}
      
      {isConnected && address ? (
        <div className="flex items-center space-x-2">
          <span className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md">
            {truncateAddress(address)}
          </span>
          <button
            onClick={handleDisconnect}
            className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </div>
  );
}
