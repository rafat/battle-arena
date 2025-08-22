// app/api/ai-strategy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, opponentId } = body;

    if (!agentId || !opponentId) {
      return NextResponse.json(
        { error: 'Missing agent or opponent ID' },
        { status: 400 }
      );
    }

    // Get battle history for both agents
    const { data: battles, error } = await supabase
      .from('battles')
      .select('*')
      .or(`agent1_id.eq.${agentId},agent2_id.eq.${agentId},agent1_id.eq.${opponentId},agent2_id.eq.${opponentId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Simple AI strategy logic (you can enhance this with LangChain later)
    const agentBattles = battles.filter(
      (b) => b.agent1_id === agentId || b.agent2_id === agentId
    );
    const opponentBattles = battles.filter(
      (b) => b.agent1_id === opponentId || b.agent2_id === opponentId
    );

    // Calculate win rates
    const agentWins = agentBattles.filter((b) => b.winner_id === agentId).length;
    const opponentWins = opponentBattles.filter((b) => b.winner_id === opponentId).length;

    // Generate tactics based on history
    const aggressiveness = agentWins > opponentWins ? 70 : 40;
    const riskTolerance = agentBattles.length > 5 ? 60 : 30;
    const strategy = opponentWins > agentWins ? 2 : 0; // Tactician if opponent is stronger, Balanced otherwise

    return NextResponse.json({
      tactics: {
        aggressiveness,
        strategy,
        riskTolerance,
      },
      reasoning: `Based on ${agentBattles.length} battles and ${agentWins} wins vs opponent's ${opponentWins} wins`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}