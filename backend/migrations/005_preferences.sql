-- User preferences (notifications, privacy, discover filters) — JSON blob per user

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications JSONB NOT NULL DEFAULT '{"match":true,"message":true,"comment":true,"like":true,"follow":true,"push":true,"email":false}',
  privacy JSONB NOT NULL DEFAULT '{"discoverable":true,"show_age":true,"show_distance":true,"show_online":true,"read_receipts":true}',
  discover JSONB NOT NULL DEFAULT '{"age_min":18,"age_max":40,"gender":"any","max_distance_km":50}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create pref row when user is created
CREATE OR REPLACE FUNCTION create_default_prefs() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_preferences (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_create_prefs ON users;
CREATE TRIGGER users_create_prefs AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_prefs();

-- Backfill for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users WHERE NOT EXISTS (SELECT 1 FROM user_preferences WHERE user_id = users.id);
