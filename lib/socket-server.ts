import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client for broadcasting
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const serverSupabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Broadcast an event to a specific user's channel
 */
export async function broadcastToUser(userId: string, event: string, payload: unknown): Promise<void> {
  if (!serverSupabase) return;
  
  try {
    const channel = serverSupabase.channel(`user:${userId}`);
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase Broadcast] Error:', err);
    }
  }
}

/**
 * Broadcast an event to a public channel (e.g., community)
 */
export async function broadcastToChannel(channelName: string, event: string, payload: unknown): Promise<void> {
  if (!serverSupabase) return;
  
  try {
    const channel = serverSupabase.channel(channelName);
    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Supabase Broadcast] Error:', err);
    }
  }
}

// Legacy compatibility - returns null
export function getIO(): null {
  return null;
}
