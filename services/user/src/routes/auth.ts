// services/user/src/routes/auth.ts

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { config } from '../config';
import { requireAuth, AuthRequest } from '../middleware/jwt';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function issueTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, config.refreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expires]
  );
}

// -------------------------------------------------------
// POST /auth/register
// Rate limited — prevents account spam
// -------------------------------------------------------
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, and password are required' });
    }
    if (typeof username !== 'string' || username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters' });
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hash = await bcrypt.hash(password, 12);

    // Explicit column list — never use SELECT * or implicit RETURNING *
    const { rows } = await pool.query<{ id: string; username: string; email: string }>(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.toLowerCase().trim(), email.toLowerCase().trim(), hash]
    );

    const tokens = issueTokens(rows[0].id);
    await saveRefreshToken(rows[0].id, tokens.refreshToken);

    console.log(`[auth] register: user=${rows[0].id}`);
    return res.status(201).json({ user: rows[0], ...tokens });

  } catch (e: any) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('[auth] register error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// POST /auth/login
// Rate limited — primary brute-force surface
//
// Security: bcrypt.compare runs even when user not found.
// This prevents timing attacks that reveal whether an email exists.
// Without this, not-found returns in ~1ms while wrong-password
// takes ~100ms (bcrypt cost) — a timing oracle.
// -------------------------------------------------------
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Select only needed columns — not SELECT *
    const { rows } = await pool.query<{
      id: string; username: string; email: string; password_hash: string;
    }>(
      'SELECT id, username, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // Always run bcrypt compare regardless of whether user was found
    const dummyHash = '$2b$12$invalidhashfortimingnormalization000000000000000000000';
    const hashToCompare = rows[0]?.password_hash ?? dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!rows[0] || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = issueTokens(rows[0].id);
    await saveRefreshToken(rows[0].id, tokens.refreshToken);

    console.log(`[auth] login: user=${rows[0].id}`);

    // Never return password_hash to the client
    return res.json({
      user: { id: rows[0].id, username: rows[0].username, email: rows[0].email },
      ...tokens,
    });

  } catch (e: any) {
    console.error('[auth] login error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// -------------------------------------------------------
// POST /auth/refresh
// Token family rotation — each refresh token is single-use.
// -------------------------------------------------------
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'refreshToken is required' });
    }

    // Verify signature first (fast, no DB hit) — rejects garbage tokens early
    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, config.refreshSecret) as { userId: string };
    } catch {
      return res.status(401).json({ error: 'Token invalid or expired' });
    }

    // Then check DB — catches already-rotated tokens
    const { rows } = await pool.query(
      'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );
    if (!rows[0]) {
      // Could indicate theft — token was already rotated
      console.warn(`[auth] refresh reuse attempt: user=${payload.userId}`);
      return res.status(401).json({ error: 'Token expired or already used' });
    }

    // Rotate: delete old, issue new
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    const tokens = issueTokens(payload.userId);
    await saveRefreshToken(payload.userId, tokens.refreshToken);

    return res.json(tokens);

  } catch (e: any) {
    console.error('[auth] refresh error:', e.message);
    return res.status(401).json({ error: 'Token invalid' });
  }
});

// -------------------------------------------------------
// POST /auth/logout
// Without this, logging out only clears client state.
// The refresh token stays valid for 7 days on the server.
// -------------------------------------------------------
router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken && typeof refreshToken === 'string') {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]).catch(() => {});
  }
  return res.json({ success: true });
});

// -------------------------------------------------------
// GET /auth/me — protected route
// -------------------------------------------------------
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, avatar_url, bio, district, xp, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: rows[0] });
  } catch (e: any) {
    console.error('[auth] /me error:', e.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
