'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { EnrollmentService } from '@/lib/enrollmentService';

export default function WeakSpotsPractice() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [practiceStats, setPracticeStats] = useState<any>(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadPracticeData();
    }
  }, [user, loading, router]);

  const loadPracticeData = async () => {
    if (!user) return;
    
    try {
      setLoadingData(true);
      
      // Get recent practice performance
      const performance = await EnrollmentService.getPracticePerformance(user.id, 50);
      setPracticeStats(performance);
      
      // Get questions user got wrong
      const incorrect = await EnrollmentService.getIncorrectQuestions(user.id, 20);
      setIncorrectQuestions(incorrect);
      
    } catch (error) {
      console.error('Error loading practice data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your practice data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Focus on Weak Spots</h1>
            <button
              onClick={() => router.push('/courses/maths')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Course
            </button>
          </div>
          <p className="text-gray-600">
            Practice questions you've previously gotten wrong to strengthen your weak areas
          </p>
        </div>

        {/* Practice Stats */}
        {practiceStats && (
          <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Your Practice Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{practiceStats.summary.total}</div>
                <div className="text-gray-600">Questions Attempted</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{practiceStats.summary.correct}</div>
                <div className="text-gray-600">Correct Answers</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{practiceStats.summary.accuracy}%</div>
                <div className="text-gray-600">Accuracy Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Weak Spots Practice */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Practice Your Weak Areas</h2>
          
          {incorrectQuestions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No weak spots found!</h3>
              <p className="text-gray-600 mb-6">
                You haven't gotten any questions wrong yet, or you need to complete more practice sessions.
              </p>
              <button
                onClick={() => router.push('/practice/bidmas')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start Regular Practice
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-6">
                You've gotten {incorrectQuestions.length} questions wrong recently. 
                Practice these areas to improve your accuracy.
              </p>
              
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-orange-600 font-semibold">Areas needing practice:</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    Based on your recent incorrect answers, focus on these question types.
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push('/practice/bidmas?mode=incorrect')}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Practice Incorrect Questions
                    </button>
                    <button
                      onClick={() => router.push('/practice/bidmas')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Mixed Practice
                    </button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-blue-600 font-semibold">Recent incorrect questions:</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last {Math.min(incorrectQuestions.length, 5)} questions you got wrong:
                  </div>
                  <ul className="mt-2 text-sm text-gray-700">
                    {incorrectQuestions.slice(0, 5).map((q, index) => (
                      <li key={index} className="py-1">
                        • Question ID: {q.questionId} ({new Date(q.lastAttempt).toLocaleDateString()})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}