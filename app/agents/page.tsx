// app/agents/page.tsx (Updated filtering logic)
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AgentCard } from '@/components/AgentCard';
import Link from 'next/link';

export default function AgentsPage() {
  const { address } = useAccount();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'owned'>('all');

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const url = filter === 'owned' && address 
          ? `/api/agents?owner=${address}`
          : '/api/agents';
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [address, filter]);

  const filteredAgents = agents.filter(agent => {
    if (filter === 'owned' && address) {
      return agent.owner_address?.toLowerCase() === address.toLowerCase();
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🤖 Battle Agents</h1>
          <p className="text-white/80">
            Discover and manage your battle agents
          </p>
        </div>

        {/* Filter and Create Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              All Agents ({agents.length})
            </button>
            {address && (
              <button
                onClick={() => setFilter('owned')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  filter === 'owned'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                My Agents ({filteredAgents.filter(a => a.owner_address?.toLowerCase() === address.toLowerCase()).length})
              </button>
            )}
          </div>

          {address && (
            <Link
              href="/agents/create"
              className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              ➕ Create New Agent
            </Link>
          )}
        </div>
        {/* Agents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl p-6 animate-pulse">
                <div className="w-full h-48 bg-white/20 rounded-lg mb-4"></div>
                <div className="h-4 bg-white/20 rounded mb-2"></div>
                <div className="h-3 bg-white/20 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-8 bg-white/20 rounded"></div>
                  <div className="h-8 bg-white/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-white/70 text-xl mb-4">
              {filter === 'owned' ? 'No agents found in your collection' : 'No agents found'}
            </div>
            <div className="text-white/50 mb-8">
              {filter === 'owned' 
                ? 'Create your first agent to get started!' 
                : 'Be the first to create an agent!'}
            </div>
            {address && (
              <Link
                href="/agents/create"
                className="bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 inline-block"
              >
                Create Agent
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map((agent) => (
                <AgentCard agent={agent} key={agent.id} showActions={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
