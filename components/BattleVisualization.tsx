// components/BattleVisualization.tsx
'use client';

import { useState, useEffect } from 'react';

interface BattleEvent {
  event_type: string;
  attacker_id: string;
  defender_id: string;
  damage: number;
  created_at: string;
}

interface BattleVisualizationProps {
  battleData: any;
  events: BattleEvent[];
  isOngoing: boolean;
}

interface AgentState {
  id: string;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  isDefending: boolean;
  lastDamage: number;
}

export function BattleVisualization({ battleData, events, isOngoing }: BattleVisualizationProps) {
  // Debug logging
  useEffect(() => {
    console.log('🎮 BattleVisualization received:');
    console.log('- Battle data:', battleData);
    console.log('- Events:', events?.length || 0, 'events');
    console.log('- Is ongoing:', isOngoing);
    if (events?.length > 0) {
      console.log('- First event:', events[0]);
    }
  }, [battleData, events, isOngoing]);

  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [agent1State, setAgent1State] = useState<AgentState>({
    id: battleData?.agentIds[0]?.toString() || '1',
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    isDefending: false,
    lastDamage: 0,
  });
  const [agent2State, setAgent2State] = useState<AgentState>({
    id: battleData?.agentIds[1]?.toString() || '2', 
    health: 100,
    maxHealth: 100,
    isAttacking: false,
    isDefending: false,
    lastDamage: 0,
  });

  // Initialize health from battle data
  useEffect(() => {
    if (battleData?.agentHealths) {
      const maxHealth1 = 100; // Assuming max health is 100
      const maxHealth2 = 100;
      
      setAgent1State(prev => ({
        ...prev,
        id: battleData.agentIds[0]?.toString() || '1',
        health: Number(battleData.agentHealths[0]) || maxHealth1,
        maxHealth: maxHealth1,
      }));
      
      setAgent2State(prev => ({
        ...prev,
        id: battleData.agentIds[1]?.toString() || '2',
        health: Number(battleData.agentHealths[1]) || maxHealth2,
        maxHealth: maxHealth2,
      }));
    }
  }, [battleData]);

  // Auto-play battle visualization
  useEffect(() => {
    if (events.length > 0 && currentEventIndex < events.length && isOngoing) {
      const timer = setTimeout(() => {
        playNextEvent();
      }, 2000); // 2 second delay between events

      return () => clearTimeout(timer);
    }
  }, [currentEventIndex, events.length, isOngoing]);

  const playNextEvent = () => {
    if (currentEventIndex >= events.length) return;

    const event = events[currentEventIndex];
    
    // Animate the attack
    if (event.event_type === 'attack') {
      const attackerId = event.attacker_id;
      const defenderId = event.defender_id;
      const damage = event.damage || 0;

      // Set attacking/defending animations
      if (attackerId === agent1State.id) {
        setAgent1State(prev => ({ ...prev, isAttacking: true }));
        setAgent2State(prev => ({ 
          ...prev, 
          isDefending: true, 
          lastDamage: damage,
          health: Math.max(0, prev.health - damage)
        }));
      } else {
        setAgent2State(prev => ({ ...prev, isAttacking: true }));
        setAgent1State(prev => ({ 
          ...prev, 
          isDefending: true, 
          lastDamage: damage,
          health: Math.max(0, prev.health - damage)
        }));
      }

      // Reset animations after delay
      setTimeout(() => {
        setAgent1State(prev => ({ ...prev, isAttacking: false, isDefending: false, lastDamage: 0 }));
        setAgent2State(prev => ({ ...prev, isAttacking: false, isDefending: false, lastDamage: 0 }));
      }, 1000);
    }

    setCurrentEventIndex(prev => prev + 1);
  };

  const playBattle = () => {
    setIsPlaying(true);
    setCurrentEventIndex(0);
    // Reset health to start
    setAgent1State(prev => ({ ...prev, health: prev.maxHealth }));
    setAgent2State(prev => ({ ...prev, health: prev.maxHealth }));
  };

  const resetVisualization = () => {
    setCurrentEventIndex(0);
    setIsPlaying(false);
    setAgent1State(prev => ({ ...prev, health: prev.maxHealth, isAttacking: false, isDefending: false }));
    setAgent2State(prev => ({ ...prev, health: prev.maxHealth, isAttacking: false, isDefending: false }));
  };

  const getHealthPercentage = (health: number, maxHealth: number) => {
    return Math.max(0, (health / maxHealth) * 100);
  };

  const getHealthColor = (percentage: number) => {
    if (percentage > 60) return 'from-green-500 to-green-600';
    if (percentage > 30) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="bg-gradient-to-br from-red-900/20 via-red-800/20 to-red-950/20 rounded-2xl p-6 border border-red-700/30">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">⚔️ Battle Visualization</h3>
        <div className="flex space-x-2">
          {events.length > 0 && !isOngoing && (
            <>
              <button
                onClick={playBattle}
                disabled={isPlaying}
                className="bg-sei-primary hover:bg-sei-light text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {isPlaying ? '▶️ Playing...' : '▶️ Replay Battle'}
              </button>
              <button
                onClick={resetVisualization}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                🔄 Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Battle Arena */}
      <div className="relative bg-gradient-to-r from-red-950/30 via-red-900/20 to-red-950/30 rounded-xl p-8 min-h-[300px]">
        {/* Arena Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-6xl">⚔️</div>
          <div className="absolute top-4 right-4 text-6xl">🛡️</div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-4xl">💥</div>
        </div>

        {/* Agent 1 */}
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2">
          <div className="text-center">
            {/* Agent Avatar */}
            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-3xl mb-2 transition-all duration-500 ${
              agent1State.isAttacking ? 'scale-110 shadow-lg shadow-blue-500/50' : ''
            } ${
              agent1State.isDefending ? 'animate-pulse' : ''
            }`}>
              🤖
              {/* Damage Number */}
              {agent1State.lastDamage > 0 && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-red-400 font-bold text-lg animate-bounce">
                  -{agent1State.lastDamage}
                </div>
              )}
            </div>
            
            {/* Agent Info */}
            <div className="text-white font-medium text-sm mb-2">
              Agent #{agent1State.id}
            </div>
            
            {/* Health Bar */}
            <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getHealthColor(getHealthPercentage(agent1State.health, agent1State.maxHealth))} transition-all duration-1000`}
                style={{ width: `${getHealthPercentage(agent1State.health, agent1State.maxHealth)}%` }}
              />
            </div>
            <div className="text-white/70 text-xs mt-1">
              {agent1State.health}/{agent1State.maxHealth} HP
            </div>
          </div>
        </div>

        {/* VS Indicator */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="text-4xl font-bold text-red-300 animate-pulse">VS</div>
        </div>

        {/* Agent 2 */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="text-center">
            {/* Agent Avatar */}
            <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-3xl mb-2 transition-all duration-500 ${
              agent2State.isAttacking ? 'scale-110 shadow-lg shadow-red-500/50' : ''
            } ${
              agent2State.isDefending ? 'animate-pulse' : ''
            }`}>
              🤖
              {/* Damage Number */}
              {agent2State.lastDamage > 0 && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-red-400 font-bold text-lg animate-bounce">
                  -{agent2State.lastDamage}
                </div>
              )}
            </div>
            
            {/* Agent Info */}
            <div className="text-white font-medium text-sm mb-2">
              Agent #{agent2State.id}
            </div>
            
            {/* Health Bar */}
            <div className="w-24 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getHealthColor(getHealthPercentage(agent2State.health, agent2State.maxHealth))} transition-all duration-1000`}
                style={{ width: `${getHealthPercentage(agent2State.health, agent2State.maxHealth)}%` }}
              />
            </div>
            <div className="text-white/70 text-xs mt-1">
              {agent2State.health}/{agent2State.maxHealth} HP
            </div>
          </div>
        </div>

        {/* Attack Animations */}
        {agent1State.isAttacking && (
          <div className="absolute left-32 top-1/2 transform -translate-y-1/2">
            <div className="animate-ping text-2xl">💥</div>
          </div>
        )}
        
        {agent2State.isAttacking && (
          <div className="absolute right-32 top-1/2 transform -translate-y-1/2">
            <div className="animate-ping text-2xl">💥</div>
          </div>
        )}
      </div>

      {/* Battle Progress */}
      {events.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 text-sm">Battle Progress</span>
            <span className="text-white/70 text-sm">
              {currentEventIndex}/{events.length} events
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sei-lighter to-sei-primary transition-all duration-500"
              style={{ width: `${(currentEventIndex / events.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Debug Information */}
      {events.length === 0 && (
        <div className="mt-4 bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/30">
          <div className="text-yellow-200 text-sm">
            <span className="font-medium">🔍 Debug: </span>
            No battle events found. Battle Status: {battleData?.status === 0 ? 'Ongoing' : battleData?.status === 1 ? 'Finished' : 'Unknown'}
            {battleData && (
              <div className="mt-2 text-xs text-yellow-300">
                Battle ID: {battleData.battleId?.toString() || 'Unknown'}<br/>
                Agent 1: #{battleData.agentIds?.[0]?.toString() || 'Unknown'}<br/>
                Agent 2: #{battleData.agentIds?.[1]?.toString() || 'Unknown'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Event Display */}
      {currentEventIndex > 0 && events[currentEventIndex - 1] && (
        <div className="mt-4 bg-red-950/30 rounded-lg p-3 border border-red-700/20">
          <div className="text-white/90 text-sm">
            <span className="font-medium">Latest: </span>
            {events[currentEventIndex - 1].event_type === 'attack' && (
              <span>
                Agent #{events[currentEventIndex - 1].attacker_id} attacks Agent #{events[currentEventIndex - 1].defender_id} for {events[currentEventIndex - 1].damage} damage!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}