import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyAccessToken } from '../services/jwt';

interface Client {
  ws: WebSocket;
  uid: string;
  name: string;
  role: string; // 'host' or 'guest'
}

// game code -> clients
const channels = new Map<string, Client[]>();

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', 'http://localhost');
    const gameCode = url.searchParams.get('game');
    const token = url.searchParams.get('token');
    const name = url.searchParams.get('name') || 'Player';
    const role = url.searchParams.get('role') || 'guest';

    if (!gameCode || !token) {
      ws.close(4000, 'Missing game code or token');
      return;
    }

    // Verify JWT
    let uid: string;
    try {
      const payload = verifyAccessToken(token);
      uid = payload.uid;
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    // Add to channel
    if (!channels.has(gameCode)) {
      channels.set(gameCode, []);
    }

    const client: Client = { ws, uid, name, role };
    const channel = channels.get(gameCode)!;
    channel.push(client);

    // Notify others that a player joined
    broadcast(gameCode, uid, {
      event: 'player-joined',
      payload: { name, role },
    });

    // Send presence of existing players to the new connection
    for (const other of channel) {
      if (other.uid !== uid) {
        send(ws, {
          event: 'presence-join',
          payload: { name: other.name, role: other.role },
        });
      }
    }

    // Handle messages
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Relay to all other clients in the channel
        broadcast(gameCode, uid, msg);
      } catch {
        // Ignore malformed messages
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      const ch = channels.get(gameCode);
      if (ch) {
        const idx = ch.findIndex(c => c.ws === ws);
        if (idx >= 0) ch.splice(idx, 1);
        if (ch.length === 0) {
          channels.delete(gameCode);
        } else {
          // Notify others of disconnect
          broadcast(gameCode, uid, {
            event: 'presence-leave',
            payload: { name, role },
          });
        }
      }
    });
  });
}

function broadcast(gameCode: string, senderUid: string, msg: any): void {
  const channel = channels.get(gameCode);
  if (!channel) return;
  const data = JSON.stringify(msg);
  for (const client of channel) {
    if (client.uid !== senderUid && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function send(ws: WebSocket, msg: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
