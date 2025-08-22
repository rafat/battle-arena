// app/agents/[id]/page.tsx (Updated to use agent_id)
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { AgentCard } from '@/components/AgentCard';
import { AgentStats } from '@/components/AgentStats';
import { LevelUpButton } from '@/components/LevelUpButton';
import { BattleHistory } from '@/components/BattleHistory';
import Link from 'next/link';

export default function AgentDetailPage() {
  const { id } = useParams();
  const { address } = useAccount();
  const router = useRouter();
  
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${id}`);
        if (!response.ok) {
          throw new Error('Agent not found');
        }
        const data = await response.json();
        setAgent(data.agent);
      } catch (error) {
        console.error('Failed to fetch agent:', error);
        setError('Failed to load agent');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchAgent();
    }
  }, [id]);

  const handleLevelUp = () => {
    // Refetch agent data after level up
    setLoading(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading agent...</div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">
            {error || 'Agent not found'}
          </div>
          <button
            onClick={() => router.push('/agents')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Agents
          </button>
        </div>
      </div>
    );
  }

  const isOwner = address && agent.owner_address?.toLowerCase() === address.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/agents"
            className="text-white/80 hover:text-white transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Agents</span>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Agent Card */}
          <div className="lg:col-span-1">
            <AgentCard agent={agent} showActions={false} />
            
            {/* Action Buttons */}
            <div className="mt-6 space-y-4">
              <Link
                href={`/arena?agent=${agent.agent_id}`}
                className="w-full bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-3 px-6 rounded-lg font-semibold text-center block transition-all duration-200 transform hover:scale-105"
              >
                🥊 Battle This Agent
              </Link>
            </div>

            {/* Level Up Section */}
            {isOwner && (
              <div className="mt-6">
                <LevelUpButton
                  agentId={BigInt(agent.agent_id)}
                  currentLevel={agent.level || 1}
                  experience={agent.experience || 0}
                  experienceRequired={((agent.level || 1) * 100)}
                  onLevelUp={handleLevelUp}
                />
              </div>
            )}
          </div>

          {/* Agent Stats and History */}
          <div className="lg:col-span-2 space-y-8">
            <AgentStats agentId={BigInt(agent.agent_id)} />
            <BattleHistory agentId={BigInt(agent.agent_id)} limit={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
