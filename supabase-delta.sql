-- ============================================================
-- BuildOrSkip — Database Delta Migration (Part 2)
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add UPDATE policy on votes table (Enables switching votes)
DROP POLICY IF EXISTS "Users can update their own votes" ON votes;
CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create Polls Table
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_poll_per_idea UNIQUE(idea_id)
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Polls are viewable by everyone" ON polls;
CREATE POLICY "Polls are viewable by everyone" ON polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create polls" ON polls;
CREATE POLICY "Authenticated users can create polls" ON polls FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Create Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes_count INT DEFAULT 0
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poll options are viewable by everyone" ON poll_options;
CREATE POLICY "Poll options are viewable by everyone" ON poll_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create poll options" ON poll_options;
CREATE POLICY "Authenticated users can create poll options" ON poll_options FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Create Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Poll votes are viewable by everyone" ON poll_votes;
CREATE POLICY "Poll votes are viewable by everyone" ON poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote" ON poll_votes;
CREATE POLICY "Authenticated users can vote" ON poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 5. Create trigger to update votes_count on poll_options
CREATE OR REPLACE FUNCTION public.update_poll_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE poll_options SET votes_count = votes_count + 1 WHERE id = NEW.poll_option_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_poll_vote_inserted ON poll_votes;
CREATE TRIGGER on_poll_vote_inserted
  AFTER INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poll_votes_count();
