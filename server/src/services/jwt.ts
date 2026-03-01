import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { pool } from '../db';

interface AccessPayload {
  uid: string;
  email: string;
  isAdmin: boolean;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresInSeconds,
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, config.jwt.secret) as AccessPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInDays * 24 * 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, hash, expiresAt]
  );
}

export async function validateRefreshToken(token: string): Promise<string | null> {
  const hash = hashToken(token);
  const { rows } = await pool.query(
    'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()',
    [hash]
  );
  return rows[0]?.user_id || null;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const hash = hashToken(token);
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [hash]);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [userId]);
}
