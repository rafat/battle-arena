// components/LevelUpButton
'use client';
import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '@/lib/web3/config';
import { AGENT_FACTORY_ABI } from '@/lib/contracts/abis';

interface LevelUpButtonProps {
  agentId: bigint
  currentLevel: number
  experience: number
  experienceRequired: number
  onLevelUp: () => void
}

export function LevelUpButton({ 
  agentId, 
  currentLevel, 
  experience, 
  experienceRequired, 
  onLevelUp 
}: LevelUpButtonProps) {
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
  
  const canLevelUp = experience >= experienceRequired;
  const progressPercentage = (experience / experienceRequired) * 100;
  
  // Handle successful level up with useEffect
  useEffect(() => {
    if (isConfirmed && isLevelingUp) {
      setIsLevelingUp(false);
      onLevelUp();
    }
  }, [isConfirmed, isLevelingUp, onLevelUp]);
  
  const handleLevelUp = async () => {
    if (!canLevelUp) return;
    try {
      setIsLevelingUp(true);
      await writeContract({
        address: CONTRACTS.AGENT_FACTORY as `0x${string}`,
        abi: AGENT_FACTORY_ABI,
        functionName: 'levelUp',
        args: [agentId],
      });
    } catch (error) {
      console.error('Level up failed:', error);
      setIsLevelingUp(false);
    }
  };
  
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">Level Progress</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70">Current Level</span>
          <span className="text-white font-bold text-lg">{currentLevel}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/70">Experience</span>
            <span className="text-white">{experience}/{experienceRequired}</span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>
        
        {canLevelUp ? (
          <button
            onClick={handleLevelUp}
            disabled={isPending || isConfirming || isLevelingUp}
            className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:transform-none"
          >
            {isPending || isConfirming ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPending ? 'Leveling Up...' : 'Confirming...'}
              </span>
            ) : (
              `Level Up! (${currentLevel} → ${currentLevel + 1})`
            )}
          </button>
        ) : (
          <div className="text-center py-4">
            <div className="text-white/70 text-sm mb-2">
              Need {experienceRequired - experience} more XP to level up
            </div>
            <div className="text-white/50 text-xs">
              Battle more agents to gain experience!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}