// components/agentselector
'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { AgentCard } from './AgentCard';

interface AgentSelectorProps {
  onSelect: (agentId: bigint) => void
  selected?: bigint
  title: string
  disabled?: boolean
}

export function AgentSelector({ onSelect, selected, title, disabled = false }: AgentSelectorProps) {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { address } = useAccount();

  useEffect(() => {
    const fetchAgents = async () => {
      if (!address) return;
      
      try {
        const response = await fetch(`/api/agents`);
        const data = await response.json();
        setAgents(data.agents || []);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [address]);

  if (loading) {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 ${disabled ? 'opacity-50' : ''}`}>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-white/70">Loading your agents...</div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 ${disabled ? 'opacity-50' : ''}`}>
        <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
        <div className="text-white/70 text-center py-8">
          No agents found. <br />
          <a href="/agents/mint" className="text-blue-400 hover:text-blue-300 underline">
            Mint your first agent
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl p-6 ${disabled ? 'opacity-50' : ''}`}>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="grid gap-4 max-h-96 overflow-y-auto">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => onSelect(BigInt(agent.id))}
            className={`cursor-pointer transition-all duration-200 rounded-lg p-4 border-2 ${
              selected === BigInt(agent.id)
                ? 'border-blue-400 bg-blue-500/20'
                : 'border-white/30 hover:border-white/50 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  #{agent.id}
                </span>
              </div>
              <div className="flex-1">
                <h4 className="text-white font-semibold">
                  {agent.nickname || `Agent #${agent.id}`}
                </h4>
                <p className="text-white/70 text-sm">
                  Click to select
                </p>
              </div>
              {selected === BigInt(agent.id) && (
                <div className="text-blue-400">
                  ✓
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
