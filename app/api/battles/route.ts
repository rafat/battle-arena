// app/api/battles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    let query = supabase
      .from('battles')
      .select(`
        *,
        agent1:agents!agent1_id(id, agent_id, nickname, level, dna),
        agent2:agents!agent2_id(id, agent_id, nickname, level, dna),
        winner:agents!winner_id(id, agent_id, nickname, level, dna)
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (agentId) {
      query = query.or(`agent1_id.eq.${agentId},agent2_id.eq.${agentId}`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ battles: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      battle_id,
      agent1_id,
      agent2_id,
      agent1_tactics,
      agent2_tactics,
      winner_id,
      arena_type,
      battle_data,
    } = body;

    if (!battle_id || !agent1_id || !agent2_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('battles')
      .insert([
        {
          id: battle_id,
          agent1_id,
          agent2_id,
          agent1_tactics,
          agent2_tactics,
          winner_id,
          arena_type,
          battle_data,
          battle_id
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ battle: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
