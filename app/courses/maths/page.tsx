'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { EnrollmentService } from '@/lib/enrollmentService';

interface LessonProgress {
  lessonId: number;
  instructionsCompleted: boolean;
  questionsAccuracy: number; // Percentage accuracy for last 50 questions
  lastAttempted: string;
  timeSpent: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface Lesson {
  id: number;
  number: string;
  slug: string;
  title: string;
  category: string;
  tier: string;
  difficulty: string;
  isFree: boolean;
  estimatedMinutes: number;
  confidenceTarget: number;
  prerequisites: number[];
  topicsCovered: string[];
  contentReady: boolean;
}

interface CourseData {
  subject: string;
  totalLessons: number;
  freeLessons: number;
  estimatedCompletionWeeks: number;
  targetGrade: string;
  lessons: Lesson[];
}

export default function MathsCourse() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [lessonProgress, setLessonProgress] = useState<{ [key: number]: LessonProgress }>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTier, setSelectedTier] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    loadCourseData();
  }, [user, loading, router]);

  const loadCourseData = async () => {
    try {
      setLoadingData(true);
      
      // Load lesson data
      const response = await fetch('/data/maths/lessons.json');
      const data = await response.json();
      setCourseData(data);

      // Load real progress data if user is authenticated
      if (user) {
        try {
          const progress = await EnrollmentService.getUserProgress(user.id, 'maths');
          
          // Get user's question attempts to calculate overall accuracy
          const questionAttempts = await EnrollmentService.getUserQuestionAttempts(user.id, 'maths', 50);
          let overallAccuracy = 0;
          
          if (questionAttempts && questionAttempts.length > 0) {
            const questionsCorrect = questionAttempts.filter(q => q.is_correct).length;
            overallAccuracy = Math.round((questionsCorrect / questionAttempts.length) * 100);
          }
          
          // Convert progress array to lookup object
          const progressLookup: { [key: number]: LessonProgress } = {};
          progress.forEach(p => {
            progressLookup[p.lesson_id] = {
              lessonId: p.lesson_id,
              instructionsCompleted: p.status === 'completed',
              questionsAccuracy: overallAccuracy, // Use overall accuracy from question attempts
              lastAttempted: p.completed_at || '',
              timeSpent: p.time_spent_minutes,
              status: p.status === 'not_started' ? 'not-started' : 
                      p.status === 'in_progress' ? 'in-progress' : 'completed'
            };
          });
          
          // Ensure all lessons have progress entries
          data.lessons.forEach((lesson: Lesson) => {
            if (!progressLookup[lesson.id]) {
              progressLookup[lesson.id] = {
                lessonId: lesson.id,
                instructionsCompleted: false,
                questionsAccuracy: overallAccuracy, // Use overall accuracy even for new lessons
                lastAttempted: '',
                timeSpent: 0,
                status: 'not-started'
              };
            }
          });
          
          setLessonProgress(progressLookup);
        } catch (error) {
          console.error('Error loading progress:', error);
          // Try to get accuracy even if progress loading failed
          let fallbackAccuracy = 0;
          try {
            const questionAttempts = await EnrollmentService.getUserQuestionAttempts(user.id, 'maths', 50);
            if (questionAttempts && questionAttempts.length > 0) {
              const questionsCorrect = questionAttempts.filter(q => q.is_correct).length;
              fallbackAccuracy = Math.round((questionsCorrect / questionAttempts.length) * 100);
            }
          } catch (attemptError) {
            console.error('Error loading question attempts:', attemptError);
          }
          
          // Fallback to empty progress with accuracy
          const emptyProgress: { [key: number]: LessonProgress } = {};
          data.lessons.forEach((lesson: Lesson) => {
            emptyProgress[lesson.id] = {
              lessonId: lesson.id,
              instructionsCompleted: false,
              questionsAccuracy: fallbackAccuracy, // Use calculated accuracy even in fallback
              lastAttempted: '',
              timeSpent: 0,
              status: 'not-started'
            };
          });
          setLessonProgress(emptyProgress);
        }
      }

    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getCategories = () => {
    if (!courseData) return [];
    const categories = Array.from(new Set(courseData.lessons.map(lesson => lesson.category)));
    return ['All', ...categories];
  };

  const getTiers = () => {
    if (!courseData) return [];
    const tiers = Array.from(new Set(courseData.lessons.map(lesson => lesson.tier)));
    return ['All', ...tiers];
  };

  const filteredLessons = courseData?.lessons.filter(lesson => {
    const matchesCategory = selectedCategory === 'All' || lesson.category === selectedCategory;
    const matchesTier = selectedTier === 'All' || lesson.tier === selectedTier;
    const matchesSearch = lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.topicsCovered.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesTier && matchesSearch;
  }) || [];

  const handleLessonClick = async (lesson: Lesson) => {
    if (!user || !lesson.contentReady) return;
    
    // Check if lesson is locked by prerequisites
    const isLocked = lesson.prerequisites.length > 0 && 
                    !lesson.prerequisites.every(prereqId => 
                      lessonProgress[prereqId]?.status === 'completed'
                    );
    
    if (isLocked) return;

    // Mark lesson as in-progress if it's not started
    const currentProgress = lessonProgress[lesson.id];
    if (currentProgress?.status === 'not-started') {
      try {
        await EnrollmentService.updateLessonProgress(
          user.id,
          'maths',
          lesson.id,
          { 
            status: 'in_progress',
            lesson_slug: lesson.slug
          }
        );

        // Update local state
        setLessonProgress(prev => ({
          ...prev,
          [lesson.id]: {
            ...prev[lesson.id],
            status: 'in-progress'
          }
        }));
      } catch (error) {
        console.error('Error updating lesson progress:', error);
      }
    }

    // Navigate to lesson
    router.push(`/courses/maths/lesson/${lesson.slug}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>;
      case 'in-progress':
        return <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        </div>;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full"></div>;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !courseData) {
    return null;
  }

  const completedLessons = Object.values(lessonProgress).filter(p => p.status === 'completed').length;
  const averageAccuracy = Object.values(lessonProgress)
    .filter(p => p.questionsAccuracy > 0)
    .reduce((sum, p, _, arr) => sum + p.questionsAccuracy / arr.length, 0);

  return (
    <div className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--primary)'}}>
                {courseData.subject}
              </h1>
              <p className="text-gray-600">
                {completedLessons} of {courseData.totalLessons} lessons completed • 
                Average accuracy: {Math.round(averageAccuracy)}%
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{
                backgroundColor: 'var(--success)', 
                width: `${(completedLessons / courseData.totalLessons) * 100}%`
              }}
            ></div>
          </div>

          {/* Quick Practice Section */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6 border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Practice Questions</h3>
                <p className="text-gray-600">Test your knowledge with practice questions from BIDMAS</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/practice/weak-spots')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Focus on Weak Spots
                </button>
                <button
                  onClick={() => router.push('/practice/bidmas')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Practice
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Lessons</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or topic..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {getTiers().map(tier => (
                  <option key={tier} value={tier}>{tier}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Showing</label>
              <p className="text-lg font-semibold" style={{color: 'var(--secondary)'}}>
                {filteredLessons.length} lessons
              </p>
            </div>
          </div>
        </div>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLessons.map((lesson) => {
            const progress = lessonProgress[lesson.id];
            const isLocked = lesson.prerequisites.length > 0 && 
                            !lesson.prerequisites.every(prereqId => 
                              lessonProgress[prereqId]?.status === 'completed'
                            );

            return (
              <div
                key={lesson.id}
                className={`bg-white rounded-lg border p-4 transition-all duration-200 relative ${
                  isLocked 
                    ? 'opacity-60 cursor-not-allowed' 
                    : !lesson.contentReady
                    ? 'opacity-50 cursor-default'
                    : 'hover:shadow-lg cursor-pointer hover:border-blue-300'
                }`}
                onClick={() => handleLessonClick(lesson)}
              >
                {/* Content on the way stamp */}
                {!lesson.contentReady && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-semibold text-sm transform -rotate-12 shadow-lg">
                      Content on the way
                    </div>
                  </div>
                )}
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">#{lesson.number}</span>
                      {lesson.isFree && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          FREE
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold mb-1 line-clamp-2" style={{color: 'var(--primary)'}}>
                      {lesson.title}
                    </h3>
                  </div>
                  {getStatusIcon(progress?.status || 'not-started')}
                </div>

                {/* Details */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{lesson.category}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600">
                    <div className="flex items-center gap-1 mb-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {lesson.estimatedMinutes} min
                    </div>
                    
                    {lesson.topicsCovered.slice(0, 2).map((topic, idx) => (
                      <span key={idx} className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                        {topic}
                      </span>
                    ))}
                    {lesson.topicsCovered.length > 2 && (
                      <span className="text-gray-500 text-xs">+{lesson.topicsCovered.length - 2} more</span>
                    )}
                  </div>
                </div>

                {/* Progress Tracking */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Instructions Completed */}
                      <div className="flex items-center gap-1">
                        {lesson.contentReady && progress?.instructionsCompleted ? (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="text-xs text-gray-600">Read</span>
                      </div>
                    </div>

                    {/* Accuracy Score */}
                    <div className="text-right">
                      {lesson.contentReady && progress?.questionsAccuracy > 0 ? (
                        <>
                          <div className={`text-xs font-semibold ${
                            progress.questionsAccuracy >= 80 ? 'text-green-600' :
                            progress.questionsAccuracy >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {progress.questionsAccuracy}%
                          </div>
                          <div className="text-xs text-gray-500">accuracy</div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-gray-400">0%</div>
                          <div className="text-xs text-gray-500">accuracy</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Locked indicator */}
                  {isLocked && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      Complete prerequisites first
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredLessons.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 20.5a7.962 7.962 0 01-5.291-1.209m0 0A7.962 7.962 0 014.5 12a7.962 7.962 0 01-5.291-7.291M17 21a8.963 8.963 0 01-5-1.49 8.963 8.963 0 01-5 1.49" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}