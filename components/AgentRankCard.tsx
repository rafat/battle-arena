// components/AgentRankCard.tsx
import React from 'react';

interface Agent {
  id: number
  agent_id: number
  owner_address: string
  level: number
  experience: number
  dna: any
  equipped_item_id: number
  metadata_cid?: string
  nickname?: string
  created_at: string
  updated_at: string
};

interface AgentStats {
  agent_id: number
  total_battles: number
  wins: number
  losses: number
  total_damage_dealt: number
  total_damage_received: number
  favorite_strategy?: string
  updated_at: string
  agent: Agent
};

interface AgentRankCardProps {
  agentStats: AgentStats
  rank: number
};

export function AgentRankCard({ agentStats, rank }: AgentRankCardProps) {
  const { agent } = agentStats;
  const winRate = agentStats.total_battles > 0 
    ? ((agentStats.wins / agentStats.total_battles) * 100).toFixed(1)
    : '0.0';

  // Helper function to get rank styling
  const getRankStyling = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-yellow-400 bg-yellow-400/10 text-yellow-400';
      case 2:
        return 'border-gray-400 bg-gray-400/10 text-gray-400';
      case 3:
        return 'border-amber-600 bg-amber-600/10 text-amber-600';
      default:
        return 'border-gray-600 bg-gray-600/10 text-gray-300';
    }
  };

  // Helper function to get rank icon
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '👑';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏆';
    }
  };

  return (
    <div className={`border-2 rounded-lg p-6 transition-all duration-300 hover:scale-105 ${getRankStyling(rank)}`}>
      <div className="flex items-center justify-between">
        {/* Rank and Agent Info */}
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold flex items-center space-x-2">
            <span>{getRankIcon(rank)}</span>
            <span>#{rank}</span>
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-xl font-semibold text-white">
              {agent.nickname || `Agent #${agent.agent_id}`}
            </h3>
            <p className="text-sm text-gray-400">
              Level {agent.level} • Owner: {agent.owner_address.slice(0, 6)}...{agent.owner_address.slice(-4)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-green-400">{agentStats.wins}</span>
            <span className="text-xs text-gray-400">Wins</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-red-400">{agentStats.losses}</span>
            <span className="text-xs text-gray-400">Losses</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-blue-400">{winRate}%</span>
            <span className="text-xs text-gray-400">Win Rate</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-purple-400">{agentStats.total_battles}</span>
            <span className="text-xs text-gray-400">Battles</span>
          </div>
        </div>
      </div>
    </div>
  );
}
