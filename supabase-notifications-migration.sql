-- ============================================================
-- BuildOrSkip — Notifications Schema & Follow Triggers
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'follow'
  read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Follow Notification Trigger Function
CREATE OR REPLACE FUNCTION handle_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Avoid notifying if self-follow (though database constraint prevents it anyway)
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO notifications (user_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on follows insert
DROP TRIGGER IF EXISTS on_follow_notification ON follows;
CREATE TRIGGER on_follow_notification
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_notification();

-- 5. Unfollow Notification Trigger Function (Cleanup)
CREATE OR REPLACE FUNCTION handle_unfollow_notification()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM notifications
  WHERE user_id = OLD.following_id AND actor_id = OLD.follower_id AND type = 'follow';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on follows delete
DROP TRIGGER IF EXISTS on_unfollow_notification ON follows;
CREATE TRIGGER on_unfollow_notification
  AFTER DELETE ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_unfollow_notification();
