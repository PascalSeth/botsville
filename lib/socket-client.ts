import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Store active channels
const channels: Map<string, RealtimeChannel> = new Map();

/**
 * Subscribe to a realtime channel for notifications/posts
 * Works on serverless platforms (Netlify, Vercel) via Supabase Realtime
 */
export function subscribeToChannel(
  channelName: string,
  eventName: string,
  callback: (payload: unknown) => void
): RealtimeChannel {
  // Reuse existing channel if already subscribed
  const existingChannel = channels.get(channelName);
  if (existingChannel) {
    existingChannel.on('broadcast', { event: eventName }, ({ payload }) => callback(payload));
    return existingChannel;
  }

  const channel = supabase.channel(channelName)
    .on('broadcast', { event: eventName }, ({ payload }) => callback(payload))
    .subscribe();

  channels.set(channelName, channel);
  return channel;
}

/**
 * Subscribe to user-specific notifications
 */
export function subscribeToUserNotifications(
  userId: string,
  onNotification: (notification: unknown) => void
): RealtimeChannel {
  return subscribeToChannel(`user:${userId}`, 'notification', onNotification);
}

/**
 * Subscribe to new community posts
 */
export function subscribeToCommunityPosts(
  onNewPost: (post: unknown) => void
): RealtimeChannel {
  return subscribeToChannel('community', 'new-post', onNewPost);
}

/**
 * Broadcast an event to a channel (call from API routes)
 */
export async function broadcastEvent(
  channelName: string,
  eventName: string,
  payload: unknown
): Promise<void> {
  const channel = supabase.channel(channelName);
  await channel.send({
    type: 'broadcast',
    event: eventName,
    payload,
  });
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeFromChannel(channelName: string): void {
  const channel = channels.get(channelName);
  if (channel) {
    supabase.removeChannel(channel);
    channels.delete(channelName);
  }
}

/**
 * Cleanup all subscriptions
 */
export function cleanupAllChannels(): void {
  channels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  channels.clear();
}

// Legacy compatibility - returns null since we're using Supabase now
export function getSocket(): null {
  return null;
}
