'use client';

import React, { useState, useRef } from 'react';
import { useAccount, useWatchContractEvent, useWaitForTransactionReceipt } from 'wagmi';
import { useAgentFactory } from '@/hooks/useContracts';
import { CONTRACTS } from '@/lib/web3/config';
import { AGENT_FACTORY_ABI } from '@/lib/contracts/abis';
import { uploadToPinata, uploadImageToPinata } from '@/lib/web3/pinata';
import { IPFSImage } from './IPFSImage';

interface CreateAgentFormProps {
  onSuccess: (agentId: bigint) => void
}

interface CreationStep {
  step: number
  title: string
  description: string
  completed: boolean
  loading: boolean
  error?: string
}

interface DNA {
  strength: number;
  agility: number;
  intelligence: number;
  elementalAffinity: number;
}

export function CreateAgentForm({ onSuccess }: CreateAgentFormProps) {
  const { address, isConnected, chain } = useAccount();
  const { mintAgent, getAgent, getTokenIdCounter, isPending, randomnessFee, isFeeLoading, isFeeConfigured } = useAgentFactory();
  
  // Steps state - must be declared first before any useEffect that references it
  const [steps, setSteps] = useState<CreationStep[]>([
    {
      step: 1,
      title: 'Select Avatar',
      description: 'Choosing your warrior avatar...',
      completed: false,
      loading: false,
    },
    {
      step: 2,
      title: 'Prepare Image',
      description: 'Preparing avatar for blockchain...',
      completed: false,
      loading: false,
    },
    {
      step: 3,
      title: 'Upload Metadata to IPFS',
      description: 'Storing agent metadata on IPFS...',
      completed: false,
      loading: false,
    },
    {
      step: 4,
      title: 'Mint Agent',
      description: 'Creating agent on blockchain...',
      completed: false,
      loading: false,
    },
    {
      step: 5,
      title: 'Save to Database',
      description: 'Saving agent information...',
      completed: false,
      loading: false,
    },
  ]);
  
  // Other state declarations
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState<bigint | null>(null);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>(undefined);
  const lastMetadataCidRef = useRef<string | null>(null);

  // Debug wallet connection
  console.log('🔗 Wallet state:', {
    address,
    isConnected,
    chain: chain?.name,
    chainId: chain?.id
  });

  // Monitor transaction status
  const { isLoading: isTransactionPending, isSuccess: isTransactionSuccess, error: transactionError } = useWaitForTransactionReceipt({
    hash: transactionHash,
    query: {
      enabled: !!transactionHash,
    },
  });

  // Monitor transaction status and handle completion directly
  React.useEffect(() => {
    if (transactionHash) {
      console.log('📦 Transaction status:', {
        hash: transactionHash,
        isPending: isTransactionPending,
        isSuccess: isTransactionSuccess,
        error: transactionError?.message
      });
      
      if (isTransactionSuccess && steps[3].loading) {
        console.log('✅ Transaction confirmed! Processing agent creation...');
        handleTransactionSuccess();
      }
    }
  }, [transactionHash, isTransactionPending, isTransactionSuccess, transactionError, steps]);

  // Handle successful transaction by saving directly to database
  const handleTransactionSuccess = async () => {
    try {
      console.log('💾 Saving agent to database after successful transaction...');
      
      // Complete step 4 (blockchain minting)
      updateStep(3, { loading: false, completed: true });
      
      // Start step 5: Save to Database
      updateStep(4, { loading: true, error: undefined });
      
      const metadataCID = lastMetadataCidRef.current;
      if (!metadataCID) {
        throw new Error('No metadata CID available');
      }
      
      console.log('🔍 Getting the newly minted agent token ID from contract...');
      
      let nextAgentId = 1; // Default fallback
      
      try {
        // Get the current token counter from the contract
        // Since we just minted, the counter should be at the token ID that was just created
        const currentCounter = await getTokenIdCounter();
        nextAgentId = Number(currentCounter);
        console.log('📊 Current token counter from contract:', currentCounter.toString(), 'Using agent ID:', nextAgentId);
      } catch (contractError) {
        console.warn('⚠️ Failed to get token counter from contract, falling back to database approach:', contractError);
        
        // Fallback: Query API to get the highest existing agent ID and increment
        const response = await fetch('/api/agents?limit=1&sort=desc');
        if (response.ok) {
          const data = await response.json();
          const agents = data.agents || [];
          
          if (agents.length > 0) {
            const latestAgent = agents[0];
            nextAgentId = Math.max(latestAgent.agent_id + 1, 1);
            console.log('📈 Fallback: Latest agent ID from DB:', latestAgent.agent_id, 'Next ID will be:', nextAgentId);
          }
        }
      }
      
      // Generate agent data with proper sequential ID
      const agentData = {
        agent_id: nextAgentId,
        owner_address: address,
        metadata_cid: metadataCID,
        nickname: nickname.trim(),
        dna: {
          strength: Math.floor(Math.random() * 100) + 1,
          agility: Math.floor(Math.random() * 100) + 1,
          intelligence: Math.floor(Math.random() * 100) + 1,
          elementalAffinity: Math.floor(Math.random() * 4) + 1
        },
        level: 1,
        experience: 0,
        equipped_item_id: 0
      };
      
      console.log('🤖 Creating agent with proper ID:', agentData);
      
      const saveResponse = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.error || 'Failed to save agent to database');
      }

      console.log('✅ Agent saved to database successfully with ID:', nextAgentId);
      const agentId = BigInt(nextAgentId);
      setCreatedAgentId(agentId);
      updateStep(4, { loading: false, completed: true });

      // Trigger final success
      setTimeout(() => onSuccess(agentId), 1000);
      
    } catch (error) {
      console.error('❌ Failed to save agent after transaction success:', error);
      updateStep(4, { 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to save agent to database' 
      });
    }
  };

  // Function to add SEI Testnet to MetaMask
  const addSeiTestnetToMetaMask = async () => {
    try {
      await window.ethereum?.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x530', // 1328 in hex
          chainName: 'SEI Testnet',
          nativeCurrency: {
            name: 'SEI',
            symbol: 'SEI',
            decimals: 18,
          },
          rpcUrls: ['https://evm-rpc-testnet.sei-apis.com'],
          blockExplorerUrls: ['https://seitrace.com'],
        }],
      });
      console.log('✅ SEI Testnet added to MetaMask');
    } catch (error) {
      console.error('❌ Failed to add SEI Testnet:', error);
      throw new Error('Failed to add SEI Testnet to MetaMask');
    }
  };

  const predefinedImages: { url: string; label: string }[] = [
    {
      label: 'Cyber Warrior',
      url: 'https://gateway.pinata.cloud/ipfs/QmPpdTLmRoTcWFhgzUEp1fSqFmKQS5bQWAA8dvozVRrWjV',
    },
    {
      label: 'Neon Assassin',
      url: 'https://gateway.pinata.cloud/ipfs/QmQwmGWULWjazkk1NyRmPVqmGJh2ZhDecxVQRoJvEafXe1',
    },
    {
      label: 'Tech Monk',
      url: 'https://gateway.pinata.cloud/ipfs/QmPW1Yj31KCDcbdbJkszqWHdNcQT8pX1jZUATidTyy6D7b',
    },
    {
      label: 'Plasma Valkyrie',
      url: 'https://gateway.pinata.cloud/ipfs/QmNqDSVvA974dmBZNehuyUogLqcsBVcWxy9dR5wJGEC3EF',
    },
    {
      label: 'Blade Sentinel',
      url: 'https://gateway.pinata.cloud/ipfs/Qmc4bYb3cR9dsM7fZY5mNwfrdzCpxcJFUvtSam2N4LzN94',
    },
    {
      label: 'Radiant Hunter',
      url: 'https://gateway.pinata.cloud/ipfs/QmcVCmnk6BaUBdLXYg4fngY63kWk3TrV9fieqQJ9EBTMoH',
    },
  ];

  const updateStep = (stepIndex: number, updates: Partial<CreationStep>) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, ...updates } : step
    ));
  };

  // Generate AI image using API route
  /*
  const generateAgentImage = async (customPrompt?: string): Promise<string> => {
    try {
      const prompt = customPrompt || `A fierce warrior battle agent named ${nickname.trim()}, cyberpunk style, futuristic armor, glowing eyes, standing in a battle stance, digital art, high quality, dramatic lighting, dark background with neon accents`;
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate image');
      }

      return data.imageUrl;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  };
*/
  const generateAgentImage = async (): Promise<string> => {
      if (!selectedImage) {
      throw new Error('Please select an avatar image.');
    }
    return selectedImage;
  };
  const handleCreateAgent = async () => {
    if (!address || !nickname.trim()) return;

    try {
      // Step 1: Generate AI Avatar (or use selected predefined image)
      console.log('=== Starting agent creation ===');
      updateStep(0, { loading: true, error: undefined });
      const selectedImageUrl = await generateAgentImage();
      updateStep(0, { loading: false, completed: true });

      // Step 2: Upload Image to IPFS (skip if already an IPFS URL)
      updateStep(1, { loading: true, error: undefined });
      let ipfsImageUrl: string;
      
      // Check if the selected image is already an IPFS URL
      if (selectedImageUrl.includes('ipfs/') || selectedImageUrl.includes('ipfs.io') || selectedImageUrl.includes('gateway.pinata.cloud')) {
        console.log('Image is already on IPFS, skipping upload:', selectedImageUrl);
        // Extract the hash and use a consistent gateway format
        const hash = selectedImageUrl.match(/\/ipfs\/([a-zA-Z0-9]+)/)?.[1];
        if (hash) {
          ipfsImageUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
        } else {
          ipfsImageUrl = selectedImageUrl; // Fallback to original URL
        }
      } else {
        // Upload new image to IPFS
        console.log('Uploading new image to IPFS...');
        ipfsImageUrl = await uploadImageToPinata(selectedImageUrl);
      }
      
      updateStep(1, { loading: false, completed: true });
      console.log('Final image URL:', ipfsImageUrl);

      // Step 3: Upload Metadata to IPFS
      updateStep(2, { loading: true, error: undefined });
      const metadata = {
        name: nickname.trim(),
        description: `A fierce warrior agent named ${nickname.trim()}`,
        image: ipfsImageUrl,
        attributes: [
          {
            trait_type: 'Type',
            value: 'Battle Agent'
          },
          {
            trait_type: 'Created',
            value: new Date().toISOString()
          }
        ]
      };

      console.log('Metadata created:', JSON.stringify(metadata, null, 2));
      
      const metadataCid = await uploadToPinata(metadata);
      lastMetadataCidRef.current = metadataCid;
      updateStep(2, { loading: false, completed: true });
      console.log('Metadata uploaded successfully! Hash:', metadataCid);

      // Step 4: Mint Agent on Blockchain
      console.log('Step 4: Creating agent on blockchain...');
      updateStep(3, { loading: true, error: undefined });
      
      // Validate wallet connection and chain
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }
      
      if (!chain) {
        throw new Error('Please add SEI Testnet to MetaMask and connect to it. Chain ID: 1328, RPC: https://evm-rpc-testnet.sei-apis.com');
      }
      
      if (chain.id !== 1328) {
        throw new Error(`Please switch to SEI Testnet (chain ID: 1328). Current chain: ${chain.name} (${chain.id})`);
      }
      
      try {
        const txHash = await mintAgent(metadataCid); // This will trigger MetaMask
        setTransactionHash(txHash); // Store transaction hash for monitoring
        console.log('Transaction hash received:', txHash);
        console.log('Transaction initiated - waiting for confirmation...');
        // The event watcher will handle the rest
      } catch (mintError) {
        console.error('Failed to initiate mint transaction:', mintError);
        updateStep(3, { 
          loading: false, 
          error: mintError instanceof Error ? mintError.message : 'Failed to initiate transaction' 
        });
        return; // Don't continue to the catch block below
      }

    } catch (error) {
      console.error('Error creating agent:', error);
      const currentStep = steps.findIndex(s => s.loading);
      if (currentStep >= 0) {
        updateStep(currentStep, { 
          loading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  };

  const isCreating = steps.some(s => s.loading);
  const isOnCorrectChain = isConnected && chain && chain.id === 1328;
  const canCreate = address && nickname.trim().length > 0 && selectedImage && !isCreating && isOnCorrectChain;
  const hasError = steps.some(s => s.error);

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        Create Your Battle Agent
      </h2>

      {/* Agent Name Input */}
      <div className="mb-8">
        <label className="block text-white/90 text-sm font-medium mb-2">
          Agent Nickname
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Enter your agent's nickname..."
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={30}
          disabled={isCreating}
        />
        <p className="text-white/60 text-sm mt-1">
          {nickname.length}/30 characters
        </p>
      </div>

      {/* Predefined Image Selector */}
      <div className="mb-8">
        <label className="block text-white/90 text-sm font-medium mb-2">
          Choose an Avatar Image
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {predefinedImages.map((img, index) => (
            <div
              key={index}
              onClick={() => setSelectedImage(img.url)}
              className={`cursor-pointer border-2 rounded-lg overflow-hidden ${
                selectedImage === img.url
                  ? 'border-blue-500'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <IPFSImage
                src={img.url}
                alt={img.label}
                width={200}
                height={128}
                className="w-full h-32 object-cover"
              />
              <p className="text-center text-white text-xs py-1 bg-black/40">{img.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Creation Steps */}
      <div className="mb-8">
        <h3 className="text-white/90 font-medium mb-4">Creation Progress</h3>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.completed 
                  ? 'bg-green-500 text-white' 
                  : step.loading 
                  ? 'bg-blue-500 text-white animate-pulse' 
                  : step.error
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white/60'
              }`}>
                {step.completed ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.loading ? (
                  <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                ) : step.error ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="text-sm font-medium">{step.step}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-white font-medium">{step.title}</div>
                <div className={`text-sm ${
                  step.error ? 'text-red-400' : 'text-white/60'
                }`}>
                  {step.error || (
                    step.step === 4 && step.loading && isTransactionPending 
                      ? 'Transaction submitted - waiting for confirmation...' 
                      : step.step === 4 && step.loading && isPending 
                      ? 'Waiting for wallet confirmation...'
                      : step.step === 4 && step.loading && transactionHash
                      ? 'Transaction confirmed - waiting for event...'
                      : step.step === 4 && step.loading 
                      ? 'Creating agent on blockchain...'
                      : step.description
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <div className="text-center">
        {/* Network Warning */}
        {isConnected && !chain && (
          <div className="mb-4 p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
            <div className="text-yellow-200 text-sm font-medium mb-2">
              ⚠️ Network Not Detected
            </div>
            <div className="text-yellow-200/80 text-xs mb-3">
              Please add SEI Testnet to MetaMask to continue
            </div>
            <button
              onClick={addSeiTestnetToMetaMask}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add SEI Testnet to MetaMask
            </button>
          </div>
        )}
        
        {/* Chain Mismatch Warning */}
        {isConnected && chain && chain.id !== 1328 && (
          <div className="mb-4 p-4 bg-orange-500/20 rounded-lg border border-orange-500/30">
            <div className="text-orange-200 text-sm font-medium mb-2">
              ⚠️ Wrong Network
            </div>
            <div className="text-orange-200/80 text-xs mb-3">
              Please switch to SEI Testnet. Current: {chain.name} ({chain.id})
            </div>
            <button
              onClick={addSeiTestnetToMetaMask}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Switch to SEI Testnet
            </button>
          </div>
        )}
        
        {/* Only show configuration warning if provider is not configured */}
        {!isFeeConfigured && (
          <div className="mb-4 p-3 bg-red-500/20 rounded-lg border border-red-500/30">
            <div className="text-red-200 text-sm">
              ⚠️ Randomness provider not configured
            </div>
            <div className="text-red-200/70 text-xs mt-1">
              Please restart the development server to load environment variables
            </div>
          </div>
        )}
        
        <button
          onClick={handleCreateAgent}
          disabled={!canCreate || !isFeeConfigured || isFeeLoading}
          className={`px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 transform ${
            canCreate && isFeeConfigured && !isFeeLoading
              ? 'bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 hover:scale-105'
              : 'bg-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          {isCreating ? 'Creating Agent...' : 'Create Agent 🤖'}
        </button>
        
        {hasError && (
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Reset & Try Again
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 text-center text-white/60 text-sm">
        <p>Your agent's stats will be randomly generated by the smart contract.</p>
        <p>The creation process may take a few minutes to complete.</p>
        {isFeeConfigured && (
          <p className="text-white/50 text-xs mt-2">
            ⚡ Includes minimal network fee for secure randomness generation
          </p>
        )}
        {transactionHash && (
          <p className="text-blue-300 text-xs mt-2">
            🔗 Transaction: 
            <a 
              href={`https://seitrace.com/tx/${transactionHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-blue-200"
            >
              {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
            </a>
          </p>
        )}
        {createdAgentId && (
          <p className="text-green-400 mt-2">
            Agent ID: {createdAgentId.toString()}
          </p>
        )}
      </div>
    </div>
  );
}