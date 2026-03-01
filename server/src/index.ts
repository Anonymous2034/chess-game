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

// WebSocket server — upgrade on /ws path
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Middleware
app.use(cors());
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
