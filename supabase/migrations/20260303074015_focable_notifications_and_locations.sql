
/*
  # Focable – Notifications & User Locations

  ## New Tables

  ### `notifications`
  Stores in-app notifications for each user, used by the real-time subscription system.
  - `id` – UUID primary key
  - `user_id` – reference to auth.users
  - `title` – notification heading
  - `body` – notification text
  - `type` – category (task_reminder | block_alert | achievement | system)
  - `is_read` – whether the user has seen it
  - `data` – optional JSON payload
  - `created_at`

  ### `user_locations`
  Stores the last known location for each user (reverse-geocoded).
  - `id` – UUID primary key
  - `user_id` – reference to auth.users
  - `latitude` / `longitude` – raw coordinates
  - `city`, `country`, `timezone` – reverse-geocoded fields
  - `recorded_at` – when location was captured

  ## Security
  - RLS enabled on both tables
  - Users can only access their own rows
*/

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'system'
    CHECK (type IN ('task_reminder', 'block_alert', 'achievement', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  city text DEFAULT '',
  district text DEFAULT '',
  country text DEFAULT '',
  country_code text DEFAULT '',
  timezone text DEFAULT '',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations"
  ON user_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own locations"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own locations"
  ON user_locations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add location columns to user_profiles for quick access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_city'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_city text DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_country'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_country text DEFAULT '';
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_user_locations_user
  ON user_locations(user_id, recorded_at DESC);

-- Enable Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
