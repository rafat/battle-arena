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

    console.log('Received battle sync request:', {
      battle_id,
      agent1_id,
      agent2_id,
      arena_type,
      hasWinner: !!winner_id,
      hasTactics: !!(agent1_tactics && agent2_tactics),
      hasBattleData: !!battle_data
    });

    if (!battle_id || !agent1_id || !agent2_id) {
      console.error('Missing required fields:', { battle_id, agent1_id, agent2_id });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use upsert to handle duplicate battle IDs gracefully
    // This will insert if the battle doesn't exist, or update if it does
    const battleRecord = {
      id: battle_id,  // Primary key
      agent1_id,
      agent2_id,
      agent1_tactics,
      agent2_tactics,
      winner_id,
      arena_type,
      battle_data,
    };

    console.log('Attempting upsert with record:', battleRecord);

    const { data, error } = await supabase
      .from('battles')
      .upsert(
        battleRecord,
        { 
          onConflict: 'id',  // Use 'id' column for conflict resolution
          ignoreDuplicates: false  // Update existing records instead of ignoring
        }
      )
      .select();

    if (error) {
      console.error('Battle upsert error details:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Battle successfully synced to database:', {
      battle_id,
      operation: data && data.length > 0 ? 'inserted/updated' : 'no change',
      recordCount: data?.length || 0
    });

    return NextResponse.json({ 
      success: true,
      battle: data?.[0] || null 
    });
  } catch (error) {
    console.error('Battle sync internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
