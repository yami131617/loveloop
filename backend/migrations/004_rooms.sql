-- Public interest-based chat rooms

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  cover_gradient TEXT DEFAULT 'from-pink-400 to-purple-500',
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_public ON rooms(is_public, created_at DESC);

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'mod', 'owner')),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);

CREATE TABLE IF NOT EXISTS room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', NULL)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_messages_room ON room_messages(room_id, created_at DESC);

-- Seed interest rooms (idempotent via slug unique)
INSERT INTO rooms (slug, name, description, emoji, cover_gradient) VALUES
  ('late-night-vibes',  'Late Night Vibes',  'for the nocturnal souls — chill talks after midnight',                 '🌙', 'from-indigo-500 to-purple-700'),
  ('music-heads',       'Music Heads',        'drop a song, share a mood, find your playlist soulmate',               '🎧', 'from-pink-500 to-rose-600'),
  ('gamer-club',        'Gamer Club',         'duo queue, speedruns, controller rage — no shade, only W''s',          '🎮', 'from-cyan-400 to-blue-600'),
  ('foodie-corner',     'Foodie Corner',      'matcha lattes, ramen spots, aesthetic plates — eat together',           '🍜', 'from-amber-400 to-orange-600'),
  ('art-studio',        'Art Studio',         'sketch dumps, playlists we paint to, shared reference boards',          '🎨', 'from-fuchsia-500 to-violet-600'),
  ('fit-n-fine',        'Fit & Fine',         'gym pump, yoga flow, run streaks — motivate each other',                '💪', 'from-emerald-400 to-teal-600')
ON CONFLICT (slug) DO NOTHING;
