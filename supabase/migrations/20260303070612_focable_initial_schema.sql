
/*
  # Focable App - Initial Database Schema

  ## Overview
  Complete database schema for the Focable app including:

  ## New Tables
  1. `user_profiles` - Extended user information, tokens, settings
  2. `schedule_blocks` - Time-based schedule blocks (morning/afternoon/evening slots)
  3. `eisenhower_tasks` - Eisenhower matrix tasks for long-term goals
  4. `daily_task_pool` - Pool of 20 tasks to reduce phone usage
  5. `user_daily_tasks` - Daily tasks assigned to each user
  6. `user_weekly_tasks` - Weekly tasks assigned to each user
  7. `app_block_settings` - User app blocking configuration
  8. `block_unblock_requests` - Requests to temporarily unblock with email verification
  9. `token_transactions` - History of token earned/spent

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Encrypted fields for sensitive schedule data
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  avatar_url text DEFAULT '',
  tokens integer NOT NULL DEFAULT 0,
  total_tokens_earned integer NOT NULL DEFAULT 0,
  phone_usage_goal_hours integer NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Schedule blocks table (encrypted content)
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  start_time text NOT NULL,
  end_time text NOT NULL,
  activities_encrypted text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#794DDA',
  block_type text NOT NULL DEFAULT 'standard' CHECK (block_type IN ('standard', 'custom', 'none')),
  is_active boolean NOT NULL DEFAULT true,
  day_of_week integer[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule blocks"
  ON schedule_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule blocks"
  ON schedule_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule blocks"
  ON schedule_blocks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule blocks"
  ON schedule_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Eisenhower matrix tasks
CREATE TABLE IF NOT EXISTS eisenhower_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_encrypted text NOT NULL DEFAULT '',
  description_encrypted text NOT NULL DEFAULT '',
  quadrant integer NOT NULL CHECK (quadrant IN (1, 2, 3, 4)),
  is_completed boolean NOT NULL DEFAULT false,
  due_date date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE eisenhower_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own eisenhower tasks"
  ON eisenhower_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own eisenhower tasks"
  ON eisenhower_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own eisenhower tasks"
  ON eisenhower_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own eisenhower tasks"
  ON eisenhower_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Daily task pool (20 tasks to reduce phone usage)
CREATE TABLE IF NOT EXISTS daily_task_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  token_reward integer NOT NULL DEFAULT 10,
  category text NOT NULL DEFAULT 'mindfulness',
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE daily_task_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view task pool"
  ON daily_task_pool FOR SELECT
  TO authenticated
  USING (true);

-- Insert 20 daily tasks
INSERT INTO daily_task_pool (title, description, token_reward, category) VALUES
  ('Đọc sách 20 phút', 'Dành 20 phút đọc sách thay vì lướt mạng xã hội', 15, 'reading'),
  ('Thiền định 10 phút', 'Ngồi thiền im lặng 10 phút buổi sáng', 10, 'mindfulness'),
  ('Đi bộ 30 phút', 'Đi bộ ngoài trời không cầm điện thoại', 20, 'exercise'),
  ('Uống đủ 2 lít nước', 'Theo dõi lượng nước uống trong ngày', 10, 'health'),
  ('Viết nhật ký', 'Ghi lại suy nghĩ và cảm xúc trong ngày', 15, 'mindfulness'),
  ('Tập thể dục 15 phút', 'Thực hiện bài tập thể dục buổi sáng', 15, 'exercise'),
  ('Nấu ăn tại nhà', 'Tự nấu một bữa ăn không xem điện thoại', 20, 'lifestyle'),
  ('Gọi điện cho gia đình', 'Gọi điện thoại nói chuyện trực tiếp với người thân', 15, 'social'),
  ('Học từ vựng tiếng Anh', 'Học 10 từ vựng mới không qua app', 15, 'learning'),
  ('Dọn dẹp phòng', 'Dọn dẹp và sắp xếp không gian sống', 20, 'lifestyle'),
  ('Vẽ hoặc tô màu', 'Thư giãn bằng nghệ thuật thủ công', 15, 'creative'),
  ('Chăm sóc cây xanh', 'Tưới và chăm sóc cây trong nhà/ban công', 10, 'lifestyle'),
  ('Tắt điện thoại 1 tiếng', 'Để điện thoại sang một bên trong 1 tiếng', 25, 'digital_detox'),
  ('Ăn sáng không nhìn điện thoại', 'Thưởng thức bữa sáng hoàn toàn không nhìn màn hình', 15, 'mindfulness'),
  ('Tập yoga hoặc kéo giãn', 'Thực hiện 15 phút yoga hoặc bài kéo giãn', 15, 'exercise'),
  ('Nói chuyện trực tiếp', 'Gặp mặt và trò chuyện với bạn bè/đồng nghiệp', 20, 'social'),
  ('Hoàn thành việc chưa làm', 'Hoàn thành 1 công việc đã trì hoãn', 20, 'productivity'),
  ('Không dùng điện thoại trước ngủ', 'Tránh dùng điện thoại 1 tiếng trước khi ngủ', 20, 'digital_detox'),
  ('Nghe nhạc thư giãn', 'Lắng nghe âm nhạc không làm gì khác trong 20 phút', 10, 'mindfulness'),
  ('Tham gia hoạt động ngoài trời', 'Ra ngoài tận hưởng thiên nhiên ít nhất 30 phút', 25, 'exercise')
ON CONFLICT DO NOTHING;

-- User daily tasks (3 per day assigned randomly)
CREATE TABLE IF NOT EXISTS user_daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_pool_id uuid NOT NULL REFERENCES daily_task_pool(id),
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT NULL,
  tokens_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily tasks"
  ON user_daily_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tasks"
  ON user_daily_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tasks"
  ON user_daily_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User weekly tasks (3 per week)
CREATE TABLE IF NOT EXISTS user_weekly_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_pool_id uuid NOT NULL REFERENCES daily_task_pool(id),
  week_start date NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz DEFAULT NULL,
  tokens_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_weekly_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly tasks"
  ON user_weekly_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly tasks"
  ON user_weekly_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly tasks"
  ON user_weekly_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- App block settings
CREATE TABLE IF NOT EXISTS app_block_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allowed_apps jsonb NOT NULL DEFAULT '[]',
  block_enabled boolean NOT NULL DEFAULT false,
  block_mode text NOT NULL DEFAULT 'schedule' CHECK (block_mode IN ('schedule', 'always', 'off')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE app_block_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own block settings"
  ON app_block_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own block settings"
  ON app_block_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own block settings"
  ON app_block_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Block unblock requests (email verification)
CREATE TABLE IF NOT EXISTS block_unblock_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_code text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE block_unblock_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unblock requests"
  ON block_unblock_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unblock requests"
  ON block_unblock_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own unblock requests"
  ON block_unblock_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Token transactions
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'spent')),
  source text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token transactions"
  ON token_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token transactions"
  ON token_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user_id ON schedule_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_eisenhower_tasks_user_id ON eisenhower_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_daily_tasks_user_date ON user_daily_tasks(user_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_user_weekly_tasks_user_week ON user_weekly_tasks(user_id, week_start);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
