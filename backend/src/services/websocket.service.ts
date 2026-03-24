import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import logger from '../utils/logger';
import { config } from '../config/config';

interface AuthenticatedClient {
  ws:        WebSocket;
  sessionId: string;
  type:      'reporter' | 'admin';
  channels:  Set<string>;
  role?:     string;
}

class SentinelWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Map<string, AuthenticatedClient>();

  init(server?: any) {
    // If a server instance is provided, use it. Otherwise, use the standalone port.
    const options = server 
      ? { server } 
      : { port: config.ws.port };

    this.wss = new WebSocketServer(options);

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    const displayPort = server ? server.address()?.port : config.ws.port;
    logger.info(`WebSocket server initialized (Port: ${displayPort})`);
  } 

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const url    = new URL(req.url ?? '/', `ws://localhost`);
    const token  = url.searchParams.get('token');

    if (!token) { ws.close(4001, 'No token'); return; }

    try {
      const payload = verifyAccessToken(token);
      const clientId = `${payload.sub}-${Date.now()}`;

      const client: AuthenticatedClient = {
        ws,
        sessionId: payload.sub,
        type:      payload.type,
        channels:  new Set(),
        role:      payload.type === 'admin' ? (payload as any).role : undefined,
      };

      this.clients.set(clientId, client);
      logger.info(`WS client connected: ${payload.type} ${payload.sub}`);

      ws.send(JSON.stringify({ type: 'CONNECTED', clientId }));

      ws.on('message', (raw) => this.handleMessage(clientId, raw.toString()));
      ws.on('close', ()  => { this.clients.delete(clientId); });
      ws.on('error', (e) => { logger.error(`WS error: ${e.message}`); this.clients.delete(clientId); });

      // Heartbeat
      (ws as any).isAlive = true;
      ws.on('pong', () => { (ws as any).isAlive = true; });

    } catch {
      ws.close(4001, 'Invalid token');
    }
  }

  private handleMessage(clientId: string, raw: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const msg = JSON.parse(raw) as { type: string; channelId?: string };

      switch (msg.type) {
        case 'SUBSCRIBE':
          if (msg.channelId) { client.channels.add(msg.channelId); }
          break;
        case 'UNSUBSCRIBE':
          if (msg.channelId) { client.channels.delete(msg.channelId); }
          break;
        case 'PING':
          client.ws.send(JSON.stringify({ type: 'PONG' }));
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }

  broadcastToChannel(channelId: string, payload: object) {
    const data = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.channels.has(channelId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToAdmin(adminId: string, payload: object) {
    const data = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.type === 'admin' && client.sessionId === adminId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToReporter(sessionId: string, payload: object) {
    const data = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.type === 'reporter' && client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  broadcastToAllAdmins(payload: object) {
    const data = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.type === 'admin' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  startHeartbeat() {
    setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!(client.ws as any).isAlive) {
          this.clients.delete(id);
          return client.ws.terminate();
        }
        (client.ws as any).isAlive = false;
        client.ws.ping();
      });
    }, 30_000);
  }
}

export const wsServer = new SentinelWebSocketServer();
