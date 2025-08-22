'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgentSelector } from '@/components/AgentSelector';
import { TacticsEditor } from '@/components/TacticsEditor';
import { BattleView } from '@/components/BattleView';
import { BattleHistory } from '@/components/BattleHistory';
import { BattleTactics } from '@/lib/types/contracts';
import { useBattle } from '@/hooks/useBattle';
import { useAITactics } from '@/hooks/useAITactics';
import { AITacticsPreview } from '@/components/AITacticsPreview';

export default function ArenaPage() {
  const { address } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedAgent1, setSelectedAgent1] = useState<bigint | undefined>();
  const [selectedAgent2, setSelectedAgent2] = useState<bigint | undefined>();
  const [arenaType, setArenaType] = useState(0);
  const [tactics1, setTactics1] = useState<BattleTactics | null>(null);
  const [tactics2, setTactics2] = useState<BattleTactics | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [networkError, setNetworkError] = useState('');

  
  const {
    createBattle,
    executeFight, 
    currentBattleId,
    battleState,
    error: battleError,
    isCreating,
    isFighting,
    // Removed isWaiting and isFinished
  } = useBattle();

  const isWaiting = battleState === 'waiting';
  const isFinished = battleState === 'finished';

  const { generateTactics, isGenerating, error: aiError } = useAITactics();

  // Pre-select agent from URL params
  useEffect(() => {
    const agentParam = searchParams.get('agent');
    if (agentParam) {
      setSelectedAgent1(BigInt(agentParam));
    }
  }, [searchParams]);
  

  // Handle setup battle (startBattle contract call)
  const handleSetupBattle = async (newTactics1?: BattleTactics, newTactics2?: BattleTactics) => {
    if (!selectedAgent1 || !selectedAgent2) return;

    try {
      let finalTactics1 = newTactics1;
      let finalTactics2 = newTactics2;
      
      if (useAI) {
        // Generate AI tactics for both agents
        const [aiTactics1, aiTactics2] = await Promise.all([
          generateTactics(selectedAgent1, selectedAgent2, arenaType),
          generateTactics(selectedAgent2, selectedAgent1, arenaType),
        ]);
        
        finalTactics1 = aiTactics1 || finalTactics1;
        finalTactics2 = aiTactics2 || finalTactics2;
      }
      
      if (!finalTactics1 || !finalTactics2) {
        throw new Error('Failed to generate tactics');
      }
      
      setTactics1(finalTactics1);
      setTactics2(finalTactics2);
      
      // This calls startBattle() contract function
      await createBattle({
        agent1: selectedAgent1,
        agent2: selectedAgent2,
        tactics1: finalTactics1,
        tactics2: finalTactics2,
        arenaType,
      });
    } catch (error) {
      console.error('Failed to setup battle:', error);
    }
  };

  // Handle fight battle (fight contract call)
  const handleFightBattle = async () => {
    if (!currentBattleId) return;

    try {
      // This calls fight() contract function
      await executeFight();
    } catch (error) {
      console.error('Failed to fight battle:', error);
    }
  };

  const handleNewBattle = () => {
    setSelectedAgent1(undefined);
    setSelectedAgent2(undefined);
    setTactics1(null);
    setTactics2(null);
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">Battle Arena</h1>
          <div className="text-white/80 mb-8">
            Connect your wallet to enter the arena
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">⚔️ Battle Arena</h1>
          <p className="text-white/80">
            Select your agents and let them battle for glory!
          </p>
        </div>

        {/* Battle Status */}
        <div className="mb-6 bg-white/10 backdrop-blur-md rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                battleState === 'idle' ? 'bg-gray-500' :
                battleState === 'creating' ? 'bg-yellow-500 animate-pulse' :
                battleState === 'waiting' ? 'bg-blue-500' :
                battleState === 'fighting' ? 'bg-red-500 animate-pulse' :
                battleState === 'finished' ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-white font-medium">
                {battleState === 'idle' && 'Ready to setup battle'}
                {battleState === 'creating' && 'Setting up battle...'}
                {battleState === 'waiting' && 'Battle setup complete - Ready to fight!'}
                {battleState === 'fighting' && 'Battle in progress...'}
                {battleState === 'finished' && 'Battle completed!'}
              </span>
            </div>
            
            {/* Two separate buttons for the two contract functions */}
            <div className="flex space-x-3">
              {/* Setup Battle Button (calls startBattle) */}
              <button
                onClick={() => handleSetupBattle(tactics1 || undefined, tactics2 || undefined)}
                disabled={!selectedAgent1 || !selectedAgent2 || battleState !== 'idle' || isCreating || isGenerating}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Setting up...' : '🎯 Setup Battle'}
              </button>

              {/* Fight Button (calls fight) */}
              <button
                onClick={handleFightBattle}
                disabled={battleState !== 'waiting' || !currentBattleId || isFighting}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
              >
                {isFighting ? 'Fighting...' : '⚔️ Fight!'}
              </button>

              {/* New Battle Button */}
              {battleState === 'finished' && (
                <button
                  onClick={handleNewBattle}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  🆕 New Battle
                </button>
              )}
            </div>
          </div>
          
          {currentBattleId && (
            <div className="mt-2 text-white/70 text-sm">
              Battle ID: {currentBattleId.toString()}
            </div>
          )}
        </div>

        {/* Show battle view if there's an active battle */}
        {currentBattleId && (battleState === 'fighting' || battleState === 'finished') ? (
          <BattleView 
            battleId={currentBattleId}
            onNewBattle={handleNewBattle}
          />
        ) : (
          <div className="space-y-8">
            {/* Arena Selection */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Select Arena</h3>
              <div className="grid grid-cols-3 gap-4">
                {['Neutral Fields', 'Volcanic Plains', 'Mystic Forest'].map((arena, index) => (
                  <button
                    key={index}
                    onClick={() => setArenaType(index)}
                    disabled={battleState !== 'idle'}
                    className={`p-4 rounded-lg border-2 transition-all disabled:opacity-50 ${
                      arenaType === index
                        ? 'border-blue-400 bg-blue-500/20'
                        : 'border-white/30 hover:border-white/50'
                    }`}
                  >
                    <div className="text-white font-medium">{arena}</div>
                    <div className="text-white/70 text-sm mt-1">
                      {index === 0 && 'Balanced conditions'}
                      {index === 1 && '+15% fire damage'}
                      {index === 2 && '+15% earth/air damage'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Selection */}
            <div className="grid md:grid-cols-2 gap-8">
              <AgentSelector
                title="Select Fighter 1"
                onSelect={setSelectedAgent1}
                selected={selectedAgent1}
                disabled={battleState !== 'idle'}
              />
              
              <AgentSelector
                title="Select Fighter 2"
                onSelect={setSelectedAgent2}
                selected={selectedAgent2}
                disabled={battleState !== 'idle'}
              />
            </div>

            {/* AI Tactics Display or Manual Editor */}
            {selectedAgent1 && selectedAgent2 && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Battle Tactics</h3>
                  {useAI && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm">AI Strategist Active</span>
                    </div>
                  )}
                </div>
                
                {useAI ? (
                  <AITacticsPreview 
                    agent1Id={selectedAgent1}
                    agent2Id={selectedAgent2}
                    arenaType={arenaType}
                    tactics1={tactics1}
                    tactics2={tactics2}
                    onBattleStart={() => handleSetupBattle()}
                    disabled={battleState !== 'idle'}
                    loading={isCreating || isGenerating}
                  />
                ) : (
                  <TacticsEditor
                    onBattleStart={handleSetupBattle}
                    disabled={!selectedAgent1 || !selectedAgent2 || battleState !== 'idle'}
                    loading={isCreating}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Battle History */}
        <div className="mt-12">
          <BattleHistory limit={10} />
        </div>
      </div>
    </div>
  );
}
