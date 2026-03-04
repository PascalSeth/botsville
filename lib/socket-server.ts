import type { Server as SocketIOServer } from 'socket.io';

/**
 * Returns the Socket.io server instance attached by the custom server.ts.
 * Only available when running under the custom server (not edge/serverless).
 */
export function getIO(): SocketIOServer | null {
  return (globalThis as Record<string, unknown>).io as SocketIOServer | null ?? null;
}
