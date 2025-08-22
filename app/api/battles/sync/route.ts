// app/api/battles/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battle_id, winner_id, battle_data } = body;

    if (!battle_id) {
      return NextResponse.json(
        { error: 'Missing battle_id' },
        { status: 400 }
      );
    }

    // Update battle with winner and battle data
    const { data, error } = await supabase
      .from('battles')
      .update({
        winner_id,
        battle_data,
        created_at: new Date().toISOString(),
      })
      .eq('id', battle_id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update agent stats if we have a winner
    if (winner_id && data.length > 0) {
      const battle = data[0];
      const loserId = battle.agent1_id === winner_id ? battle.agent2_id : battle.agent1_id;

      await updateAgentStats(battle.agent1_id, battle.agent2_id, winner_id);
    }

    return NextResponse.json({ battle: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateAgentStats(agent1Id: string, agent2Id: string, winnerId: string) {
  const loserId = winnerId === agent1Id ? agent2Id : agent1Id;

  try {
    // Fetch winner stats
    const { data: winnerStats } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', winnerId)
      .single();

    // Fetch loser stats
    const { data: loserStats } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', loserId)
      .single();

    const now = new Date().toISOString();

    // Update or insert winner
    const { error: winnerError } = await supabase
      .from('agent_stats')
      .upsert({
        agent_id: winnerId,
        total_battles: (winnerStats?.total_battles || 0) + 1,
        wins: (winnerStats?.wins || 0) + 1,
        losses: winnerStats?.losses || 0,
        updated_at: now,
      });

    // Update or insert loser
    const { error: loserError } = await supabase
      .from('agent_stats')
      .upsert({
        agent_id: loserId,
        total_battles: (loserStats?.total_battles || 0) + 1,
        wins: loserStats?.wins || 0,
        losses: (loserStats?.losses || 0) + 1,
        updated_at: now,
      });

    if (winnerError) console.error('Winner stats update error:', winnerError);
    if (loserError) console.error('Loser stats update error:', loserError);
  } catch (error) {
    console.error('Failed to update agent stats:', error);
  }
}
