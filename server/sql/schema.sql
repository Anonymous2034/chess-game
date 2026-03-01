-- Grandmasters Chess — Self-Hosted PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  google_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player stats (one row per user, JSONB blob)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings (theme, coach tier, etc.)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game records
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  opponent TEXT,
  opponent_elo INTEGER,
  result TEXT,
  pgn TEXT,
  opening TEXT,
  player_color TEXT,
  move_count INTEGER,
  time_control INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coach chat history
CREATE TABLE IF NOT EXISTS coach_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  game_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament state
CREATE TABLE IF NOT EXISTS tournaments (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  data JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multiplayer games
CREATE TABLE IF NOT EXISTS multiplayer_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  host_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES users(id) ON DELETE SET NULL,
  host_color TEXT DEFAULT 'w',
  time_control INTEGER DEFAULT 0,
  increment INTEGER DEFAULT 0,
  status TEXT DEFAULT 'waiting',
  result TEXT,
  pgn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth columns (safe to re-run)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_chats_user_id ON coach_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_games_code ON multiplayer_games(code);
CREATE INDEX IF NOT EXISTS idx_mp_games_status ON multiplayer_games(status);
