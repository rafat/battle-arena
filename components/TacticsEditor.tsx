// components/TacticsEditor.tsx (make sure it doesn't have a battle start button)
'use client';

import { useState } from 'react';
import { BattleTactics, Strategy } from '@/lib/types/contracts';

interface TacticsEditorProps {
  onBattleStart: (tactics1: BattleTactics, tactics2: BattleTactics) => void;
  disabled: boolean;
  loading: boolean;
}

export const TacticsEditor: React.FC<TacticsEditorProps> = ({
  onBattleStart,
  disabled,
  loading,
}) => {
  const [tactics1, setTactics1] = useState<BattleTactics>({
    strategy: Strategy.Balanced,
    aggressiveness: 50,
    riskTolerance: 50,
  });

  const [tactics2, setTactics2] = useState<BattleTactics>({
    strategy: Strategy.Balanced,
    aggressiveness: 50,
    riskTolerance: 50,
  });

  const handleTacticsChange = (
    agentNum: 1 | 2,
    field: keyof BattleTactics,
    value: any
  ) => {
    if (agentNum === 1) {
      setTactics1(prev => ({ ...prev, [field]: value }));
    } else {
      setTactics2(prev => ({ ...prev, [field]: value }));
    }
  };

  const renderTacticsEditor = (
    tactics: BattleTactics,
    agentNum: 1 | 2,
    title: string
  ) => (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <h4 className="text-white font-semibold mb-4">{title}</h4>
      
      <div className="space-y-4">
        <div>
          <label className="block text-white/70 text-sm mb-2">Strategy</label>
          <select
            value={tactics.strategy}
            onChange={(e) => handleTacticsChange(agentNum, 'strategy', Number(e.target.value))}
            disabled={disabled}
            className="w-full bg-black/20 border border-white/30 rounded-lg px-3 py-2 text-white disabled:opacity-50"
          >
            <option value={Strategy.Balanced}>Balanced</option>
            <option value={Strategy.Berserker}>Berserker (+30% Attack)</option>
            <option value={Strategy.Tactician}>Tactician (+15% Attack & Defense)</option>
            <option value={Strategy.Defensive}>Defensive (+30% Defense)</option>
          </select>
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-2">
            Aggressiveness: {tactics.aggressiveness}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={tactics.aggressiveness}
            onChange={(e) => handleTacticsChange(agentNum, 'aggressiveness', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-2">
            Risk Tolerance: {tactics.riskTolerance}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={tactics.riskTolerance}
            onChange={(e) => handleTacticsChange(agentNum, 'riskTolerance', Number(e.target.value))}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {renderTacticsEditor(tactics1, 1, 'Agent 1 Tactics')}
        {renderTacticsEditor(tactics2, 2, 'Agent 2 Tactics')}
      </div>

      {/* Store tactics but don't render battle start button - it's handled by parent */}
      <div className="text-center">
        <div className="text-white/70 text-sm">
          Manual tactics configured. Use the "Setup Battle" button above to proceed.
        </div>
      </div>
    </div>
  );
};
