//components/BattleHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface BattleHistoryProps {
  agentId?: bigint
  limit?: number
}

export function BattleHistory({ agentId, limit = 20 }: BattleHistoryProps) {
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBattle, setExpandedBattle] = useState<string | null>(null);

  useEffect(() => {
    const fetchBattles = async () => {
      try {
        const url = agentId 
          ? `/api/battles?agent_id=${agentId}&limit=${limit}`
          : `/api/battles?limit=${limit}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setBattles(data.battles);
        }
      } catch (error) {
        console.error('Failed to fetch battles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBattles();
  }, [agentId, limit]);

  const toggleBattleExpansion = (battleId: string) => {
    setExpandedBattle(expandedBattle === battleId ? null : battleId);
  };

  const getArenaName = (arenaType: number) => {
    const arenas = ['Neutral Fields', 'Volcanic Plains', 'Mystic Forest'];
    return arenas[arenaType] || 'Unknown Arena';
  };

  const getStrategyName = (strategy: number) => {
    const strategies = ['Balanced', 'Berserker', 'Tactician', 'Defensive'];
    return strategies[strategy] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <div className="text-white text-center">Loading battle history...</div>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Battle History</h3>
        <div className="text-white/70 text-center py-8">
          No battles found. Start your first battle!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Battle History</h3>
      
      <div className="space-y-4">
        {battles.map((battle) => (
          <div key={battle.id} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => toggleBattleExpansion(battle.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-white font-medium">
                    Battle #{battle.id ? battle.id.toString().slice(-8) : '???'}
                  </div>
                  <div className="text-white/70 text-sm">
                    {getArenaName(battle.arena_type)}
                  </div>
                  <div className="text-white/60 text-sm">
                    {new Date(battle.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {battle.winner_id && (
                    <div className="flex items-center space-x-2">
                      <span className="text-green-400 text-sm">Winner:</span>
                      <span className="text-white font-medium">
                        Agent #{battle.winner_id ? battle.winner_id.toString().slice(-4) : '???'}
                      </span>
                    </div>
                  )}
                  
                  {expandedBattle === battle.id ? (
                    <ChevronUpIcon className="w-5 h-5 text-white/60" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-white/60" />
                  )}
                </div>
              </div>
            </div>

            {expandedBattle === battle.id && (
              <div className="border-t border-white/10 p-4 bg-white/5">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Agent 1 */}
                  <div>
                    <h4 className="text-white font-medium mb-3">
                      Agent #{battle.agent1_id ? battle.agent1_id.toString().slice(-4) : '???'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Strategy:</span>
                        <span className="text-white">
                          {getStrategyName(battle.agent1_tactics?.strategy || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Aggressiveness:</span>
                        <span className="text-white">
                          {battle.agent1_tactics?.aggressiveness || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Risk Tolerance:</span>
                        <span className="text-white">
                          {battle.agent1_tactics?.riskTolerance || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Result:</span>
                        <span className={`font-medium ${
                          battle.winner_id === battle.agent1_id 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {battle.winner_id === battle.agent1_id ? 'Victory' : 'Defeat'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agent 2 */}
                  <div>
                    <h4 className="text-white font-medium mb-3">
                      Agent #{battle.agent2_id ? battle.agent2_id.toString().slice(-4) : '???'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/70">Strategy:</span>
                        <span className="text-white">
                          {getStrategyName(battle.agent2_tactics?.strategy || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Aggressiveness:</span>
                        <span className="text-white">
                          {battle.agent2_tactics?.aggressiveness || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Risk Tolerance:</span>
                        <span className="text-white">
                          {battle.agent2_tactics?.riskTolerance || 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70">Result:</span>
                        <span className={`font-medium ${
                          battle.winner_id === battle.agent2_id 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          {battle.winner_id === battle.agent2_id ? 'Victory' : 'Defeat'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Battle Data */}
                {battle.battle_data && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h5 className="text-white font-medium mb-2">Battle Summary</h5>
                    <div className="text-sm text-white/70">
                      Duration: {battle.battle_data.duration || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
