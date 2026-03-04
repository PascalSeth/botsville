import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.io client connected to the custom server.
 * Safe to call multiple times — always returns the same instance.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: '/api/socketio',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }
  return socket;
}
