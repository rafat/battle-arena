// app/api/battles/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      battle_id,
      winner_id,
      battle_data,
    } = body;

    if (!battle_id) {
      return NextResponse.json(
        { error: 'Missing battle_id' },
        { status: 400 }
      );
    }

    console.log('Syncing battle completion to database:', {
      battle_id,
      winner_id: winner_id || 'none',
      hasData: !!battle_data
    });

    // Update the existing battle record with completion data
    const { data, error } = await supabase
      .from('battles')
      .update({
        winner_id: winner_id || null,
        battle_data: battle_data || null,
      })
      .eq('id', battle_id)
      .select();

    if (error) {
      console.error('Battle sync update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn('No battle found with ID:', battle_id);
      return NextResponse.json(
        { error: 'Battle not found' },
        { status: 404 }
      );
    }

    console.log('Battle completion successfully synced:', battle_id);
    return NextResponse.json({ 
      success: true,
      battle: data[0] 
    });
    
  } catch (error) {
    console.error('Battle sync internal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}