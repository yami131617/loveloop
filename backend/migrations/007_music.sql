-- Music library — curated royalty-free tracks, TikTok-style

CREATE TABLE IF NOT EXISTS music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  category TEXT NOT NULL,              -- chill, pop, hiphop, electronic, romantic, workout, viral, lofi, acoustic, cinematic
  mood TEXT,                           -- freeform tag (dreamy, upbeat, sad, energetic)
  duration_seconds INTEGER NOT NULL,
  url TEXT NOT NULL,                   -- streamable MP3 URL
  cover_gradient TEXT NOT NULL DEFAULT 'from-pink-400 to-purple-500',
  use_count INTEGER NOT NULL DEFAULT 0,
  is_trending BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_tracks_category ON music_tracks(category);
CREATE INDEX IF NOT EXISTS idx_music_tracks_trending ON music_tracks(is_trending, use_count DESC);
CREATE INDEX IF NOT EXISTS idx_music_tracks_title ON music_tracks(title);

-- Favorites
CREATE TABLE IF NOT EXISTS music_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, track_id)
);

-- Seed with curated tracks (Pixabay CDN — royalty-free, no attribution required)
-- These URLs are verified pixabay sample clips (they're stable, used as-is in many demos)
INSERT INTO music_tracks (title, artist, category, mood, duration_seconds, url, cover_gradient, use_count, is_trending, tags) VALUES
  -- LOFI / CHILL
  ('Lofi Drift',         'loopable',    'lofi',       'chill',       120, 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3', 'from-indigo-400 to-purple-500',   1240, TRUE,  ARRAY['lofi','study','chill']),
  ('Coffee Shop Jazz',   'audionautix', 'lofi',       'cozy',        180, 'https://cdn.pixabay.com/audio/2023/05/16/audio_a31d43d7f2.mp3', 'from-amber-400 to-orange-500',     890, FALSE, ARRAY['jazz','cafe','warm']),
  ('Rainy Window',       'loopable',    'lofi',       'melancholy',  150, 'https://cdn.pixabay.com/audio/2024/08/28/audio_b26beb0cef.mp3', 'from-slate-400 to-indigo-600',     765, FALSE, ARRAY['rain','sad','calm']),
  ('Starlit',            'audionautix', 'lofi',       'dreamy',      160, 'https://cdn.pixabay.com/audio/2022/01/18/audio_d1718ab41b.mp3', 'from-fuchsia-400 to-violet-600',   623, FALSE, ARRAY['dreamy','soft','ambient']),

  -- POP / UPBEAT
  ('Sunset Pop',         'audionautix', 'pop',        'upbeat',       90, 'https://cdn.pixabay.com/audio/2022/10/25/audio_3fb77ffba8.mp3', 'from-pink-400 to-rose-500',       2340, TRUE,  ARRAY['pop','summer','bright']),
  ('Neon Nights',        'loopable',    'pop',        'energetic',   110, 'https://cdn.pixabay.com/audio/2023/10/12/audio_2f4fa3e39f.mp3', 'from-pink-500 to-fuchsia-600',    1120, FALSE, ARRAY['party','neon','hype']),
  ('Good Vibes Only',    'audionautix', 'pop',        'happy',        95, 'https://cdn.pixabay.com/audio/2023/01/31/audio_d51b79c92a.mp3', 'from-yellow-400 to-pink-500',     987, FALSE, ARRAY['happy','summer','tropical']),
  ('Beach Day',          'loopable',    'pop',        'tropical',    120, 'https://cdn.pixabay.com/audio/2022/05/16/audio_1ed97e8c68.mp3', 'from-cyan-400 to-teal-500',       654, FALSE, ARRAY['beach','surf','summer']),

  -- ELECTRONIC / DANCE
  ('Neon Pulse',         'audionautix', 'electronic', 'dance',       140, 'https://cdn.pixabay.com/audio/2022/10/30/audio_347ab7afcc.mp3', 'from-cyan-400 to-blue-500',       1875, TRUE,  ARRAY['edm','dance','club']),
  ('Midnight Drive',     'loopable',    'electronic', 'nocturnal',   150, 'https://cdn.pixabay.com/audio/2022/08/03/audio_e34ed1f2d4.mp3', 'from-indigo-500 to-purple-700',   943, FALSE, ARRAY['synthwave','drive','retro']),
  ('Future Bass Drop',   'audionautix', 'electronic', 'hype',        130, 'https://cdn.pixabay.com/audio/2023/06/11/audio_36dadc1a9e.mp3', 'from-blue-500 to-purple-600',     712, FALSE, ARRAY['drop','bass','future']),

  -- HIP HOP / TRAP
  ('Trap Soul',          'audionautix', 'hiphop',     'smooth',      110, 'https://cdn.pixabay.com/audio/2023/09/05/audio_a77a8b5b02.mp3', 'from-rose-500 to-red-700',        1456, TRUE,  ARRAY['trap','rnb','smooth']),
  ('Flex Mode',          'loopable',    'hiphop',     'confident',   100, 'https://cdn.pixabay.com/audio/2023/03/13/audio_9ed99ac9e0.mp3', 'from-amber-500 to-red-600',       821, FALSE, ARRAY['flex','confidence','swag']),
  ('Lowrider',           'audionautix', 'hiphop',     'groovy',      120, 'https://cdn.pixabay.com/audio/2022/07/04/audio_e64a6a7ef7.mp3', 'from-orange-500 to-rose-600',     543, FALSE, ARRAY['groove','west-coast','cruise']),

  -- ROMANTIC / ACOUSTIC
  ('Golden Hour',        'audionautix', 'romantic',   'warm',        135, 'https://cdn.pixabay.com/audio/2022/03/15/audio_c8e3a84f6d.mp3', 'from-amber-400 to-orange-500',    1203, TRUE,  ARRAY['sunset','acoustic','romance']),
  ('First Kiss',         'loopable',    'romantic',   'tender',      110, 'https://cdn.pixabay.com/audio/2022/11/17/audio_cfbbfe4c69.mp3', 'from-pink-300 to-rose-400',       934, FALSE, ARRAY['love','soft','piano']),
  ('Acoustic Smile',     'audionautix', 'acoustic',   'happy',       100, 'https://cdn.pixabay.com/audio/2022/03/10/audio_e7fa2d4e0e.mp3', 'from-amber-300 to-yellow-500',    712, FALSE, ARRAY['acoustic','guitar','happy']),
  ('Sunset Ukulele',     'loopable',    'acoustic',   'breezy',      120, 'https://cdn.pixabay.com/audio/2022/05/24/audio_e44fc14d15.mp3', 'from-cyan-300 to-teal-400',       567, FALSE, ARRAY['ukulele','summer','uplifting']),

  -- WORKOUT
  ('Pump It',            'audionautix', 'workout',    'hype',         90, 'https://cdn.pixabay.com/audio/2023/02/28/audio_44e2e2e08a.mp3', 'from-rose-500 to-orange-500',     876, FALSE, ARRAY['gym','pump','motivation']),
  ('Run the World',      'loopable',    'workout',    'energetic',   140, 'https://cdn.pixabay.com/audio/2023/07/30/audio_46c0d0c68b.mp3', 'from-red-500 to-rose-700',        743, FALSE, ARRAY['run','cardio','fire']),

  -- VIRAL / MEMES
  ('Tik Tok Dance Beat', 'loopable',    'viral',      'catchy',       60, 'https://cdn.pixabay.com/audio/2023/05/08/audio_ac0bbc7b16.mp3', 'from-pink-400 to-yellow-400',    3210, TRUE,  ARRAY['viral','dance','trend']),
  ('POV Drop',           'audionautix', 'viral',      'dramatic',     45, 'https://cdn.pixabay.com/audio/2023/08/19/audio_f8b3ad15e8.mp3', 'from-violet-500 to-rose-500',    2134, TRUE,  ARRAY['pov','drop','cinematic']),
  ('Plot Twist',         'loopable',    'viral',      'suspense',     50, 'https://cdn.pixabay.com/audio/2023/04/22/audio_e5e2cc5e18.mp3', 'from-purple-600 to-black',       1445, FALSE, ARRAY['twist','suspense','reveal']),
  ('Slay Queen',         'audionautix', 'viral',      'confident',    55, 'https://cdn.pixabay.com/audio/2023/11/06/audio_9c17bbe0fe.mp3', 'from-pink-500 to-fuchsia-700',   1892, TRUE,  ARRAY['slay','queen','strut']),

  -- CINEMATIC
  ('Epic Rise',          'audionautix', 'cinematic',  'epic',        165, 'https://cdn.pixabay.com/audio/2022/10/14/audio_cf3d5e10b1.mp3', 'from-slate-700 to-black',        834, FALSE, ARRAY['cinematic','epic','build']),
  ('Hero Moment',        'loopable',    'cinematic',  'triumphant',  155, 'https://cdn.pixabay.com/audio/2023/02/12/audio_2b2c34a12f.mp3', 'from-amber-500 to-slate-800',    621, FALSE, ARRAY['hero','triumph','orchestral']),
  ('Dark Trailer',       'audionautix', 'cinematic',  'tense',       170, 'https://cdn.pixabay.com/audio/2023/06/25/audio_b56cd27e0c.mp3', 'from-zinc-700 to-black',         543, FALSE, ARRAY['trailer','dark','tense'])
ON CONFLICT DO NOTHING;
