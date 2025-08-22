// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const sortBy = searchParams.get('sort_by') || 'wins';

    const { data, error } = await supabase
      .from('agent_stats')
      .select(`
        *,
        agent:agents(*)
      `)
      .order(sortBy, { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leaderboard: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}