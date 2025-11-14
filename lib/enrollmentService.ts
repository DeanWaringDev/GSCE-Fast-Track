import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export interface Enrollment {
  id: string;
  user_id: string;
  subject: string;
  enrolled_at: string;
  target_grade: string | null;
  target_tier?: string; // Foundation or Higher
  status: 'active' | 'paused' | 'completed';
}

export interface Progress {
  id: string;
  user_id: string;
  subject: string;
  lesson_id: number;
  lesson_slug: string;
  status: 'not_started' | 'in_progress' | 'completed';
  score: number | null;
  confidence_rating: number | null;
  time_spent_minutes: number;
  attempts: number;
  completed_at: string | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  date: string;
  total_minutes: number;
  lessons_completed: number;
  subjects_studied: string[];
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_type: string;
  subject: string | null;
  earned_at: string;
  data: any;
}

// New interfaces for question tracking
export interface Question {
  id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  lesson_id?: number;
  question_type: 'multiple_choice' | 'calculation' | 'true_false' | 'short_answer';
  difficulty_level: number;
  question_text: string;
  correct_answer: string;
  explanation?: string;
  options?: Record<string, string>;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface UserQuestionAttempt {
  id: string;
  user_id: string;
  question_id: string;
  subject: string;
  lesson_id?: number;
  user_answer: string;
  is_correct: boolean;
  time_taken_seconds?: number;
  attempt_number: number;
  hints_used: number;
  attempted_at: string;
  session_id?: string;
}

export interface WeakSpot {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  subtopic?: string;
  total_attempts: number;
  correct_attempts: number;
  accuracy_percentage: number;
  last_incorrect_at?: string;
  needs_practice: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeakSpotAnalysis {
  weakestTopics: Array<{
    topic: string;
    subtopic?: string;
    accuracy: number;
    totalQuestions: number;
    lastIncorrect: string;
  }>;
  questionsToRetry: Question[];
  improvementAreas: string[];
  practiceRecommendations: Array<{
    topic: string;
    difficulty: number;
    estimatedTime: number;
  }>;
}

export class EnrollmentService {
  // Enroll user in a subject
  static async enrollUser(user: User, subject: string, targetGrade?: string) {
    const { data, error } = await supabase
      .from('user_enrollments')
      .insert({
        user_id: user.id,
        subject: subject,
        target_grade: targetGrade || 'Grade 4 (Foundation)',
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize progress for first few lessons
    await this.initializeLessonsProgress(user.id, subject);
    
    return data;
  }

  // Get user's enrollments
  static async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    const { data, error } = await supabase
      .from('user_enrollments')
      .select('*')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Check if user is enrolled in a subject
  static async isUserEnrolled(userId: string, subject: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('status', 'active')
      .single();

    return !error && data !== null;
  }

  // Initialize lesson progress for a subject
  static async initializeLessonsProgress(userId: string, subject: string) {
    try {
      // Load lesson data
      const response = await fetch(`/data/${subject.toLowerCase()}/lessons.json`);
      const lessonData = await response.json();
      
      // Initialize progress for first 5 lessons (or all free lessons)
      const lessonsToInit = lessonData.lessons
        .filter((lesson: any) => lesson.isFree)
        .slice(0, 5);

      const progressEntries = lessonsToInit.map((lesson: any) => ({
        user_id: userId,
        subject: subject,
        lesson_id: lesson.id,
        lesson_slug: lesson.slug,
        status: 'not_started'
      }));

      const { error } = await supabase
        .from('user_progress')
        .insert(progressEntries);

      if (error) console.error('Error initializing progress:', error);
    } catch (error) {
      console.error('Error loading lesson data:', error);
    }
  }

  // Get user's progress for a subject
  static async getUserProgress(userId: string, subject: string): Promise<Progress[]> {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .order('lesson_id');

    if (error) throw error;
    return data || [];
  }

  // Update lesson progress
  static async updateLessonProgress(
    userId: string,
    subject: string,
    lessonId: number,
    updates: Partial<Progress>
  ) {
    // First try to find existing progress record
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('lesson_id', lessonId)
      .single();

    let result;
    
    if (existingProgress) {
      // Update existing record
      const { data, error } = await supabase
        .from('user_progress')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('subject', subject)
        .eq('lesson_id', lessonId)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          subject: subject,
          lesson_id: lessonId,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    // Update study session
    await this.updateStudySession(userId, updates.time_spent_minutes || 0);
    
    return result;
  }

  // Update or create today's study session
  static async updateStudySession(userId: string, minutesSpent: number) {
    const today = new Date().toISOString().split('T')[0];

    // First try to find existing session for today
    const { data: existingSession } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingSession) {
      // Update existing session
      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          total_minutes: existingSession.total_minutes + minutesSpent,
          lessons_completed: existingSession.lessons_completed + 1,
          session_end: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } else {
      // Insert new session
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          date: today,
          total_minutes: minutesSpent,
          lessons_completed: 1,
          session_start: new Date().toISOString(),
          session_end: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    }
  }

  // Get user's study streak
  static async getStudyStreak(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('date')
      .eq('user_id', userId)
      .gte('total_minutes', 10) // Minimum 10 minutes to count
      .order('date', { ascending: false })
      .limit(30);

    if (error) return 0;

    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasStudied = data?.some(session => session.date === dateStr);
      
      if (hasStudied) {
        streak++;
      } else if (i > 0) { // Allow for today to not be studied yet
        break;
      }
    }

    return streak;
  }

  // Get overall progress stats
  static async getProgressStats(userId: string, subject: string) {
    const progress = await this.getUserProgress(userId, subject);
    
    const totalLessons = progress.length;
    const completedLessons = progress.filter(p => p.status === 'completed').length;
    const inProgressLessons = progress.filter(p => p.status === 'in_progress').length;
    
    const totalTimeMinutes = progress.reduce((sum, p) => sum + p.time_spent_minutes, 0);
    const averageScore = progress
      .filter(p => p.score !== null)
      .reduce((sum, p, _, arr) => sum + (p.score || 0) / arr.length, 0);

    return {
      totalLessons,
      completedLessons,
      inProgressLessons,
      completionPercentage: Math.round((completedLessons / totalLessons) * 100),
      totalTimeHours: Math.round(totalTimeMinutes / 60 * 10) / 10,
      averageScore: Math.round(averageScore),
      predictedGrade: this.calculatePredictedGrade(averageScore, completedLessons, totalLessons)
    };
  }

  // Simple grade prediction algorithm
  private static calculatePredictedGrade(averageScore: number, completed: number, total: number): string {
    if (completed < 3) return 'Not enough data';
    
    const progressWeight = completed / total;
    const adjustedScore = averageScore * (0.7 + progressWeight * 0.3);
    
    if (adjustedScore >= 90) return 'Grade 9';
    if (adjustedScore >= 80) return 'Grade 8';
    if (adjustedScore >= 70) return 'Grade 7';
    if (adjustedScore >= 60) return 'Grade 6';
    if (adjustedScore >= 50) return 'Grade 5';
    if (adjustedScore >= 40) return 'Grade 4';
    if (adjustedScore >= 30) return 'Grade 3';
    if (adjustedScore >= 20) return 'Grade 2';
    return 'Grade 1';
  }

  // === SIMPLIFIED QUESTION TRACKING (JSON-based) ===

  // Record a user's answer to a practice question
  static async recordQuestionAttempt(
    userId: string,
    questionId: string,
    userAnswer: string,
    isCorrect: boolean,
    timeTakenSeconds?: number
  ): Promise<any> {
    // For now, just use the user_progress table to track practice sessions
    // We'll extend this later when we add proper question tracking tables
    
    // Create a unique lesson_slug for each attempt by including timestamp
    const timestamp = Date.now();
    const uniqueSlug = `practice-${questionId}-${timestamp}`;
    
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        subject: 'Maths',
        lesson_id: 999, // Use 999 for practice questions
        lesson_slug: uniqueSlug,
        status: isCorrect ? 'completed' : 'in_progress',
        score: isCorrect ? 100 : 0,
        time_spent_minutes: timeTakenSeconds ? Math.ceil(timeTakenSeconds / 60) : 1,
        attempts: 1,
        completed_at: isCorrect ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording question attempt:', error);
      // Don't throw error for practice sessions
      return null;
    }
    
    return data;
  };

  // Get user's recent practice performance (last 50 questions)
  static async getPracticePerformance(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_slug, score, completed_at, time_spent_minutes')
      .eq('user_id', userId)
      .eq('subject', 'Maths')
      .eq('lesson_id', 999) // Practice questions
      .like('lesson_slug', 'practice-%')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) return { recent: [], summary: { correct: 0, total: 0, accuracy: 0 } };

    const recent = data || [];
    const correct = recent.filter(r => r.score === 100).length;
    const total = recent.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    return {
      recent,
      summary: { correct, total, accuracy }
    };
  }

  // Get questions user got wrong for weak spot practice
  static async getIncorrectQuestions(userId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_slug, completed_at')
      .eq('user_id', userId)
      .eq('subject', 'Maths')
      .eq('lesson_id', 999) // Practice questions
      .eq('score', 0) // Incorrect answers
      .like('lesson_slug', 'practice-%')
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) return [];

    // Extract question IDs from lesson_slug (format: practice-bidmas-123)
    return (data || []).map(item => ({
      questionId: item.lesson_slug.replace('practice-', ''),
      lastAttempt: item.completed_at
    }));
  }

  // Get user's weak spots analysis
  static async getUserWeakSpots(userId: string, subject?: string): Promise<WeakSpot[]> {
    let query = supabase
      .from('user_weak_spots')
      .select('*')
      .eq('user_id', userId)
      .eq('needs_practice', true)
      .order('accuracy_percentage', { ascending: true });

    if (subject) {
      query = query.eq('subject', subject);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Generate comprehensive weak spots analysis
  static async getWeakSpotAnalysis(userId: string, subject: string): Promise<WeakSpotAnalysis> {
    // Get weak spots
    const weakSpots = await this.getUserWeakSpots(userId, subject);
    
    // Get questions user got wrong recently
    const { data: incorrectAttempts, error: attemptsError } = await supabase
      .from('user_question_attempts')
      .select(`
        *,
        questions!inner(*)
      `)
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('is_correct', false)
      .gte('attempted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('attempted_at', { ascending: false })
      .limit(20);

    if (attemptsError) throw attemptsError;

    // Extract unique questions for retry
    const questionsToRetry = incorrectAttempts
      ?.reduce((unique: Question[], attempt: any) => {
        const exists = unique.find(q => q.id === attempt.question_id);
        if (!exists) {
          unique.push(attempt.questions);
        }
        return unique;
      }, []) || [];

    // Generate improvement areas based on weak spots
    const improvementAreas = weakSpots
      .slice(0, 5) // Top 5 weakest areas
      .map(spot => spot.subtopic || spot.topic);

    // Generate practice recommendations
    const practiceRecommendations = weakSpots
      .slice(0, 3)
      .map(spot => ({
        topic: spot.topic,
        difficulty: Math.max(1, Math.ceil(spot.accuracy_percentage / 20)), // Lower accuracy = easier questions
        estimatedTime: Math.max(10, 30 - (spot.accuracy_percentage / 3)) // Worse accuracy = more time needed
      }));

    return {
      weakestTopics: weakSpots.slice(0, 10).map(spot => ({
        topic: spot.topic,
        subtopic: spot.subtopic,
        accuracy: spot.accuracy_percentage,
        totalQuestions: spot.total_attempts,
        lastIncorrect: spot.last_incorrect_at || 'Unknown'
      })),
      questionsToRetry,
      improvementAreas,
      practiceRecommendations
    };
  }

  // Get questions filtered by weak spots for targeted practice
  static async getWeakSpotQuestions(
    userId: string, 
    subject: string, 
    limit: number = 10
  ): Promise<Question[]> {
    const weakSpots = await this.getUserWeakSpots(userId, subject);
    
    if (weakSpots.length === 0) {
      // If no weak spots, return random questions of appropriate difficulty
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('subject', subject)
        .lte('difficulty_level', 3) // Medium difficulty
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    }

    // Get questions from user's weak topic areas
    const topics = [...new Set(weakSpots.map(spot => spot.topic))];
    const subtopics = [...new Set(weakSpots.map(spot => spot.subtopic).filter(Boolean))];

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('subject', subject)
      .or(`topic.in.(${topics.join(',')}),subtopic.in.(${subtopics.join(',')})`)
      .lte('difficulty_level', 4) // Don't overwhelm with hardest questions
      .order('difficulty_level', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Get user's question attempt history for a specific topic
  static async getTopicAttemptHistory(
    userId: string, 
    subject: string, 
    topic: string
  ): Promise<UserQuestionAttempt[]> {
    const { data, error } = await supabase
      .from('user_question_attempts')
      .select(`
        *,
        questions!inner(topic, subtopic, difficulty_level)
      `)
      .eq('user_id', userId)
      .eq('subject', subject)
      .eq('questions.topic', topic)
      .order('attempted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Calculate improvement metrics over time
  static async getImprovementMetrics(userId: string, subject: string, daysPast: number = 30) {
    const since = new Date(Date.now() - daysPast * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('user_question_attempts')
      .select('is_correct, attempted_at')
      .eq('user_id', userId)
      .eq('subject', subject)
      .gte('attempted_at', since)
      .order('attempted_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    // Calculate rolling accuracy over time
    const dailyStats = data.reduce((acc: any, attempt: any) => {
      const day = attempt.attempted_at.split('T')[0];
      if (!acc[day]) acc[day] = { correct: 0, total: 0 };
      acc[day].total++;
      if (attempt.is_correct) acc[day].correct++;
      return acc;
    }, {});

    const improvementData = Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
      date,
      accuracy: (stats.correct / stats.total) * 100,
      questionsAnswered: stats.total
    }));

    return {
      totalQuestions: data.length,
      overallAccuracy: (data.filter((a: any) => a.is_correct).length / data.length) * 100,
      dailyProgress: improvementData,
      isImproving: improvementData.length > 1 && 
        improvementData[improvementData.length - 1].accuracy > improvementData[0].accuracy
    };
  }
}