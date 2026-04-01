import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get active missions
    const { data: missions } = await supabase
      .from('missions')
      .select('id, name, skill, status, current_step, steps, created_at, updated_at')
      .in('status', ['active', 'completed'])
      .order('updated_at', { ascending: false })
      .limit(5);

    // Get recent relay messages (last 50)
    const { data: relay } = await supabase
      .from('agent_relay')
      .select('id, mission_id, role, message_type, content, step_index, processed, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    // Gateway status — check if Eyes observations are recent
    const { data: latestEyes } = await supabase
      .from('agent_relay')
      .select('created_at')
      .eq('role', 'eyes')
      .order('created_at', { ascending: false })
      .limit(1);

    const eyesLastSeen = latestEyes?.[0]?.created_at || null;
    const gatewayOnline = eyesLastSeen
      ? Date.now() - new Date(eyesLastSeen).getTime() < 5 * 60 * 1000
      : false;

    // Aggregate stats
    const stats = {
      totalRelayMessages: relay?.length || 0,
      eyesObservations: relay?.filter(r => r.role === 'eyes').length || 0,
      brainCommands: relay?.filter(r => r.role === 'brain' && r.message_type === 'command').length || 0,
      handsResults: relay?.filter(r => r.role === 'hands').length || 0,
      unprocessed: relay?.filter(r => !r.processed).length || 0,
    };

    res.json({
      missions: missions || [],
      relay: relay || [],
      stats,
      gateway: {
        url: process.env.NEXT_PUBLIC_OPENCLAW_WS_URL || null,
        online: gatewayOnline,
        eyesLastSeen,
      },
    });
  } catch (err: any) {
    console.error('Eyes context error:', err);
    res.status(500).json({ error: err.message });
  }
}
