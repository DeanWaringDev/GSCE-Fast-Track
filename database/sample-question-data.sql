-- Sample data for testing the question tracking system
-- Run this in your Supabase SQL editor after creating the main schema

-- Sample math questions for BIDMAS/Order of Operations
INSERT INTO questions (subject, topic, subtopic, lesson_id, question_type, difficulty_level, question_text, correct_answer, explanation, options, tags) VALUES
('Maths', 'BIDMAS', 'Basic Operations', 1, 'multiple_choice', 2, 'What is the result of: 5 + 3 × 2?', 'B', 'Following BIDMAS, multiplication comes before addition: 3 × 2 = 6, then 5 + 6 = 11', 
 '{"A": "16", "B": "11", "C": "10", "D": "13"}', 
 ARRAY['bidmas', 'order_of_operations', 'multiplication', 'addition']),

('Maths', 'BIDMAS', 'Brackets', 1, 'multiple_choice', 3, 'Calculate: (4 + 6) × 3 - 2', 'C', 'Brackets first: (4 + 6) = 10, then 10 × 3 = 30, finally 30 - 2 = 28', 
 '{"A": "26", "B": "32", "C": "28", "D": "30"}', 
 ARRAY['bidmas', 'brackets', 'multiplication', 'subtraction']),

('Maths', 'BIDMAS', 'Division and Multiplication', 1, 'multiple_choice', 3, 'What is: 24 ÷ 6 × 2?', 'B', 'Division and multiplication have equal priority, so work left to right: 24 ÷ 6 = 4, then 4 × 2 = 8', 
 '{"A": "2", "B": "8", "C": "12", "D": "6"}', 
 ARRAY['bidmas', 'division', 'multiplication', 'left_to_right']),

('Maths', 'BIDMAS', 'Complex Expressions', 1, 'multiple_choice', 4, 'Calculate: 2 + 3 × (8 - 5) ÷ 3', 'A', 'Step by step: (8-5) = 3, then 3 × 3 = 9, then 9 ÷ 3 = 3, finally 2 + 3 = 5', 
 '{"A": "5", "B": "7", "C": "9", "D": "11"}', 
 ARRAY['bidmas', 'brackets', 'multiplication', 'division', 'addition']),

('Maths', 'BIDMAS', 'Powers/Indices', 1, 'multiple_choice', 4, 'What is: 2 + 3² × 2?', 'C', 'Powers first: 3² = 9, then 9 × 2 = 18, finally 2 + 18 = 20', 
 '{"A": "25", "B": "14", "C": "20", "D": "18"}', 
 ARRAY['bidmas', 'powers', 'indices', 'multiplication', 'addition']),

-- Algebra questions
('Maths', 'Algebra', 'Basic Equations', 5, 'multiple_choice', 2, 'Solve: x + 5 = 12', 'B', 'Subtract 5 from both sides: x = 12 - 5 = 7', 
 '{"A": "5", "B": "7", "C": "17", "D": "12"}', 
 ARRAY['algebra', 'equations', 'solving']),

('Maths', 'Algebra', 'Substitution', 5, 'multiple_choice', 3, 'If x = 4, what is 3x - 2?', 'A', 'Substitute x = 4: 3(4) - 2 = 12 - 2 = 10', 
 '{"A": "10", "B": "14", "C": "8", "D": "6"}', 
 ARRAY['algebra', 'substitution', 'evaluation']),

-- Fractions questions
('Maths', 'Fractions', 'Addition', 8, 'multiple_choice', 3, 'What is 1/4 + 1/3?', 'C', 'Find common denominator: 3/12 + 4/12 = 7/12', 
 '{"A": "2/7", "B": "1/6", "C": "7/12", "D": "5/12"}', 
 ARRAY['fractions', 'addition', 'common_denominator']),

('Maths', 'Fractions', 'Multiplication', 8, 'multiple_choice', 2, 'Calculate: 2/3 × 3/4', 'B', 'Multiply numerators and denominators: (2×3)/(3×4) = 6/12 = 1/2', 
 '{"A": "5/7", "B": "1/2", "C": "6/12", "D": "2/3"}', 
 ARRAY['fractions', 'multiplication', 'simplification']),

('Maths', 'Fractions', 'Division', 8, 'multiple_choice', 4, 'What is 3/4 ÷ 1/2?', 'A', 'Multiply by the reciprocal: 3/4 × 2/1 = 6/4 = 3/2', 
 '{"A": "3/2", "B": "3/8", "C": "1/2", "D": "6/4"}', 
 ARRAY['fractions', 'division', 'reciprocal']);

-- Add some sample question attempts for testing (replace with actual user IDs)
-- INSERT INTO user_question_attempts (user_id, question_id, subject, user_answer, is_correct, time_taken_seconds) 
-- SELECT 
--   'your-user-id-here',  -- Replace with actual user ID
--   id,
--   subject,
--   CASE WHEN random() > 0.3 THEN correct_answer ELSE 'A' END, -- 70% chance of correct answer
--   CASE WHEN random() > 0.3 THEN true ELSE false END,
--   (random() * 120 + 30)::int  -- Random time between 30-150 seconds
-- FROM questions 
-- LIMIT 5;