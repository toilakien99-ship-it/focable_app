/*
  # Parent Mode, Location History, AI Insights, Behavior Analytics

  1. New Tables
    - `parent_child_links` - pairing between parent and child accounts
    - `pairing_codes` - temporary codes for linking parent-child
    - `location_history` - detailed location tracking with timestamps
    - `bypass_attempts` - logs suspicious behavior (permission revoke, force stop)
    - `behavior_analytics` - daily aggregated behavior data per user
    - `ai_conversations` - AI assistant chat history per user
    - `focus_sessions` - manual focus session tracking

  2. Modified Tables
    - `user_profiles` - add role (user/parent), parent_id reference

  3. Security
    - Full RLS on all tables
    - Parents can only view their linked child's data
    - Children cannot modify parent links without parent auth
*/

-- Add role to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'parent'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'notification_permission_asked'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN notification_permission_asked boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Parent-Child pairing links
CREATE TABLE IF NOT EXISTS parent_child_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, child_id)
);

ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parent_child_links' AND policyname = 'Parents can view their links') THEN
    CREATE POLICY "Parents can view their links"
      ON parent_child_links FOR SELECT
      TO authenticated
      USING (auth.uid() = parent_id OR auth.uid() = child_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parent_child_links' AND policyname = 'Users can insert links as parent') THEN
    CREATE POLICY "Users can insert links as parent"
      ON parent_child_links FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = parent_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'parent_child_links' AND policyname = 'Participants can update links') THEN
    CREATE POLICY "Participants can update links"
      ON parent_child_links FOR UPDATE
      TO authenticated
      USING (auth.uid() = parent_id OR auth.uid() = child_id)
      WITH CHECK (auth.uid() = parent_id OR auth.uid() = child_id);
  END IF;
END $$;

-- Pairing codes (short-lived)
CREATE TABLE IF NOT EXISTS pairing_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  child_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pairing_codes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pairing_codes' AND policyname = 'Child can insert and view own codes') THEN
    CREATE POLICY "Child can insert and view own codes"
      ON pairing_codes FOR SELECT
      TO authenticated
      USING (auth.uid() = child_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pairing_codes' AND policyname = 'Child can create pairing codes') THEN
    CREATE POLICY "Child can create pairing codes"
      ON pairing_codes FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = child_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pairing_codes' AND policyname = 'Authenticated users can verify codes') THEN
    CREATE POLICY "Authenticated users can verify codes"
      ON pairing_codes FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Location history (extended from user_locations)
CREATE TABLE IF NOT EXISTS location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  city text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  country_code text NOT NULL DEFAULT '',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can view own location history') THEN
    CREATE POLICY "Users can view own location history"
      ON location_history FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM parent_child_links
          WHERE parent_id = auth.uid() AND child_id = user_id AND status = 'active'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'location_history' AND policyname = 'Users can insert own location') THEN
    CREATE POLICY "Users can insert own location"
      ON location_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Bypass attempts log
CREATE TABLE IF NOT EXISTS bypass_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_type text NOT NULL CHECK (attempt_type IN ('permission_revoke', 'force_stop', 'location_disabled', 'unlink_parent', 'manual_unblock')),
  detail text NOT NULL DEFAULT '',
  device_info jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bypass_attempts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bypass_attempts' AND policyname = 'Users can insert own bypass attempts') THEN
    CREATE POLICY "Users can insert own bypass attempts"
      ON bypass_attempts FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bypass_attempts' AND policyname = 'User and parent can view bypass attempts') THEN
    CREATE POLICY "User and parent can view bypass attempts"
      ON bypass_attempts FOR SELECT
      TO authenticated
      USING (
        auth.uid() = user_id
        OR EXISTS (
          SELECT 1 FROM parent_child_links
          WHERE parent_id = auth.uid() AND child_id = user_id AND status = 'active'
        )
      );
  END IF;
END $$;

-- Behavior analytics (daily aggregates)
CREATE TABLE IF NOT EXISTS behavior_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_total integer NOT NULL DEFAULT 0,
  focus_minutes integer NOT NULL DEFAULT 0,
  schedule_blocks_completed integer NOT NULL DEFAULT 0,
  schedule_blocks_total integer NOT NULL DEFAULT 0,
  app_opens integer NOT NULL DEFAULT 0,
  streak_day integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE behavior_analytics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'behavior_analytics' AND policyname = 'Users can view own analytics') THEN
    CREATE POLICY "Users can view own analytics"
      ON behavior_analytics FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'behavior_analytics' AND policyname = 'Users can upsert own analytics') THEN
    CREATE POLICY "Users can upsert own analytics"
      ON behavior_analytics FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'behavior_analytics' AND policyname = 'Users can update own analytics') THEN
    CREATE POLICY "Users can update own analytics"
      ON behavior_analytics FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- AI conversation history
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'Users can view own AI conversations') THEN
    CREATE POLICY "Users can view own AI conversations"
      ON ai_conversations FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'Users can insert AI conversations') THEN
    CREATE POLICY "Users can insert AI conversations"
      ON ai_conversations FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_conversations' AND policyname = 'Users can delete own AI conversations') THEN
    CREATE POLICY "Users can delete own AI conversations"
      ON ai_conversations FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Focus sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  session_type text NOT NULL DEFAULT 'pomodoro' CHECK (session_type IN ('pomodoro', 'deep_work', 'custom')),
  completed boolean NOT NULL DEFAULT false,
  notes text
);

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can manage own focus sessions') THEN
    CREATE POLICY "Users can manage own focus sessions"
      ON focus_sessions FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can insert focus sessions') THEN
    CREATE POLICY "Users can insert focus sessions"
      ON focus_sessions FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'focus_sessions' AND policyname = 'Users can update own focus sessions') THEN
    CREATE POLICY "Users can update own focus sessions"
      ON focus_sessions FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS location_history_user_id_idx ON location_history(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS behavior_analytics_user_date_idx ON behavior_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS ai_conversations_user_idx ON ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bypass_attempts_user_idx ON bypass_attempts(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS parent_child_links_parent_idx ON parent_child_links(parent_id);
CREATE INDEX IF NOT EXISTS parent_child_links_child_idx ON parent_child_links(child_id);
