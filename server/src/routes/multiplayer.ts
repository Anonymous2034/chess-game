import { Router, Response } from 'express';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// POST /api/multiplayer/games — create a new game
router.post('/games', async (req: AuthRequest, res: Response) => {
  try {
    const { code, color, timeControl, increment } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO multiplayer_games (code, host_id, host_color, time_control, increment, status)
       VALUES ($1, $2, $3, $4, $5, 'waiting') RETURNING id`,
      [code, req.user!.uid, color || 'w', timeControl || 0, increment || 0]
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err: any) {
    console.error('Create multiplayer game error:', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// POST /api/multiplayer/games/join — join by code
router.post('/games/join', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const upperCode = (code || '').toUpperCase().trim();

    const { rows } = await pool.query(
      "SELECT * FROM multiplayer_games WHERE code = $1 AND status = 'waiting'",
      [upperCode]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Game not found or already started' });
      return;
    }

    const game = rows[0];

    await pool.query(
      "UPDATE multiplayer_games SET guest_id = $1, status = 'playing' WHERE id = $2",
      [req.user!.uid, game.id]
    );

    res.json({
      id: game.id,
      hostColor: game.host_color,
      timeControl: game.time_control,
      increment: game.increment,
    });
  } catch (err: any) {
    console.error('Join multiplayer game error:', err);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// PUT /api/multiplayer/games/:id — archive result
router.put('/games/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { result, pgn } = req.body;
    await pool.query(
      "UPDATE multiplayer_games SET result = $1, pgn = $2, status = 'finished' WHERE id = $3",
      [result, pgn, req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Archive multiplayer game error:', err);
    res.status(500).json({ error: 'Failed to archive game' });
  }
});

export default router;
