import { Router, Response } from 'express';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require auth
router.use(requireAuth);

// === Stats ===

// GET /api/data/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM user_stats WHERE user_id = $1',
      [req.user!.uid]
    );
    res.json({ data: rows[0]?.data || null });
  } catch (err: any) {
    console.error('Load stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

// PUT /api/data/stats
router.put('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;
    await pool.query(
      `INSERT INTO user_stats (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.user!.uid, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Save stats error:', err);
    res.status(500).json({ error: 'Failed to save stats' });
  }
});

// === Games ===

// GET /api/data/games?limit=50
router.get('/games', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { rows } = await pool.query(
      'SELECT * FROM games WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user!.uid, limit]
    );
    res.json({
      data: rows.map(g => ({
        id: g.id,
        opponent: g.opponent,
        opponentElo: g.opponent_elo,
        result: g.result,
        pgn: g.pgn,
        opening: g.opening,
        playerColor: g.player_color,
        moveCount: g.move_count,
        timeControl: g.time_control,
        date: g.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Load games error:', err);
    res.status(500).json({ error: 'Failed to load games' });
  }
});

// POST /api/data/games
router.post('/games', async (req: AuthRequest, res: Response) => {
  try {
    const { opponent, opponentElo, result, pgn, opening, playerColor, moveCount, timeControl } = req.body;
    await pool.query(
      `INSERT INTO games (user_id, opponent, opponent_elo, result, pgn, opening, player_color, move_count, time_control)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [req.user!.uid, opponent, opponentElo, result, pgn, opening, playerColor, moveCount, timeControl]
    );
    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error('Save game error:', err);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

// === Settings ===

// GET /api/data/settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM user_settings WHERE user_id = $1',
      [req.user!.uid]
    );
    res.json({ data: rows[0]?.data || null });
  } catch (err: any) {
    console.error('Load settings error:', err);
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// PUT /api/data/settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;
    await pool.query(
      `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.user!.uid, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// === Coach Chats ===

// GET /api/data/coach-chats?limit=20
router.get('/coach-chats', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { rows } = await pool.query(
      'SELECT * FROM coach_chats WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.user!.uid, limit]
    );
    res.json({
      data: rows.map(c => ({
        id: c.id,
        messages: c.messages,
        gameContext: c.game_context,
        date: c.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Load coach chats error:', err);
    res.status(500).json({ error: 'Failed to load coach chats' });
  }
});

// POST /api/data/coach-chats
router.post('/coach-chats', async (req: AuthRequest, res: Response) => {
  try {
    const { messages, gameContext } = req.body;
    await pool.query(
      'INSERT INTO coach_chats (user_id, messages, game_context) VALUES ($1, $2, $3)',
      [req.user!.uid, JSON.stringify(messages), JSON.stringify(gameContext)]
    );
    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error('Save coach chat error:', err);
    res.status(500).json({ error: 'Failed to save coach chat' });
  }
});

// === Tournaments ===

// GET /api/data/tournaments
router.get('/tournaments', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM tournaments WHERE user_id = $1',
      [req.user!.uid]
    );
    res.json({ data: rows[0]?.data || null });
  } catch (err: any) {
    console.error('Load tournament error:', err);
    res.status(500).json({ error: 'Failed to load tournament' });
  }
});

// PUT /api/data/tournaments
router.put('/tournaments', async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body;
    await pool.query(
      `INSERT INTO tournaments (user_id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [req.user!.uid, JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Save tournament error:', err);
    res.status(500).json({ error: 'Failed to save tournament' });
  }
});

// === Migration ===

// POST /api/data/migrate
router.post('/migrate', async (req: AuthRequest, res: Response) => {
  try {
    // Check if already migrated
    const { rows: migRows } = await pool.query(
      'SELECT user_id FROM migrations WHERE user_id = $1',
      [req.user!.uid]
    );
    if (migRows.length > 0) {
      res.json({ ok: true, alreadyMigrated: true });
      return;
    }

    const { stats, tournament } = req.body;

    if (stats) {
      await pool.query(
        `INSERT INTO user_stats (user_id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [req.user!.uid, JSON.stringify(stats)]
      );
    }

    if (tournament) {
      await pool.query(
        `INSERT INTO tournaments (user_id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET data = $2, updated_at = NOW()`,
        [req.user!.uid, JSON.stringify(tournament)]
      );
    }

    await pool.query('INSERT INTO migrations (user_id) VALUES ($1)', [req.user!.uid]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed' });
  }
});

export default router;
