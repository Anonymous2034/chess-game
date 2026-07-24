import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import { initDatabase } from './db';
import authRoutes from './routes/auth';
import dataRoutes from './routes/data';
import adminRoutes from './routes/admin';
import multiplayerRoutes from './routes/multiplayer';
import { setupWebSocket } from './ws/channels';

const app = express();
const server = http.createServer(app);

// We sit behind a single reverse proxy (Caddy). Trust exactly one hop so
// req.ip / X-Forwarded-For reflect the real client — required for per-client
// rate limiting (and safe: a permissive `true` would let clients spoof IPs).
app.set('trust proxy', 1);

// WebSocket server — upgrade on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Middleware
const allowedOrigins = new Set(config.cors.origins);
app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / non-browser requests (no Origin header) and any
    // explicitly allow-listed origin; reject everything else.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));
app.use(express.json({ limit: '5mb' }));

// API routes (before static files so /api/* always hits the backend)
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/multiplayer', multiplayerRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Static frontend files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SPA fallback — serve index.html for any non-API, non-file route
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start
async function start() {
  try {
    await initDatabase();
    server.listen(config.port, () => {
      console.log(`Grandmasters API running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
