// components/BattleView.tsx
'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/config';
import { ARENA_ABI } from '@/lib/contracts/abis';

interface BattleViewProps {
  battleId: bigint
  onNewBattle: () => void
}

export function BattleView({ battleId, onNewBattle }: BattleViewProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get battle data from contract
  const { data: battleData, isLoading: battleLoading } = useReadContract({
    address: CONTRACTS.ARENA as `0x${string}`,
    abi: ARENA_ABI,
    functionName: 'getBattle',
    args: [battleId],
  });

  // Fetch battle events from database
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`/api/battles/${battleId}/events`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch battle events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [battleId]);

  if (battleLoading || loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white">Loading battle data...</div>
        </div>
      </div>
    );
  }

  const battle = battleData as any;

  return (
    <div className="space-y-6">
      {/* Battle Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            Battle #{battleId.toString()}
          </h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            battle?.status === 0 ? 'bg-yellow-500/20 text-yellow-200' : 'bg-green-500/20 text-green-200'
          }`}>
            {battle?.status === 0 ? 'Ongoing' : 'Finished'}
          </div>
        </div>

        {/* Arena Info */}
        <div className="mb-4">
          <span className="text-white/70">Arena: </span>
          <span className="text-white font-medium">
            {battle?.arena === 0 ? 'Neutral Fields' : 
             battle?.arena === 1 ? 'Volcanic Plains' : 'Mystic Forest'}
          </span>
        </div>

        {/* Fighter Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-200 mb-2">Fighter 1</h3>
            <div className="text-white">Agent #{battle?.agentIds[0]?.toString()}</div>
            <div className="text-white/70 text-sm">
              Health: {battle?.agentHealths[0]?.toString()}
            </div>
          </div>
          
          <div className="bg-red-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-red-200 mb-2">Fighter 2</h3>
            <div className="text-white">Agent #{battle?.agentIds[1]?.toString()}</div>
            <div className="text-white/70 text-sm">
              Health: {battle?.agentHealths[1]?.toString()}
            </div>
          </div>
        </div>

        {/* Winner */}
        {battle?.status === 1 && battle?.winner && (
          <div className="mt-4 bg-green-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-green-200 mb-2">🏆 Winner</h3>
            <div className="text-white">Agent #{battle.winner.toString()}</div>
          </div>
        )}
      </div>

      {/* Battle Events */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Battle Log</h3>
        
        {events.length === 0 ? (
          <div className="text-white/70 text-center py-4">
            No battle events recorded yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <span className="font-medium">{event.event_type}</span>
                    {event.attacker_id && event.defender_id && (
                      <span className="text-white/70 ml-2">
                        Agent #{event.attacker_id} → Agent #{event.defender_id}
                      </span>
                    )}
                  </div>
                  {event.damage && (
                    <div className="text-red-300 font-medium">
                      -{event.damage} HP
                    </div>
                  )}
                </div>
                <div className="text-white/50 text-sm mt-1">
                  {new Date(event.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={onNewBattle}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
        >
          Start New Battle
        </button>
      </div>
    </div>
  );
}
