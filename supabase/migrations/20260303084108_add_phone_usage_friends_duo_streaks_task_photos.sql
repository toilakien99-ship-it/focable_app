
/*
  # Add phone usage tracking, friends system, duo streaks, and task photos

  ## New Tables
  1. `phone_usage_logs` - Manual daily phone usage entries per user
     - date, hours_used, user_id
  
  2. `friendships` - Friend connections between users
     - userId, friendId, status (pending/accepted/blocked)
  
  3. `duo_streaks` - Paired streak challenges between two friends
     - userAId, userBId, taskName, streakCount, status
  
  4. `duo_completions` - Daily completion records for duo streaks
     - duoStreakId, userId, completedAt, date
  
  5. `task_photos` - Photos taken when completing tasks
     - userId, taskId, taskName, imageUrl, date

  ## Updates
  - `user_profiles` gets `username` column for friend search
  - `daily_task_pool` gets new realistic everyday tasks
  - Custom tasks added to user_custom_tasks table
*/

-- Phone usage logs
CREATE TABLE IF NOT EXISTS phone_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  hours_used numeric(4,2) NOT NULL DEFAULT 0 CHECK (hours_used >= 0 AND hours_used <= 24),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE phone_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON phone_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON phone_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage logs"
  ON phone_usage_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_phone_usage_logs_user_date ON phone_usage_logs(user_id, log_date);

-- Add username to user_profiles for friend search
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text UNIQUE;
  END IF;
END $$;

-- Friendships
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert own friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they are part of"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);

-- Duo streaks
CREATE TABLE IF NOT EXISTS duo_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_name text NOT NULL DEFAULT '',
  streak_count integer NOT NULL DEFAULT 0,
  last_completed_date date DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'broken', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE duo_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their duo streaks"
  ON duo_streaks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can insert duo streaks"
  ON duo_streaks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_a_id);

CREATE POLICY "Users can update their duo streaks"
  ON duo_streaks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_a_id OR auth.uid() = user_b_id)
  WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Duo completions
CREATE TABLE IF NOT EXISTS duo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duo_streak_id uuid NOT NULL REFERENCES duo_streaks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_date date NOT NULL DEFAULT CURRENT_DATE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(duo_streak_id, user_id, completion_date)
);

ALTER TABLE duo_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view duo completions they are part of"
  ON duo_completions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM duo_streaks
      WHERE duo_streaks.id = duo_completions.duo_streak_id
        AND (duo_streaks.user_a_id = auth.uid() OR duo_streaks.user_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own duo completions"
  ON duo_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Task photos
CREATE TABLE IF NOT EXISTS task_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id uuid DEFAULT NULL,
  task_name text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  photo_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own task photos"
  ON task_photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Friends can view task photos"
  ON task_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND ((user_id = auth.uid() AND friend_id = task_photos.user_id)
          OR (friend_id = auth.uid() AND user_id = task_photos.user_id))
    )
  );

CREATE POLICY "Users can insert own task photos"
  ON task_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own task photos"
  ON task_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_task_photos_user_date ON task_photos(user_id, photo_date);

-- User custom tasks
CREATE TABLE IF NOT EXISTS user_custom_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'custom',
  token_reward integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_custom_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom tasks"
  ON user_custom_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom tasks"
  ON user_custom_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom tasks"
  ON user_custom_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom tasks"
  ON user_custom_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add new realistic everyday tasks to pool
INSERT INTO daily_task_pool (title, description, token_reward, category) VALUES
  ('Uống 1 ly nước sau khi thức dậy', 'Bắt đầu ngày mới với 1 ly nước đầy đủ ngay khi thức dậy', 10, 'health'),
  ('Không nhìn điện thoại 30 phút đầu ngày', 'Dành 30 phút đầu tiên trong ngày không chạm vào điện thoại', 20, 'digital_detox'),
  ('Lên kế hoạch 3 việc quan trọng hôm nay', 'Viết ra 3 nhiệm vụ ưu tiên cần hoàn thành trong ngày', 10, 'productivity'),
  ('Ăn sáng đầy đủ', 'Dành thời gian ăn sáng đúng giờ và đủ chất', 10, 'health'),
  ('Tập hít thở sâu 5 phút', 'Thực hiện bài tập thở 4-7-8 hoặc hít thở bụng sâu', 10, 'mindfulness'),
  ('Không ăn vặt sau 9 giờ tối', 'Kiểm soát việc ăn đêm để bảo vệ sức khỏe', 15, 'health'),
  ('Ngủ trước 12 giờ đêm', 'Đi ngủ trước nửa đêm để đảm bảo giấc ngủ đủ giờ', 15, 'health'),
  ('Nhắn tin hỏi thăm 1 người thân', 'Gửi tin nhắn hỏi thăm bố mẹ, anh chị em hoặc bạn bè', 10, 'social'),
  ('Cảm ơn hoặc khen ai đó thật lòng', 'Nói lời cảm ơn hoặc khen ngợi chân thành với một người', 10, 'social'),
  ('Viết 1 điều biết ơn trong ngày', 'Ghi lại một điều bạn cảm thấy biết ơn hôm nay', 10, 'mindfulness'),
  ('Không lướt mạng xã hội quá 1 tiếng', 'Giới hạn tổng thời gian mạng xã hội trong 60 phút', 20, 'digital_detox'),
  ('Dành 10 phút yên tĩnh cho bản thân', 'Ngồi im không làm gì, không điện thoại, chỉ nghỉ ngơi', 10, 'mindfulness'),
  ('Đi bộ hoặc vận động 20 phút', 'Vận động nhẹ ít nhất 20 phút trong ngày', 15, 'exercise'),
  ('Đọc sách ít nhất 15 phút', 'Đọc bất kỳ sách nào bạn thích, ít nhất 15 phút', 15, 'reading'),
  ('Học 5 từ mới (tiếng Anh hoặc khác)', 'Học 5 từ vựng mới trong bất kỳ ngôn ngữ nào', 10, 'learning')
ON CONFLICT DO NOTHING;
