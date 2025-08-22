// app/api/agents/[id]/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no stats exist, create default ones
    if (!data) {
      const { data: newStats, error: insertError } = await supabase
        .from('agent_stats')
        .insert([
          {
            agent_id: id,
            total_battles: 0,
            wins: 0,
            losses: 0,
            total_damage_dealt: 0,
            total_damage_received: 0,
          },
        ])
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ stats: newStats });
    }

    return NextResponse.json({ stats: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}