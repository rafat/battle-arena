// components/AITacticsPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import { BattleTactics, Strategy } from '@/lib/types/contracts';
import { useAITactics } from '@/hooks/useAITactics';

interface AITacticsPreviewProps {
  agent1Id: bigint;
  agent2Id: bigint;
  arenaType: number;
  tactics1: BattleTactics | null;
  tactics2: BattleTactics | null;
  onBattleStart: () => void;
  disabled: boolean;
  loading: boolean;
}

export const AITacticsPreview: React.FC<AITacticsPreviewProps> = ({
  agent1Id,
  agent2Id,
  arenaType,
  tactics1,
  tactics2,
  onBattleStart,
  disabled,
  loading,
}) => {
  const { generateTactics, isGenerating } = useAITactics();
  const [previewTactics1, setPreviewTactics1] = useState<BattleTactics | null>(null);
  const [previewTactics2, setPreviewTactics2] = useState<BattleTactics | null>(null);

  useEffect(() => {
    if (agent1Id && agent2Id) {
      generatePreview();
    }
  }, [agent1Id, agent2Id, arenaType]);

  const generatePreview = async () => {
    try {
      const [tactics1, tactics2] = await Promise.all([
        generateTactics(agent1Id, agent2Id, arenaType),
        generateTactics(agent2Id, agent1Id, arenaType),
      ]);
      
      setPreviewTactics1(tactics1);
      setPreviewTactics2(tactics2);
    } catch (error) {
      console.error('Failed to generate preview tactics:', error);
    }
  };

  const getStrategyColor = (strategy: Strategy): string => {
    switch (strategy) {
      case Strategy.Berserker: return 'text-red-400';
      case Strategy.Tactician: return 'text-blue-400';
      case Strategy.Defensive: return 'text-green-400';
      default: return 'text-yellow-400';
    }
  };

  const getStrategyName = (strategy: Strategy): string => {
    switch (strategy) {
      case Strategy.Berserker: return 'Berserker';
      case Strategy.Tactician: return 'Tactician';
      case Strategy.Defensive: return 'Defensive';
      default: return 'Balanced';
    }
  };

  const renderTacticsCard = (tactics: BattleTactics | null, title: string) => (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <h4 className="text-white font-semibold mb-3">{title}</h4>
      {tactics ? (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-white/70">Strategy:</span>
            <span className={`font-medium ${getStrategyColor(tactics.strategy)}`}>
              {getStrategyName(tactics.strategy)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Aggressiveness:</span>
            <div className="flex items-center space-x-2">
              <span className="text-white">{tactics.aggressiveness}%</span>
              <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-500"
                  style={{ width: `${tactics.aggressiveness}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-white/70">Risk Tolerance:</span>
            <div className="flex items-center space-x-2">
              <span className="text-white">{tactics.riskTolerance}%</span>
              <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-500"
                  style={{ width: `${tactics.riskTolerance}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-white/50 text-center py-4">
          {isGenerating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin"></div>
              <span>AI is strategizing...</span>
            </div>
          ) : (
            'No tactics generated'
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {renderTacticsCard(tactics1 || previewTactics1, 'Agent 1 AI Strategy')}
        {renderTacticsCard(tactics2 || previewTactics2, 'Agent 2 AI Strategy')}
      </div>

      {/* AI Strategy Summary */}
      {(previewTactics1 || previewTactics2) && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-white font-semibold mb-3">🧠 AI Analysis</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-400 font-medium">Agent 1 Strategy:</span>
              <p className="text-white/70 mt-1">
                {previewTactics1?.strategy === Strategy.Berserker && 'Going for aggressive, high-damage attacks'}
                {previewTactics1?.strategy === Strategy.Tactician && 'Using balanced offense and defense'}
                {previewTactics1?.strategy === Strategy.Defensive && 'Focusing on defense and counterattacks'}
                {previewTactics1?.strategy === Strategy.Balanced && 'Adapting to situation with balanced approach'}
              </p>
            </div>
            <div>
              <span className="text-green-400 font-medium">Agent 2 Strategy:</span>
              <p className="text-white/70 mt-1">
                {previewTactics2?.strategy === Strategy.Berserker && 'Going for aggressive, high-damage attacks'}
                {previewTactics2?.strategy === Strategy.Tactician && 'Using balanced offense and defense'}
                {previewTactics2?.strategy === Strategy.Defensive && 'Focusing on defense and counterattacks'}
                {previewTactics2?.strategy === Strategy.Balanced && 'Adapting to situation with balanced approach'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Battle Prediction */}
      {previewTactics1 && previewTactics2 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-4 border border-purple-500/30">
          <h4 className="text-white font-semibold mb-3">⚡ Battle Prediction</h4>
          <div className="text-white/80 text-sm">
            <BattlePrediction tactics1={previewTactics1} tactics2={previewTactics2} />
          </div>
        </div>
      )}

      {/* Action Buttons - REMOVED THE BATTLE START BUTTON */}
      <div className="flex items-center justify-center">
        <button
          onClick={generatePreview}
          disabled={isGenerating || disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Reanalyzing...</span>
            </div>
          ) : (
            '🔄 Regenerate Tactics'
          )}
        </button>
      </div>
    </div>
  );
};

// Battle Prediction Component
const BattlePrediction: React.FC<{ tactics1: BattleTactics; tactics2: BattleTactics }> = ({ tactics1, tactics2 }) => {
  const analyzeBattle = () => {
    const agent1Power = tactics1.aggressiveness + (tactics1.strategy === Strategy.Berserker ? 30 : 0);
    const agent2Power = tactics2.aggressiveness + (tactics2.strategy === Strategy.Berserker ? 30 : 0);
    
    const agent1Defense = (tactics1.strategy === Strategy.Defensive ? 30 : 0) + (100 - tactics1.aggressiveness);
    const agent2Defense = (tactics2.strategy === Strategy.Defensive ? 30 : 0) + (100 - tactics2.aggressiveness);
    
    const agent1Risk = tactics1.riskTolerance;
    const agent2Risk = tactics2.riskTolerance;
    
    if (Math.abs(agent1Power - agent2Power) < 10) {
      return "🤝 Evenly matched - expect a close battle!";
    }
    
    if (agent1Power > agent2Power + 20) {
      return "🔥 Agent 1 has the offensive advantage!";
    }
    
    if (agent2Power > agent1Power + 20) {
      return "🔥 Agent 2 has the offensive advantage!";
    }
    
    if (agent1Defense > agent2Defense + 20) {
      return "🛡️ Agent 1's defensive strategy may pay off in a long battle!";
    }
    
    if (agent2Defense > agent1Defense + 20) {
      return "🛡️ Agent 2's defensive strategy may pay off in a long battle!";
    }
    
    if (agent1Risk > 70 && agent2Risk < 30) {
      return "🎲 Agent 1 is gambling on high-risk, high-reward plays!";
    }
    
    if (agent2Risk > 70 && agent1Risk < 30) {
      return "🎲 Agent 2 is gambling on high-risk, high-reward plays!";
    }
    
    return "⚖️ Both agents are using balanced strategies - anything could happen!";
  };
  
  return <p>{analyzeBattle()}</p>;
};
