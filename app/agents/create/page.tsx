// app/agents/create/page.tsx
'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { CreateAgentForm } from '@/components/CreateAgentForm';

export default function CreateAgentPage() {
  const { address } = useAccount();
  const router = useRouter();

  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-8">Create Agent</h1>
          <div className="text-white/80 mb-8">
            Connect your wallet to create a new battle agent
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

  const handleSuccess = (agentId: bigint) => {
    router.push(`/agents/${agentId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">🤖 Create New Agent</h1>
          <p className="text-white/80">
            Design your perfect battle agent
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <CreateAgentForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
