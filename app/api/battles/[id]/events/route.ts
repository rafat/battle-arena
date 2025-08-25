// app/api/battles/[id]/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const battleId = parseInt(id);

    if (isNaN(battleId)) {
      return NextResponse.json({ error: 'Invalid battle ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('battle_events')
      .select('*')
      .eq('battle_id', battleId)  // Use battle_id column, not id
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching battle events:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (error) {
    console.error('Internal error fetching battle events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const battleId = parseInt(id);
    const body = await request.json();

    if (isNaN(battleId)) {
      return NextResponse.json({ error: 'Invalid battle ID' }, { status: 400 });
    }

    console.log('Creating battle event for battle:', battleId, 'Event:', body.event_type);

    // Simple insert without complex upsert to avoid conflict issues
    const { data, error } = await supabase
      .from('battle_events')
      .insert([
        {
          battle_id: battleId,
          event_type: body.event_type,
          attacker_id: body.attacker_id,
          defender_id: body.defender_id,
          damage: body.damage,
          event_data: body.event_data || null,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating battle event:', error);
      // Don't fail completely if events can't be stored - the battle succeeded
      console.log('⚠️ Battle event could not be stored, but battle was successful');
      return NextResponse.json({ 
        warning: 'Event could not be stored but battle was successful',
        error: error.message 
      }, { status: 200 }); // Return 200 instead of 500
    }

    console.log('Battle event created successfully:', data?.[0]);
    return NextResponse.json({ event: data?.[0] || null });
  } catch (error) {
    console.error('Internal error creating battle event:', error);
    // Don't fail completely if events can't be stored - the battle succeeded
    return NextResponse.json(
      { 
        warning: 'Event could not be stored but battle was successful',
        error: 'Internal server error' 
      },
      { status: 200 } // Return 200 instead of 500
    );
  }
}