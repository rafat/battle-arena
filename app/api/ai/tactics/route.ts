// app/api/ai/tactics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AIStrategyEngine } from '@/lib/ai/strategy';
import { supabase } from '@/lib/supabase/supabase';

// In-memory cache to prevent duplicate generations
const tacticsCache = new Map<string, { tactics: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, opponent_id, arena_type } = body;

    if (!agent_id || !opponent_id) {
      return NextResponse.json(
        { error: 'Missing required agent IDs' },
        { status: 400 }
      );
    }

    // Create a cache key for this specific matchup
    const cacheKey = `${agent_id}-${opponent_id}-${arena_type || 0}`;
    
    // Check cache first
    const cached = tacticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached tactics for:', cacheKey);
      return NextResponse.json({ tactics: cached.tactics });
    }

    // Fetch agent data
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', agent_id)
      .single();

    const { data: opponentData, error: opponentError } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_id', opponent_id)
      .single();

    if (agentError || opponentError) {
      console.error('Agent fetch error:', { agentError, opponentError });
      return NextResponse.json(
        { error: 'Failed to fetch agent data' },
        { status: 500 }
      );
    }

    // Fetch battle history for this agent
    const { data: battleHistory } = await supabase
      .from('battles')
      .select(`
        *,
        agent1:agents!agent1_id(agent_id, level, dna),
        agent2:agents!agent2_id(agent_id, level, dna)
      `)
      .or(`agent1_id.eq.${agentData.id},agent2_id.eq.${agentData.id}`)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Generating tactics for Agent ${agent_id} vs Agent ${opponent_id}`);
    
    // Generate AI tactics
    const aiEngine = await AIStrategyEngine.create();
    const tactics = await aiEngine.generateBattleTactics(
      agentData,
      opponentData,
      battleHistory || [],
      arena_type
    );

    // Cache the result
    tacticsCache.set(cacheKey, {
      tactics,
      timestamp: Date.now()
    });

    console.log('Generated tactics:', tactics);

    return NextResponse.json({ tactics });
  } catch (error) {
    console.error('AI tactics generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI tactics' },
      { status: 500 }
    );
  }
}

// Optional: Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tacticsCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      tacticsCache.delete(key);
    }
  }
}, CACHE_DURATION);