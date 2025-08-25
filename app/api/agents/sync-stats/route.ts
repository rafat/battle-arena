// app/api/agents/sync-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { battle_id, winner_id, loser_id, battle_events } = body;

    if (!battle_id || !winner_id || !loser_id) {
      return NextResponse.json(
        { error: 'Missing required fields: battle_id, winner_id, loser_id' },
        { status: 400 }
      );
    }

    console.log('Updating agent stats for battle:', battle_id);

    // Calculate stats from battle events
    const damageDealt: Record<string, number> = {};
    const damageReceived: Record<string, number> = {};
    
    if (battle_events && Array.isArray(battle_events)) {
      for (const event of battle_events) {
        if (event.event_type === 'attack') {
          const attackerId = event.attacker_id;
          const defenderId = event.defender_id;
          const damage = event.damage || 0;
          
          // Track damage dealt
          damageDealt[attackerId] = (damageDealt[attackerId] || 0) + damage;
          
          // Track damage received
          damageReceived[defenderId] = (damageReceived[defenderId] || 0) + damage;
        }
      }
    }

    // Update stats for both agents
    const agentIds = [winner_id, loser_id];
    
    for (const agentId of agentIds) {
      const isWinner = agentId === winner_id;
      const agentDamageDealt = damageDealt[agentId] || 0;
      const agentDamageReceived = damageReceived[agentId] || 0;

      // Upsert agent stats
      const { data: existingStats, error: fetchError } = await supabase
        .from('agent_stats')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn(`Error fetching stats for agent ${agentId}:`, fetchError);
        continue; // Skip this agent if we can't fetch their stats
      }

      const currentStats = existingStats || {
        agent_id: agentId,
        total_battles: 0,
        wins: 0,
        losses: 0,
        total_damage_dealt: 0,
        total_damage_received: 0,
      };

      const updatedStats = {
        agent_id: agentId,
        total_battles: currentStats.total_battles + 1,
        wins: currentStats.wins + (isWinner ? 1 : 0),
        losses: currentStats.losses + (isWinner ? 0 : 1),
        total_damage_dealt: currentStats.total_damage_dealt + agentDamageDealt,
        total_damage_received: currentStats.total_damage_received + agentDamageReceived,
      };

      const { error: upsertError } = await supabase
        .from('agent_stats')
        .upsert(updatedStats, {
          onConflict: 'agent_id',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.warn(`Failed to update stats for agent ${agentId}:`, upsertError);
      } else {
        console.log(`✅ Updated stats for agent ${agentId}:`, {
          battles: updatedStats.total_battles,
          wins: updatedStats.wins,
          losses: updatedStats.losses,
          isWinner
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Agent stats updated successfully' 
    });
  } catch (error) {
    console.error('Failed to sync agent stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}