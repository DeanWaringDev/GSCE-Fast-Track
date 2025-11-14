'use client';

import { useAuth } from '@/contexts/AuthContext';
import { EnrollmentService, Enrollment } from '@/lib/enrollmentService';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressStats, setProgressStats] = useState<any>({});
  const [studyStreak, setStudyStreak] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [unenrollConfirmText, setUnenrollConfirmText] = useState('');
  const [isUnenrolling, setIsUnenrolling] = useState(false);
  const [showGradeSettingsModal, setShowGradeSettingsModal] = useState(false);
  const [tempTargetTier, setTempTargetTier] = useState('Foundation');
  const [tempTargetGrade, setTempTargetGrade] = useState('Grade 5');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadUserData();
    }
  }, [user, loading, router]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoadingData(true);
      
      // Load real enrollments from database
      const enrollments = await EnrollmentService.getUserEnrollments(user.id);
      setEnrollments(enrollments);

      // Load real progress stats for each enrollment
      const stats: Record<string, any> = {};
      let totalStreak = 0;

      for (const enrollment of enrollments) {
        const progressArray = await EnrollmentService.getUserProgress(user.id, enrollment.subject);
        const streak = await EnrollmentService.getStudyStreak(user.id);
        
        // Calculate statistics from progress array
        const totalLessons = 100; // This should come from course metadata eventually
        
        // Separate lesson progress from practice questions
        const lessonProgress = progressArray.filter(p => p.lesson_id !== 999);
        const practiceProgress = progressArray.filter(p => p.lesson_id === 999);
        
        const completedLessons = lessonProgress.filter(p => p.status === 'completed').length;
        const inProgressLessons = lessonProgress.filter(p => p.status === 'in_progress').length;
        const completionPercentage = totalLessons > 0 
          ? Math.round((completedLessons / totalLessons) * 100) 
          : 0;
        
        // Calculate total time spent (lessons + practice)
        const totalTimeHours = progressArray.reduce((total, p) => total + (p.time_spent_minutes || 0), 0) / 60;
        
        // Calculate average score ONLY from practice questions, not lessons
        const practiceScoresWithValues = practiceProgress.filter(p => p.score !== null && p.score !== undefined);
        const averageScore = practiceScoresWithValues.length > 0 
          ? Math.round(practiceScoresWithValues.reduce((total, p) => total + (p.score || 0), 0) / practiceScoresWithValues.length)
          : 0;
        
        // Calculate questions statistics ONLY from practice questions
        const questionsAttempted = practiceProgress.reduce((total, p) => total + (p.attempts || 0), 0);
        const questionsCorrect = practiceProgress.filter(p => p.score === 100).length; // 100 = correct, 0 = incorrect
        const accuracyRate = questionsAttempted > 0 
          ? Math.round((questionsCorrect / questionsAttempted) * 100) 
          : 0;

        // Find most recent activity - use completed_at for completed lessons (not practice)
        const sortedLessonProgress = lessonProgress.sort((a, b) => {
          const aDate = a.completed_at ? new Date(a.completed_at) : new Date(0);
          const bDate = b.completed_at ? new Date(b.completed_at) : new Date(0);
          return bDate.getTime() - aDate.getTime();
        });
        const lastActivity = sortedLessonProgress.length > 0 && sortedLessonProgress[0].completed_at
          ? `${Math.ceil((Date.now() - new Date(sortedLessonProgress[0].completed_at).getTime()) / (1000 * 60 * 60))} hours ago`
          : 'No recent activity';

        // Calculate grade predictions based on actual performance
        const getGradePrediction = (accuracy: number, tier: 'Foundation' | 'Higher') => {
          if (questionsAttempted < 5) {
            // Not enough data yet - return minimum grades
            return tier === 'Foundation' ? 'Grade 1' : 'Grade 4';
          }
          
          if (tier === 'Foundation') {
            // Foundation tier: Grades 1-5 based on accuracy
            if (accuracy >= 85) return 'Grade 5';
            if (accuracy >= 70) return 'Grade 4';
            if (accuracy >= 55) return 'Grade 3';
            if (accuracy >= 40) return 'Grade 2';
            return 'Grade 1';
          } else {
            // Higher tier: Grades 4-9 based on accuracy
            if (accuracy >= 90) return 'Grade 9';
            if (accuracy >= 85) return 'Grade 8';
            if (accuracy >= 80) return 'Grade 7';
            if (accuracy >= 70) return 'Grade 6';
            if (accuracy >= 60) return 'Grade 5';
            return 'Grade 4';
          }
        };

        // Calculate confidence level based on practice volume and consistency
        const getConfidenceLevel = (questionsAttempted: number, accuracy: number): 'High' | 'Medium' | 'Low' => {
          if (questionsAttempted < 5) return 'Low';
          if (questionsAttempted >= 30 && accuracy >= 75) return 'High';
          if (questionsAttempted >= 15 && accuracy >= 60) return 'Medium';
          return 'Low';
        };

        stats[enrollment.subject] = {
          totalLessons,
          completedLessons,
          inProgressLessons,
          completionPercentage,
          totalTimeHours: Math.round(totalTimeHours * 10) / 10, // Round to 1 decimal
          averageScore,
          foundationPrediction: getGradePrediction(accuracyRate, 'Foundation'),
          higherPrediction: getGradePrediction(accuracyRate, 'Higher'),
          recommendedTier: enrollment.target_tier || (accuracyRate >= 70 ? 'Higher' : 'Foundation'),
          confidence: getConfidenceLevel(questionsAttempted, accuracyRate),
          recentActivity: lastActivity,
          weeklyGoal: 5,
          weeklyProgress: Math.min(Math.floor(totalTimeHours / 2), 5), // Estimate based on time spent
          nextLesson: completedLessons < totalLessons ? `Lesson ${completedLessons + 1}` : 'Course Complete',
          streak: streak || 0,
          questionsCorrect,
          questionsAttempted,
          accuracyRate
        };

        totalStreak = Math.max(totalStreak, streak || 0);
      }

      setProgressStats(stats);
      setStudyStreak(totalStreak);

    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to basic data if real data fails
      setEnrollments([]);
      setProgressStats({});
      setStudyStreak(0);
    } finally {
      setLoadingData(false);
    }
  };

  const handleUnenrollClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowUnenrollModal(true);
    setUnenrollConfirmText('');
  };

  const handleUnenrollConfirm = async () => {
    if (unenrollConfirmText.toLowerCase() !== 'unenroll' || !selectedEnrollment) {
      return;
    }

    setIsUnenrolling(true);
    try {
      // Mock unenroll - replace with real API call later
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove from enrollments
      setEnrollments(prev => prev.filter(e => e.id !== selectedEnrollment.id));
      
      // Remove from progress stats
      setProgressStats((prev: Record<string, any>) => {
        const newStats = { ...prev };
        delete newStats[selectedEnrollment.subject];
        return newStats;
      });
      
      // Close modal
      setShowUnenrollModal(false);
      setSelectedEnrollment(null);
      setUnenrollConfirmText('');
      
    } catch (error) {
      console.error('Error unenrolling:', error);
      alert('Failed to unenroll. Please try again.');
    } finally {
      setIsUnenrolling(false);
    }
  };

  const handleGradeSettingsClick = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setTempTargetTier(enrollment.target_tier || 'Foundation');
    setTempTargetGrade(enrollment.target_grade || (enrollment.target_tier === 'Foundation' ? 'Grade 5' : 'Grade 7'));
    setShowGradeSettingsModal(true);
  };

  const handleGradeSettingsSave = async () => {
    if (!selectedEnrollment) return;

    try {
      // Mock update - replace with real API call later
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update enrollments
      setEnrollments(prev => prev.map(e => 
        e.id === selectedEnrollment.id 
          ? { ...e, target_tier: tempTargetTier, target_grade: tempTargetGrade } as Enrollment
          : e
      ));
      
      setShowGradeSettingsModal(false);
      setSelectedEnrollment(null);
      
    } catch (error) {
      console.error('Error updating grade settings:', error);
      alert('Failed to update settings. Please try again.');
    }
  };

  const handleTierChange = (tier: string) => {
    setTempTargetTier(tier);
    // Auto-set appropriate default grade for tier
    setTempTargetGrade(tier === 'Foundation' ? 'Grade 5' : 'Grade 7');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--primary)'}}>
            Welcome to Your Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Hello {user.user_metadata?.username || user.email}! Ready to start your GCSE revision?
          </p>
        </div>

        {/* Enrolled Courses */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold" style={{color: 'var(--primary)'}}>
            Your Enrolled Courses
          </h2>
          
          <div className="space-y-6">
            {enrollments.map((enrollment) => {
              const stats = progressStats[enrollment.subject];
              return (
                <div key={enrollment.id} className="bg-white rounded-lg shadow-lg border p-8 hover:shadow-xl transition-shadow">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--primary)'}}>
                        {enrollment.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Target: {enrollment.target_tier} Tier - {enrollment.target_grade}</span>
                        <span>Last activity: {stats?.recentActivity}</span>
                        <button 
                          onClick={() => handleGradeSettingsClick(enrollment)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Change Target
                        </button>
                      </div>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                      {enrollment.status}
                    </span>
                  </div>
                  
                  {stats && (
                    <div className="space-y-6">
                      {/* Grade Prediction Section */}
                      <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                        <h4 className="font-semibold mb-3 text-gray-800">Grade Prediction & Recommendation</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Foundation Tier Prediction</p>
                            <p className="text-lg font-bold text-blue-600">{stats.foundationPrediction}</p>
                            <p className="text-xs text-gray-500">(Grades 1-5)</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Higher Tier Prediction</p>
                            <p className="text-lg font-bold text-purple-600">{stats.higherPrediction}</p>
                            <p className="text-xs text-gray-500">(Grades 4-9)</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 mb-1">Our Recommendation</p>
                            <p className="text-lg font-bold text-green-600">{stats.recommendedTier} Tier</p>
                            <p className="text-xs text-gray-500">Confidence: {stats.confidence}</p>
                          </div>
                        </div>
                        {stats.recommendedTier !== enrollment.target_tier && (
                          <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                            ⚠️ Based on your performance, we recommend switching to <strong>{stats.recommendedTier} Tier</strong> to maximize your grade potential.
                          </div>
                        )}
                      </div>

                      {/* Progress Bars */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Course Progress</span>
                            <span className="font-semibold">{stats.completionPercentage}% Complete</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                            <div 
                              className="h-3 rounded-full transition-all duration-500"
                              style={{backgroundColor: 'var(--success)', width: `${stats.completionPercentage}%`}}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">{stats.completedLessons} of {stats.totalLessons} lessons completed</p>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>Question Accuracy</span>
                            <span className="font-semibold">{stats.accuracyRate}% Correct</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
                            <div 
                              className="h-3 rounded-full transition-all duration-500"
                              style={{backgroundColor: stats.accuracyRate >= 75 ? 'var(--success)' : stats.accuracyRate >= 50 ? '#f59e0b' : '#ef4444', width: `${stats.accuracyRate}%`}}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500">{stats.questionsCorrect} of {stats.questionsAttempted} questions correct</p>
                        </div>
                      </div>

                      {/* Weekly Goal */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">This Week's Goal</span>
                          <span className="text-sm text-gray-600">{stats.weeklyProgress}/{stats.weeklyGoal} lessons</span>
                        </div>
                        <div className="w-full bg-gray-300 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{width: `${Math.min((stats.weeklyProgress / stats.weeklyGoal) * 100, 100)}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-blue-600">{stats.completedLessons}</p>
                          <p className="text-sm text-gray-600">Lessons Done</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-green-600">{stats.averageScore}%</p>
                          <p className="text-sm text-gray-600">Avg Score</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-purple-600">{stats.totalTimeHours}h</p>
                          <p className="text-sm text-gray-600">Time Spent</p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-3">
                          <p className="text-2xl font-bold text-orange-600">{stats.streak}</p>
                          <p className="text-sm text-gray-600">Day Streak</p>
                        </div>
                      </div>

                      {/* Next Lesson */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div>
                          <p className="text-sm text-gray-500">Up Next:</p>
                          <p className="font-semibold text-gray-800">{stats.nextLesson}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Current Target:</p>
                          <p className="font-bold" style={{color: 'var(--secondary)'}}>{enrollment.target_grade}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => router.push(`/courses/${enrollment.subject.toLowerCase()}`)}
                      className="flex-1 py-3 px-6 rounded-lg text-white font-medium hover:opacity-90 transition-opacity text-lg"
                      style={{backgroundColor: 'var(--secondary)'}}
                    >
                      Continue Learning →
                    </button>
                    <button
                      onClick={() => handleUnenrollClick(enrollment)}
                      className="px-6 py-3 text-red-600 hover:text-red-800 font-medium transition-colors"
                      title="Unenroll from course"
                    >
                      Unenroll
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Study Tools */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white rounded-lg p-4 border text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 3a1 1 0 012 0v5.5a.5.5 0 001 0V4a1 1 0 112 0v4.5a.5.5 0 001 0V6a1 1 0 112 0v6a1 1 0 01-1 1h-4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-semibold mb-1">Practice Quiz</h4>
              <p className="text-sm text-gray-600">Test your knowledge</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-semibold mb-1">Study Notes</h4>
              <p className="text-sm text-gray-600">Review key concepts</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 border text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="font-semibold mb-1">Exam Mode</h4>
              <p className="text-sm text-gray-600">Timed practice</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unenroll Confirmation Modal */}
      {showUnenrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Unenrollment</h3>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-3">
                Are you sure you want to unenroll from <strong>{selectedEnrollment?.subject}</strong>?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                <p className="text-yellow-800 text-sm">
                  ⚠️ <strong>Warning:</strong> This action will remove all your progress, scores, and study data for this subject.
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                To confirm, type <strong>"unenroll"</strong> below:
              </p>
              <input
                type="text"
                value={unenrollConfirmText}
                onChange={(e) => setUnenrollConfirmText(e.target.value)}
                placeholder="Type 'unenroll' to confirm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUnenrollModal(false);
                  setSelectedEnrollment(null);
                  setUnenrollConfirmText('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                disabled={isUnenrolling}
              >
                Cancel
              </button>
              <button
                onClick={handleUnenrollConfirm}
                disabled={unenrollConfirmText.toLowerCase() !== 'unenroll' || isUnenrolling}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUnenrolling ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Unenrolling...
                  </span>
                ) : (
                  'Unenroll'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Settings Modal */}
      {showGradeSettingsModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Grade Settings</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paper Tier</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTierChange('Foundation')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      tempTargetTier === 'Foundation'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Foundation
                    <div className="text-xs text-gray-500 mt-1">Grades 1-5</div>
                  </button>
                  <button
                    onClick={() => handleTierChange('Higher')}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      tempTargetTier === 'Higher'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    Higher
                    <div className="text-xs text-gray-500 mt-1">Grades 4-9</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Grade</label>
                <select
                  value={tempTargetGrade}
                  onChange={(e) => setTempTargetGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {tempTargetTier === 'Foundation' ? (
                    <>
                      <option value="Grade 1">Grade 1</option>
                      <option value="Grade 2">Grade 2</option>
                      <option value="Grade 3">Grade 3</option>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                    </>
                  ) : (
                    <>
                      <option value="Grade 4">Grade 4</option>
                      <option value="Grade 5">Grade 5</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                    </>
                  )}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-blue-800 text-sm">
                  💡 <strong>Tip:</strong> {tempTargetTier === 'Foundation' 
                    ? 'Foundation tier focuses on essential skills and is great for building confidence.' 
                    : 'Higher tier covers advanced topics and offers access to top grades 7-9.'}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGradeSettingsModal(false);
                  setSelectedEnrollment(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGradeSettingsSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}