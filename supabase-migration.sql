-- ============================================================
-- BuildOrSkip — Database Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add columns to votes table
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_type TEXT CHECK (vote_type IN ('build', 'skip')) NOT NULL DEFAULT 'build';
ALTER TABLE votes ADD COLUMN IF NOT EXISTS skip_reason TEXT CHECK (skip_reason IN ('market_small', 'already_exists', 'too_hard', 'no_monetization', 'other'));

-- 2. Add columns to ideas table
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS build_votes_count INT DEFAULT 0;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS skip_votes_count INT DEFAULT 0;

-- 3. Migrate existing votes count (if any)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ideas' AND column_name='votes_count') THEN
    UPDATE ideas SET build_votes_count = COALESCE(votes_count, 0) WHERE build_votes_count = 0;
  END IF;
END $$;

-- 4. Recreate the trigger function to manage dual votes
CREATE OR REPLACE FUNCTION public.update_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'build' THEN
      UPDATE ideas SET build_votes_count = build_votes_count + 1 WHERE id = NEW.idea_id;
    ELSE
      UPDATE ideas SET skip_votes_count = skip_votes_count + 1 WHERE id = NEW.idea_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'build' THEN
      UPDATE ideas SET build_votes_count = build_votes_count - 1 WHERE id = OLD.idea_id;
    ELSE
      UPDATE ideas SET skip_votes_count = skip_votes_count - 1 WHERE id = OLD.idea_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If they switched vote type (e.g. from build to skip or skip to build)
    IF OLD.vote_type = 'build' AND NEW.vote_type = 'skip' THEN
      UPDATE ideas SET 
        build_votes_count = build_votes_count - 1,
        skip_votes_count = skip_votes_count + 1
      WHERE id = NEW.idea_id;
    ELSIF OLD.vote_type = 'skip' AND NEW.vote_type = 'build' THEN
      UPDATE ideas SET 
        build_votes_count = build_votes_count + 1,
        skip_votes_count = skip_votes_count - 1
      WHERE id = NEW.idea_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ensure trigger is attached for UPDATE as well as INSERT/DELETE
DROP TRIGGER IF EXISTS on_vote_change ON votes;
CREATE TRIGGER on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_votes_count();

-- 6. Safely drop the old votes_count column if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ideas' AND column_name='votes_count') THEN
    ALTER TABLE ideas DROP COLUMN votes_count;
  END IF;
END $$;

-- 7. Add UPDATE policy on votes table (CRITICAL: enables switching votes between Build and Skip)
CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8. Create Polls Table (fixes cache/schema loading errors)
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_poll_per_idea UNIQUE(idea_id)
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Polls are viewable by everyone" ON polls FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create polls" ON polls FOR INSERT TO authenticated WITH CHECK (true);

-- 9. Create Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  votes_count INT DEFAULT 0
);

ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll options are viewable by everyone" ON poll_options FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create poll options" ON poll_options FOR INSERT TO authenticated WITH CHECK (true);

-- 10. Create Poll Votes Table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  poll_option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_vote UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poll votes are viewable by everyone" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can vote" ON poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 11. Create trigger to update votes_count on poll_options
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

