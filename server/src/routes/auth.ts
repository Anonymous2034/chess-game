import { Router, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { pool } from '../db';
import { config } from '../config';
import { hashPassword, comparePassword } from '../services/password';
import {
  signAccessToken,
  generateRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/jwt';
import { requireAuth, AuthRequest } from '../middleware/auth';

const googleClient = new OAuth2Client(config.google.clientId);

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const name = displayName || email.split('@')[0];

    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name, is_admin, created_at',
      [email.toLowerCase(), passwordHash, name]
    );

    const user = rows[0];
    const accessToken = signAccessToken({ uid: user.id, email: user.email, isAdmin: user.is_admin });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    res.status(201).json({
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash, display_name, is_admin, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const user = rows[0];
    if (!user.password_hash) {
      res.status(401).json({ error: 'This account uses Google Sign-In. Please log in with Google.' });
      return;
    }
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = signAccessToken({ uid: user.id, email: user.email, isAdmin: user.is_admin });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.json({ ok: true });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required' });
      return;
    }

    const userId = await validateRefreshToken(refreshToken);
    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Revoke old token
    await revokeRefreshToken(refreshToken);

    // Get user data
    const { rows } = await pool.query(
      'SELECT id, email, display_name, is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const user = rows[0];
    const newAccessToken = signAccessToken({ uid: user.id, email: user.email, isAdmin: user.is_admin });
    const newRefreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err: any) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// GET /api/auth/me — requires auth
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = $1',
      [req.user!.uid]
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = rows[0];
    res.json({
      uid: user.id,
      email: user.email,
      displayName: user.display_name,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
    });
  } catch (err: any) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// PUT /api/auth/profile — update display name
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { displayName } = req.body;
    if (!displayName) {
      res.status(400).json({ error: 'Display name is required' });
      return;
    }

    await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', [displayName, req.user!.uid]);

    res.json({ ok: true, displayName });
  } catch (err: any) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/google — sign in with Google ID token
router.post('/google', async (req: AuthRequest, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    if (!config.google.clientId) {
      res.status(500).json({ error: 'Google Sign-In is not configured on this server' });
      return;
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(401).json({ error: 'Invalid Google token' });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const displayName = payload.name || email.split('@')[0];

    // Check if user already exists by google_id or email
    let user;
    const byGoogle = await pool.query(
      'SELECT id, email, display_name, is_admin, created_at FROM users WHERE google_id = $1',
      [googleId]
    );

    if (byGoogle.rows.length > 0) {
      user = byGoogle.rows[0];
    } else {
      // Check by email (user may have registered with email/password before)
      const byEmail = await pool.query(
        'SELECT id, email, display_name, is_admin, created_at, google_id FROM users WHERE email = $1',
        [email]
      );

      if (byEmail.rows.length > 0) {
        // Link Google account to existing user
        user = byEmail.rows[0];
        if (!user.google_id) {
          await pool.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
        }
      } else {
        // Create new user (no password — OAuth only)
        const { rows } = await pool.query(
          'INSERT INTO users (email, display_name, google_id) VALUES ($1, $2, $3) RETURNING id, email, display_name, is_admin, created_at',
          [email, displayName, googleId]
        );
        user = rows[0];
      }
    }

    const accessToken = signAccessToken({ uid: user.id, email: user.email, isAdmin: user.is_admin });
    const refreshToken = generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    res.json({
      user: {
        uid: user.id,
        email: user.email,
        displayName: user.display_name,
        isAdmin: user.is_admin,
        createdAt: user.created_at,
      },
      accessToken,
      refreshToken,
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

export default router;
