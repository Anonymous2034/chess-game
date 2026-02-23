-- Grandmasters Chess Game — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Profiles table (auto-populated on signup via trigger)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  email text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Player stats (one row per user, JSON blob)
create table if not exists user_stats (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- User settings (theme, coach tier, etc.)
create table if not exists user_settings (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Game records
create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  opponent text,
  opponent_elo integer,
  result text,
  pgn text,
  opening text,
  player_color text,
  move_count integer,
  time_control integer,
  created_at timestamptz default now()
);

-- Coach chat history
create table if not exists coach_chats (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  messages jsonb default '[]'::jsonb,
  game_context jsonb,
  created_at timestamptz default now()
);

-- Tournament state
create table if not exists tournaments (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Migration tracking (prevents re-migrating localStorage data)
create table if not exists migrations (
  user_id uuid references auth.users on delete cascade primary key,
  migrated_at timestamptz default now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table profiles enable row level security;
alter table user_stats enable row level security;
alter table user_settings enable row level security;
alter table games enable row level security;
alter table coach_chats enable row level security;
alter table tournaments enable row level security;
alter table migrations enable row level security;

-- Profiles: users can read/update their own, admins can read all
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Stats
create policy "Users can manage own stats"
  on user_stats for all using (auth.uid() = user_id);

create policy "Admin can view all stats"
  on user_stats for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Settings
create policy "Users can manage own settings"
  on user_settings for all using (auth.uid() = user_id);

-- Games
create policy "Users can manage own games"
  on games for all using (auth.uid() = user_id);

create policy "Admin can view all games"
  on games for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Coach chats
create policy "Users can manage own chats"
  on coach_chats for all using (auth.uid() = user_id);

-- Tournaments
create policy "Users can manage own tournaments"
  on tournaments for all using (auth.uid() = user_id);

-- Migrations
create policy "Users can manage own migrations"
  on migrations for all using (auth.uid() = user_id);

-- ============================================
-- Auto-create profile on signup (trigger)
-- ============================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================
-- Indexes for performance
-- ============================================

create index if not exists idx_games_user_id on games(user_id);
create index if not exists idx_games_created_at on games(created_at desc);
create index if not exists idx_coach_chats_user_id on coach_chats(user_id);

-- ============================================
-- Multiplayer Games
-- ============================================

create table if not exists multiplayer_games (
  id uuid default gen_random_uuid() primary key,
  code text not null,
  host_id uuid references auth.users on delete set null,
  guest_id uuid references auth.users on delete set null,
  host_color text default 'w',
  time_control integer default 0,
  increment integer default 0,
  status text default 'waiting',  -- waiting, playing, finished
  result text,                    -- 1-0, 0-1, 1/2-1/2
  pgn text,
  created_at timestamptz default now()
);

alter table multiplayer_games enable row level security;

create policy "Users can insert multiplayer games"
  on multiplayer_games for insert with check (auth.uid() = host_id);

create policy "Players can view own multiplayer games"
  on multiplayer_games for select using (
    auth.uid() = host_id or auth.uid() = guest_id or status = 'waiting'
  );

create policy "Players can update own multiplayer games"
  on multiplayer_games for update using (
    auth.uid() = host_id or auth.uid() = guest_id
  );

create index if not exists idx_mp_games_code on multiplayer_games(code);
create index if not exists idx_mp_games_status on multiplayer_games(status);
