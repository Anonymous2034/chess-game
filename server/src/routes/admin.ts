import { Router, Response } from 'express';
import { pool } from '../db';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// All admin routes require auth + admin
router.use(requireAuth, requireAdmin);

// GET /api/admin/users
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({
      data: rows.map(u => ({
        uid: u.id,
        displayName: u.display_name,
        email: u.email,
        isAdmin: u.is_admin,
        createdAt: u.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/users/:uid/stats
router.get('/users/:uid/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT data FROM user_stats WHERE user_id = $1',
      [req.params.uid]
    );
    res.json({ data: rows[0]?.data || null });
  } catch (err: any) {
    console.error('Admin user stats error:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// GET /api/admin/users/:uid/games
router.get('/users/:uid/games', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { rows } = await pool.query(
      'SELECT * FROM games WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [req.params.uid, limit]
    );
    res.json({
      data: rows.map(g => ({
        id: g.id,
        opponent: g.opponent,
        opponentElo: g.opponent_elo,
        result: g.result,
        date: g.created_at,
      })),
    });
  } catch (err: any) {
    console.error('Admin user games error:', err);
    res.status(500).json({ error: 'Failed to fetch user games' });
  }
});

export default router;
