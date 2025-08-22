// hooks/useAITactics.ts
import { useState } from 'react';
import { BattleTactics } from '@/lib/types/contracts';

export const useAITactics = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTactics = async (
    agentId: bigint,
    opponentId: bigint,
    arenaType?: number
  ): Promise<BattleTactics | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/tactics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId.toString(),
          opponent_id: opponentId.toString(),
          arena_type: arenaType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI tactics');
      }

      const data = await response.json();
      return data.tactics;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateTactics,
    isGenerating,
    error,
  };
};
