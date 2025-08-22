'use client';

import { useState, useRef } from 'react';
import { useAccount, useWatchContractEvent } from 'wagmi';
import { useAgentFactory } from '@/hooks/useContracts';
import { CONTRACTS } from '@/lib/web3/config';
import { AGENT_FACTORY_ABI } from '@/lib/contracts/abis';
import { uploadToPinata, uploadImageToPinata } from '@/lib/web3/pinata';
import { decodeEventLog } from 'viem';

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
  const { address } = useAccount();
  const { mintAgent,getAgent, isPending } = useAgentFactory();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [createdAgentId, setCreatedAgentId] = useState<bigint | null>(null);
  const lastMetadataCidRef = useRef<string | null>(null);
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
  const [steps, setSteps] = useState<CreationStep[]>([
    {
      step: 1,
      title: 'Generate AI Avatar',
      description: 'Creating your warrior avatar...',
      completed: false,
      loading: false,
    },
    {
      step: 2,
      title: 'Upload Image to IPFS',
      description: 'Storing avatar image on IPFS...',
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

  const getAgentFromContract = async (tokenId: bigint) => {
    try {
      const data = await getAgent(tokenId);
      
      return {
        dna: {
          strength: Number(data.dna.strength),
          agility: Number(data.dna.agility),
          intelligence: Number(data.dna.intelligence),
          elementalAffinity: Number(data.dna.elementalAffinity)
        },
        level: Number(data.level),
        experience: Number(data.experience),
        metadataCID: data.metadataCID,
        equippedItem: Number(data.equippedItem)
      };
    } catch (error) {
      console.error('Error fetching agent from contract:', error);
      throw error;
    }
  };

 useWatchContractEvent({
    address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
    abi: AGENT_FACTORY_ABI,
    eventName: 'AgentMinted',
    onLogs: async (logs) => {
        try {
        const log = logs[0];
        const decoded = decodeEventLog({
            abi: AGENT_FACTORY_ABI,
            eventName: 'AgentMinted',
            data: log.data,
            topics: log.topics,
        });

        if (!decoded.args) {
            console.warn('AgentMinted event had no args.');
            return;
        }

        const tokenId = BigInt((decoded.args as any).tokenId ?? (decoded.args as any)[0]);
        setCreatedAgentId(tokenId);

        console.log('AgentMinted received. ID:', tokenId.toString());

        // Complete step 4
        updateStep(3, { loading: false, completed: true });

        // Step 5: Save to Database
        updateStep(4, { loading: true, error: undefined });
        
        // Fetch full agent data from contract
        const agentData = await getAgentFromContract(tokenId);
        
        console.log('Fetched agent data:', agentData);

        const response = await fetch('/api/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_id: Number(tokenId),
              owner_address: address,
              metadata_cid: agentData.metadataCID,
              nickname: nickname.trim(),
              dna: agentData.dna,
              level: agentData.level,
              experience: agentData.experience,
              equipped_item_id: agentData.equippedItem
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save agent to database');
        }

        updateStep(4, { loading: false, completed: true });

        // Trigger final success
        setTimeout(() => onSuccess(tokenId), 1000);
        } catch (err) {
        console.error('Failed to decode AgentMinted log or save:', err);
        updateStep(4, { loading: false, error: 'Failed to save agent to database' });
        }
    },
    enabled: steps[3].loading,
    });

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
      // Step 1: Generate AI Avatar
      console.log('=== Starting agent creation ===');
      updateStep(0, { loading: true, error: undefined });
      const openaiImageUrl = await generateAgentImage();
      updateStep(0, { loading: false, completed: true });

      // Step 2: Upload Image to IPFS
      updateStep(1, { loading: true, error: undefined });
      const ipfsImageUrl = await uploadImageToPinata(openaiImageUrl);
      updateStep(1, { loading: false, completed: true });
      console.log('Image uploaded to IPFS:', ipfsImageUrl);

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
      await mintAgent(metadataCid);

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
  const canCreate = address && nickname.trim().length > 0 && selectedImage && !isCreating;
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
              <img
                src={img.url}
                alt={img.label}
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
                  {step.error || step.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Button */}
      <div className="text-center">
        <button
          onClick={handleCreateAgent}
          disabled={!canCreate}
          className={`px-8 py-4 rounded-lg font-semibold text-white transition-all duration-200 transform ${
            canCreate
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
        {createdAgentId && (
          <p className="text-green-400 mt-2">
            Agent ID: {createdAgentId.toString()}
          </p>
        )}
      </div>
    </div>
  );
}