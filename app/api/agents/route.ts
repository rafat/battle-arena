import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get('owner');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const query = supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agents: data });
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
      agent_id, 
      owner_address, 
      metadata_cid, 
      nickname,
      dna,
      level,
      experience,
      equipped_item_id
    } = body;

    if (!agent_id || !owner_address) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id and owner_address' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('agents')
      .insert([
        {
          id: agent_id,
          agent_id,
          owner_address,
          metadata_cid,
          nickname,
          dna,
          level: level || 1,
          experience: experience || 0,
          equipped_item_id: equipped_item_id || 0
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ agent: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}