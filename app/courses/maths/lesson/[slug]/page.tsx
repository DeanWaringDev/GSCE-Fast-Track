'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { EnrollmentService } from '@/lib/enrollmentService';

interface LessonPageProps {
  params: {
    slug: string;
  };
}

interface LessonData {
  id: number;
  number: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  topicsCovered: string[];
  prerequisites: number[];
}

interface LessonProgress {
  lessonId: number;
  instructionsCompleted: boolean;
  questionsAccuracy: number;
  lastAttempted: string;
  timeSpent: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

export default function LessonPage({ params }: LessonPageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [slug, setSlug] = useState<string>('');

  useEffect(() => {
    // Handle async params
    Promise.resolve(params).then((resolvedParams) => {
      setSlug(resolvedParams.slug);
    });
  }, [params]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && slug) {
      loadLessonData();
    }
  }, [user, loading, slug]);

  const loadLessonData = async () => {
    try {
      setLoadingData(true);

      // Load lesson data from lessons.json
      const response = await fetch('/data/maths/lessons.json');
      const data = await response.json();
      const lessonData = data.lessons.find((l: any) => l.slug === slug);
      
      if (!lessonData) {
        router.push('/courses/maths');
        return;
      }

      setLesson(lessonData);

      // Load progress data
      if (user) {
        try {
          const progressData = await EnrollmentService.getUserProgress(user.id, 'maths');
          const lessonProgress = progressData.find(p => p.lesson_id === lessonData.id);
          
          // Get user's question attempts to calculate actual accuracy
          const questionAttempts = await EnrollmentService.getUserQuestionAttempts(user.id, 'maths', 50);
          let accuracyRate = 0;
          
          if (questionAttempts && questionAttempts.length > 0) {
            const questionsCorrect = questionAttempts.filter(q => q.is_correct).length;
            accuracyRate = Math.round((questionsCorrect / questionAttempts.length) * 100);
          }
          
          if (lessonProgress) {
            setProgress({
              lessonId: lessonProgress.lesson_id,
              instructionsCompleted: lessonProgress.status === 'completed',
              questionsAccuracy: accuracyRate, // Use calculated accuracy from question attempts
              lastAttempted: lessonProgress.completed_at || '',
              timeSpent: lessonProgress.time_spent_minutes,
              status: lessonProgress.status === 'not_started' ? 'not-started' : 
                      lessonProgress.status === 'in_progress' ? 'in-progress' : 'completed'
            });
          } else {
            setProgress({
              lessonId: lessonData.id,
              instructionsCompleted: false,
              questionsAccuracy: accuracyRate, // Use calculated accuracy even for new lessons
              lastAttempted: '',
              timeSpent: 0,
              status: 'not-started'
            });
          }
        } catch (progressError) {
          console.error('Error loading progress data:', progressError);
          // Set default progress if there's an error
          setProgress({
            lessonId: lessonData.id,
            instructionsCompleted: false,
            questionsAccuracy: 0,
            lastAttempted: '',
            timeSpent: 0,
            status: 'not-started'
          });
        }
      }
    } catch (error) {
      console.error('Error loading lesson data:', error);
      router.push('/courses/maths');
    } finally {
      setLoadingData(false);
    }
  };

  const handleStartLesson = () => {
    if (lesson) {
      router.push(`/courses/maths/lesson/${lesson.slug}/instructions`);
    }
  };

  const handleStartQuestions = () => {
    if (lesson && progress?.instructionsCompleted) {
      // Route to the BIDMAS practice page for all lessons for now
      // Later we can make this dynamic based on lesson content
      router.push('/practice/bidmas');
    }
  };

  const handleStartTimedChallenge = () => {
    if (lesson && progress?.instructionsCompleted) {
      router.push('/practice/bidmas?mode=timed');
    }
  };

  const handleStartWeakSpots = () => {
    if (lesson && (progress?.questionsAccuracy || 0) > 0) {
      router.push('/practice/weak-spots');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/courses/maths')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Course
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Maths</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>Lesson {lesson.number}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lesson Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-gray-500">#{lesson.number}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  lesson.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                  lesson.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {lesson.difficulty}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
              <p className="text-gray-600">Category: {lesson.category}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{color: 'var(--primary)'}}>
                {progress?.questionsAccuracy || 0}%
              </div>
              <div className="text-sm text-gray-500">Best Score</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {lesson.estimatedMinutes} minutes
            </div>
            <div className="flex items-center gap-1">
              {progress?.instructionsCompleted ? (
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              Lesson {progress?.instructionsCompleted ? 'Complete' : 'Pending'}
            </div>
          </div>

          {/* Topics Covered */}
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Topics Covered:</h3>
            <div className="flex flex-wrap gap-2">
              {lesson.topicsCovered.map((topic, idx) => (
                <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Complete Lesson */}
          <div className="bg-white rounded-lg shadow-sm border p-6 flex flex-col">
            <div className="text-center mb-4 grow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Lesson</h3>
              <p className="text-sm text-gray-600 mb-4">
                Learn the concepts step-by-step through 7 interactive screens
              </p>
            </div>
            
            {progress?.instructionsCompleted ? (
              <button
                onClick={handleStartLesson}
                className="w-full bg-gray-100 text-gray-600 py-2 px-4 rounded-md font-medium transition-colors hover:bg-gray-200"
              >
                Review Lesson
              </button>
            ) : (
              <button
                onClick={handleStartLesson}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium transition-colors hover:bg-blue-700"
              >
                Start Learning
              </button>
            )}
          </div>

          {/* Practice Questions */}
          <div className="bg-white rounded-lg shadow-sm border p-6 relative flex flex-col">
            <div className="text-center mb-4 grow">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Practice Questions</h3>
              <p className="text-sm text-gray-600 mb-4">
                Adaptive practice with 10 questions that get harder as you improve
              </p>
            </div>
            
            <button
              onClick={handleStartQuestions}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors relative ${
                progress?.instructionsCompleted 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-green-400 text-green-100 cursor-not-allowed'
              }`}
              disabled={!progress?.instructionsCompleted}
            >
              {!progress?.instructionsCompleted && (
                <svg className="w-4 h-4 absolute top-2 right-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
              Start Practice
            </button>
          </div>

          {/* Timed Challenge */}
          <div className="bg-white rounded-lg shadow-sm border p-6 relative flex flex-col">
            <div className="text-center mb-4 grow">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Timed Challenge</h3>
              <p className="text-sm text-gray-600 mb-4">
                20 harder questions with a 15-minute timer. Test your speed!
              </p>
            </div>
            
            <button
              onClick={handleStartTimedChallenge}
              className={`w-full py-2 px-4 rounded-md font-medium transition-colors relative ${
                progress?.instructionsCompleted 
                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                  : 'bg-orange-400 text-orange-100 cursor-not-allowed'
              }`}
              disabled={!progress?.instructionsCompleted}
            >
              {!progress?.instructionsCompleted && (
                <svg className="w-4 h-4 absolute top-2 right-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
              Start Challenge
            </button>
          </div>

          {/* Weak Spots */}
          <div className="bg-white rounded-lg shadow-sm border p-6 relative flex flex-col">
            <div className="text-center mb-4 grow">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Weak Spots</h3>
              <p className="text-sm text-gray-600 mb-4">
                Focus on areas where your accuracy is below 80%
              </p>
            </div>
            
            <button
              onClick={handleStartWeakSpots}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors relative ${
                ((progress?.questionsAccuracy ?? 0) > 0 || progress?.status === 'completed') 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-red-400 text-red-100 cursor-not-allowed'
              }`}
              disabled={!((progress?.questionsAccuracy ?? 0) > 0 || progress?.status === 'completed')}
            >
              {!((progress?.questionsAccuracy ?? 0) > 0 || progress?.status === 'completed') && (
                <svg className="w-4 h-4 absolute top-2 right-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 0 1 6 0z" clipRule="evenodd" />
                </svg>
              )}
              {((progress?.questionsAccuracy ?? 0) > 0 || progress?.status === 'completed') ? 'Practice Weak Areas' : 'Practice Questions First'}
            </button>
          </div>
        </div>

        {/* Progress Summary */}
        {progress && progress.timeSpent > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h3>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{color: 'var(--primary)'}}>
                  {progress.timeSpent}
                </div>
                <div className="text-sm text-gray-600">Minutes Studied</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {progress.questionsAccuracy}%
                </div>
                <div className="text-sm text-gray-600">Best Accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {progress.status === 'completed' ? '100' : progress.status === 'in-progress' ? '50' : '0'}%
                </div>
                <div className="text-sm text-gray-600">Overall Progress</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}