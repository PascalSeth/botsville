import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME ?? 'localhost';
const port = parseInt(process.env.PORT ?? '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Store io globally so API route handlers can emit events
  (globalThis as Record<string, unknown>).io = io;

  io.on('connection', socket => {
    console.log('[Socket.io] Client connected:', socket.id);

    // Client joins their private notification room
    socket.on('join-user-room', (userId: string) => {
      if (typeof userId === 'string' && userId.length > 0) {
        socket.join('user:' + userId);
        console.log('[Socket.io] Socket', socket.id, 'joined room user:' + userId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
