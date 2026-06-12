-- ============================================================
-- SQL Migration for BuildOrSkip New Features
-- Run these statements in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- ============================================================

-- 1. Update ideas table for Decision Engine
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'validating' CHECK (status IN ('validating', 'building', 'skipped'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS decision_url TEXT;

-- 2. Create Polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Poll Options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes_count INT DEFAULT 0
);

-- 4. Create Poll Votes table (Unique user per poll)
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- 6. Create Security Policies
-- Polls Policies
DROP POLICY IF EXISTS "Polls are viewable by everyone" ON polls;
CREATE POLICY "Polls are viewable by everyone" ON polls
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated users can insert polls" ON polls;
CREATE POLICY "Only authenticated users can insert polls" ON polls
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM ideas 
      WHERE ideas.id = polls.idea_id AND ideas.user_id = auth.uid()
    )
  );

-- Poll Options Policies
DROP POLICY IF EXISTS "Poll options are viewable by everyone" ON poll_options;
CREATE POLICY "Poll options are viewable by everyone" ON poll_options
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only authenticated users can insert poll options" ON poll_options;
CREATE POLICY "Only authenticated users can insert poll options" ON poll_options
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      JOIN ideas ON polls.idea_id = ideas.id
      WHERE polls.id = poll_options.poll_id AND ideas.user_id = auth.uid()
    )
  );

-- Poll Votes Policies
DROP POLICY IF EXISTS "Poll votes are viewable by everyone" ON poll_votes;
CREATE POLICY "Poll votes are viewable by everyone" ON poll_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can cast poll votes" ON poll_votes;
CREATE POLICY "Authenticated users can cast poll votes" ON poll_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own poll votes" ON poll_votes;
CREATE POLICY "Users can delete their own poll votes" ON poll_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. Trigger to automatically update votes_count in poll_options
CREATE OR REPLACE FUNCTION public.update_poll_option_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.poll_option_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE poll_options SET votes_count = votes_count - 1 WHERE id = OLD.poll_option_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_poll_vote_change ON poll_votes;
CREATE TRIGGER on_poll_vote_change
  AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poll_option_votes_count();

-- ============================================================
-- 8. SETUP SUPABASE STORAGE BUCKET FOR AVATARS
-- ============================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable public select access to avatars
DROP POLICY IF EXISTS "Allow public avatar selection" ON storage.objects;
CREATE POLICY "Allow public avatar selection" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Enable authenticated upload of own avatars
DROP POLICY IF EXISTS "Allow authenticated avatar uploads" ON storage.objects;
CREATE POLICY "Allow authenticated avatar uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'avatars' 
    AND name LIKE auth.uid()::text || '%'
  );

-- Enable owner updates/deletes
DROP POLICY IF EXISTS "Allow owner avatar updates" ON storage.objects;
CREATE POLICY "Allow owner avatar updates" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'avatars' 
    AND name LIKE auth.uid()::text || '%'
  );

DROP POLICY IF EXISTS "Allow owner avatar deletes" ON storage.objects;
CREATE POLICY "Allow owner avatar deletes" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'avatars' 
    AND name LIKE auth.uid()::text || '%'
  );
