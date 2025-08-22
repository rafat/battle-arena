// components/AgentStats.tsx
'use client';

import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface AgentStatsProps {
  agentId: bigint
}

export function AgentStats({ agentId }: AgentStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsResponse, battlesResponse] = await Promise.all([
          fetch(`/api/agents/${agentId}/stats`),
          fetch(`/api/battles?agent_id=${agentId}&limit=10`)
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
        }

        if (battlesResponse.ok) {
          const battlesData = await battlesResponse.json();
          setBattles(battlesData.battles);
        }
      } catch (error) {
        console.error('Failed to fetch agent stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId]);

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <div className="text-white text-center">Loading stats...</div>
      </div>
    );
  }

  console.log(battles);

  if (!stats) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <div className="text-white text-center">No stats available</div>
      </div>
    );
  }

  const winRate = stats.total_battles > 0 ? (stats.wins / stats.total_battles * 100).toFixed(1) : '0';
  const avgDamageDealt = stats.total_battles > 0 ? Math.round(stats.total_damage_dealt / stats.total_battles) : 0;
  const avgDamageReceived = stats.total_battles > 0 ? Math.round(stats.total_damage_received / stats.total_battles) : 0;

  // Chart data for recent battles
  const recentBattlesData = {
    labels: battles.map((_, index) => `Battle ${index + 1}`),
    datasets: [
      {
        label: 'Wins',
        data: battles.map(battle => battle.winner_id === agentId.toString() ? 1 : 0),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };
  const performanceData = {
    labels: ['Damage Dealt', 'Damage Received', 'Win Rate'],
    datasets: [
      {
        label: 'Performance Metrics',
        data: [avgDamageDealt, avgDamageReceived, parseFloat(winRate)],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 1,
      },
    ],
  };
  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <h3 className="text-2xl font-bold text-white mb-6">Combat Statistics</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">{stats.total_battles}</div>
            <div className="text-white/70 text-sm">Total Battles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
            <div className="text-white/70 text-sm">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
            <div className="text-white/70 text-sm">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">{winRate}%</div>
            <div className="text-white/70 text-sm">Win Rate</div>
          </div>
        </div>
      </div>
      {/* Performance Metrics */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Performance Metrics</h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{avgDamageDealt}</div>
            <div className="text-white/70 text-sm">Avg Damage Dealt</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{avgDamageReceived}</div>
            <div className="text-white/70 text-sm">Avg Damage Received</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {stats.total_damage_dealt > 0 ? (stats.total_damage_dealt / Math.max(stats.total_damage_received, 1)).toFixed(2) : '0'}
            </div>
            <div className="text-white/70 text-sm">Damage Ratio</div>
          </div>
        </div>
        {/* Performance Chart */}
        <div className="h-64">
          <Bar data={performanceData} options={chartOptions} />
        </div>
      </div>      
    </div>
  );
}