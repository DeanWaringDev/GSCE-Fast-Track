-- Additional tables needed for question-level tracking and weak spots analysis

-- Store individual questions and their metadata
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject VARCHAR NOT NULL,
  topic VARCHAR NOT NULL,
  subtopic VARCHAR,
  lesson_id INTEGER,
  question_type VARCHAR NOT NULL, -- 'multiple_choice', 'calculation', 'true_false', etc.
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  options JSONB, -- For multiple choice: {"A": "option1", "B": "option2", ...}
  tags TEXT[], -- For categorizing: ['algebra', 'quadratic', 'factoring']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store every user's answer to every question
CREATE TABLE user_question_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  subject VARCHAR NOT NULL,
  lesson_id INTEGER,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  attempt_number INTEGER DEFAULT 1, -- If they retry the same question
  hints_used INTEGER DEFAULT 0,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES study_sessions(id)
);

-- Track which topics/subtopics users struggle with most
CREATE TABLE user_weak_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR NOT NULL,
  topic VARCHAR NOT NULL,
  subtopic VARCHAR,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) GENERATED ALWAYS AS 
    (CASE WHEN total_attempts > 0 THEN (correct_attempts::decimal / total_attempts * 100) ELSE 0 END) STORED,
  last_incorrect_at TIMESTAMPTZ,
  needs_practice BOOLEAN GENERATED ALWAYS AS (accuracy_percentage < 70) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subject, topic, subtopic)
);

-- Create indexes for performance
CREATE INDEX idx_user_question_attempts_user_correct ON user_question_attempts(user_id, is_correct);
CREATE INDEX idx_user_question_attempts_subject_topic ON user_question_attempts(subject, question_id);
CREATE INDEX idx_user_weak_spots_user_needs_practice ON user_weak_spots(user_id, needs_practice);
CREATE INDEX idx_questions_subject_topic ON questions(subject, topic, subtopic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty_level, subject);

-- Add RLS policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weak_spots ENABLE ROW LEVEL SECURITY;

-- Questions are readable by everyone (public question bank)
CREATE POLICY "Questions are publicly readable" ON questions FOR SELECT TO authenticated USING (true);

-- Users can only see their own question attempts
CREATE POLICY "Users can view own question attempts" ON user_question_attempts 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question attempts" ON user_question_attempts 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can only see their own weak spots
CREATE POLICY "Users can view own weak spots" ON user_weak_spots 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weak spots" ON user_weak_spots 
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Functions to automatically update weak spots when questions are answered
CREATE OR REPLACE FUNCTION update_user_weak_spots()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_weak_spots (user_id, subject, topic, subtopic, total_attempts, correct_attempts, last_incorrect_at)
  SELECT 
    NEW.user_id,
    q.subject,
    q.topic,
    q.subtopic,
    1,
    CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    CASE WHEN NOT NEW.is_correct THEN NEW.attempted_at ELSE NULL END
  FROM questions q WHERE q.id = NEW.question_id
  ON CONFLICT (user_id, subject, topic, subtopic) 
  DO UPDATE SET
    total_attempts = user_weak_spots.total_attempts + 1,
    correct_attempts = user_weak_spots.correct_attempts + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
    last_incorrect_at = CASE WHEN NOT NEW.is_correct THEN NEW.attempted_at ELSE user_weak_spots.last_incorrect_at END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_weak_spots
  AFTER INSERT ON user_question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_weak_spots();