-- Add media support to chat messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', NULL));
