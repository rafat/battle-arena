// app/leaderboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AgentRankCard } from '@/components/AgentRankCard';

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

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<AgentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/leaderboard?limit=100&sort_by=wins');
        
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          Leaderboard
        </h1>

        {error ? (
          <div className="text-red-500 text-center">Error: {error}</div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-white text-center">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-white text-center">No agents found</div>
            ) : (
              leaderboard.map((agentStats, index) => (
                <AgentRankCard
                  key={agentStats.agent_id}
                  agentStats={agentStats}
                  rank={index + 1}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
