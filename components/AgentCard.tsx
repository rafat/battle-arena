// components/AgentCard.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AgentCardProps {
  agent: {
    id: string
    nickname?: string
    metadata_cid?: string
    owner_address: string
    created_at: string
  }
  showActions?: boolean
  compact?: boolean
}

export function AgentCard({ agent, showActions = false, compact = false }: AgentCardProps) {
  const router = useRouter();
  const [metadata, setMetadata] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleCardClick = () => {
    router.push(`/agents/${agent.id}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch metadata if available
        if (agent.metadata_cid) {
          const metadataResponse = await fetch(`https://ipfs.io/ipfs/${agent.metadata_cid}`);
          if (metadataResponse.ok) {
            const metadataData = await metadataResponse.json();
            setMetadata(metadataData);
            // Extract CID from image URL
            if (metadataData.image) {
              // Handle different IPFS URL formats
              let cid = metadataData.image;
              if (cid.includes('ipfs/')) {
                cid = cid.split('ipfs/')[1];
              } else if (cid.includes('://')) {
                cid = cid.split('://')[1];
              }
              setImageUrl(`https://ipfs.io/ipfs/${cid}`);
            }
          }
        }

        // Fetch stats
        const statsResponse = await fetch(`/api/agents/${agent.id}/stats`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
        }
      } catch (error) {
        console.error('Failed to fetch agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agent.id, agent.metadata_cid]);

  const displayName = agent.nickname || metadata?.name || `Agent #${agent.id}`;
  const description = metadata?.description || 'A mysterious battle agent';
  const winRate = stats?.total_battles > 0 ? (stats.wins / stats.total_battles * 100).toFixed(1) : '0';

  if (compact) {
    return (
      <Link href={`/agents/${agent.id}`}  className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 hover:border-white/40 transition-all duration-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center overflow-hidden">
            {metadata?.image ? (
              <Image
                src={`https://ipfs.io/ipfs/${metadata.image}`}
                alt={displayName}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <span className="text-white font-bold text-sm">#{agent.id}</span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-sm">{displayName}</h3>
            <p className="text-white/70 text-xs">{winRate}% Win Rate</p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-white/40 transition-all duration-200 group">
      <div className="relative">
        {/* Agent Image */}
        <div className="w-full h-48 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
          {metadata?.image ? (
            <Image
              src={`${metadata.image}`}
              alt={displayName}
              width={200}
              height={200}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-white text-4xl font-bold">
              #{agent.id}
            </div>
          )}
        </div>

        {/* Agent Info */}
        <div className="space-y-3">
          <div>
            <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
              #{agent.id} {displayName}
            </h3>
            <p className="text-white/70 text-sm line-clamp-2">
              {description}
            </p>
          </div>

          {/* Stats */}
          {!loading && stats && (
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/20">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.wins}</div>
                <div className="text-xs text-white/70">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{winRate}%</div>
                <div className="text-xs text-white/70">Win Rate</div>
              </div>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex space-x-2 pt-3">
              <Link
                href={`/agents/${agent.id}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium text-center transition-colors"
              >
                View Details
              </Link>
              <Link
                href={`/arena?agent=${agent.id}`}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-medium text-center transition-colors"
              onClick={e => e.stopPropagation()}>
                Battle
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
