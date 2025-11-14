'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { EnrollmentService } from '@/lib/enrollmentService';

interface Question {
  id: number;
  question: string;
  sectionId: number;
  sectionTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface Answer {
  id: number;
  question: string;
  answer: number | string;
  sectionId: number;
  sectionTitle: string;
}

interface QuestionSession {
  questionId: number;
  userAnswer: string;
  correctAnswer: string | number;
  isCorrect: boolean;
  timeSpent: number;
}

function BIDMASPracticeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'timed', 'incorrect', or null for normal
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [sessionData, setSessionData] = useState<QuestionSession[]>([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [totalQuestions] = useState(mode === 'timed' ? 20 : 10); // Timed mode has more questions
  
  // Timer state for timed challenges
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [timerStarted, setTimerStarted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadQuestionData();
    }
  }, [user, loading, router]);

  // Timer effect for timed challenges
  useEffect(() => {
    if (mode === 'timed' && timerStarted && timeRemaining > 0 && !sessionComplete) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up!
            setSessionComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [mode, timerStarted, timeRemaining, sessionComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const loadQuestionData = async () => {
    try {
      setLoadingData(true);
      
      // Load questions and answers
      const [questionsRes, answersRes] = await Promise.all([
        fetch('/data/maths/questions/001_BIDMAS_questions.json'),
        fetch('/data/maths/answers/001_BIDMAS_answers.json')
      ]);

      const questionsData = await questionsRes.json();
      const answersData = await answersRes.json();

      // Flatten questions and add difficulty/section info
      const allQuestions: Question[] = [];
      questionsData.sections.forEach((section: any) => {
        section.questions.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            question: q.question,
            sectionId: section.sectionId,
            sectionTitle: section.sectionTitle,
            difficulty: section.difficulty
          });
        });
      });

      // Sort questions by difficulty (Easy first, then Medium, then Hard)
      allQuestions.sort((a, b) => {
        const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
        if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        }
        return a.id - b.id; // Secondary sort by ID within same difficulty
      });

      // Select questions for practice (mix of difficulties, starting easier)
      const practiceQuestions = selectPracticeQuestions(allQuestions, totalQuestions);

      setQuestions(practiceQuestions);
      setAnswers(answersData.answers);
      setQuestionStartTime(Date.now());
      
      // Start timer for timed challenges
      if (mode === 'timed') {
        setTimerStarted(true);
      }
      
    } catch (error) {
      console.error('Error loading question data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const selectPracticeQuestions = (allQuestions: Question[], count: number): Question[] => {
    const easyQuestions = allQuestions.filter(q => q.difficulty === 'Easy');
    const mediumQuestions = allQuestions.filter(q => q.difficulty === 'Medium');
    const hardQuestions = allQuestions.filter(q => q.difficulty === 'Hard');

    const selected: Question[] = [];
    
    // Start with easier questions, gradually increase difficulty
    const easyCount = Math.min(Math.ceil(count * 0.4), easyQuestions.length); // 40% easy
    const mediumCount = Math.min(Math.ceil(count * 0.4), mediumQuestions.length); // 40% medium
    const hardCount = count - easyCount - mediumCount; // Remaining are hard

    // Randomly select from each difficulty level
    selected.push(...shuffleArray(easyQuestions).slice(0, easyCount));
    selected.push(...shuffleArray(mediumQuestions).slice(0, mediumCount));
    selected.push(...shuffleArray(hardQuestions).slice(0, Math.max(0, hardCount)));

    return selected;
  };

  const shuffleArray = (array: Question[]): Question[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getCurrentAnswer = () => {
    return answers.find(a => a.id === questions[currentQuestionIndex]?.id);
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) return;

    const currentAnswer = getCurrentAnswer();
    if (!currentAnswer) return;

    const timeSpent = Date.now() - questionStartTime;
    const correct = userAnswer.trim() === String(currentAnswer.answer);
    
    const sessionEntry: QuestionSession = {
      questionId: questions[currentQuestionIndex].id,
      userAnswer: userAnswer.trim(),
      correctAnswer: currentAnswer.answer,
      isCorrect: correct,
      timeSpent: Math.round(timeSpent / 1000) // Convert to seconds
    };

    setSessionData(prev => [...prev, sessionEntry]);
    setIsCorrect(correct);
    setShowResult(true);

    // Record in database for tracking
    recordQuestionAttempt(sessionEntry);
  };

  const recordQuestionAttempt = async (session: QuestionSession) => {
    if (!user) return;

    try {
      await EnrollmentService.recordQuestionAttempt(
        user.id,
        `bidmas-${session.questionId}`, // Use a consistent format for question IDs
        session.userAnswer,
        session.isCorrect,
        session.timeSpent
      );
    } catch (error) {
      console.error('Error recording question attempt:', error);
      // Don't block the UI if database save fails
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserAnswer('');
      setShowResult(false);
      setQuestionStartTime(Date.now());
    } else {
      setSessionComplete(true);
    }
  };

  const handleRetrySession = () => {
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setShowResult(false);
    setSessionData([]);
    setSessionComplete(false);
    setQuestionStartTime(Date.now());
    loadQuestionData(); // Load new random questions
  };

  const getSessionScore = () => {
    const correct = sessionData.filter(s => s.isCorrect).length;
    return { correct, total: sessionData.length };
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice questions...</p>
        </div>
      </div>
    );
  }

  if (sessionComplete) {
    const score = getSessionScore();
    const percentage = Math.round((score.correct / score.total) * 100);
    
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <div className={`text-6xl mb-4 ${percentage >= 70 ? 'text-green-500' : 'text-orange-500'}`}>
              {percentage >= 70 ? '🎉' : '💪'}
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              {mode === 'timed' ? 'Timed Challenge Complete!' : 'Session Complete!'}
            </h1>
            <div className="text-5xl font-bold mb-2">
              <span className={percentage >= 70 ? 'text-green-600' : 'text-orange-600'}>
                {score.correct}
              </span>
              <span className="text-gray-400">/{score.total}</span>
            </div>
            <p className="text-xl text-gray-600 mb-2">
              You got {percentage}% correct!
            </p>
            
            {mode === 'timed' && (
              <p className="text-lg text-gray-500 mb-4">
                Time used: {formatTime(15 * 60 - timeRemaining)} / 15:00
                {timeRemaining === 0 && <span className="text-red-600 ml-2">(Time's up!)</span>}
              </p>
            )}
            
            {percentage >= 70 ? (
              <p className="text-green-600 mb-6">Excellent work! You've mastered these concepts.</p>
            ) : (
              <p className="text-orange-600 mb-6">Good effort! Practice more to improve your accuracy.</p>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleRetrySession}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Practice Again
              </button>
              <button
                onClick={() => router.push('/courses/maths')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Course
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No questions available.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = getCurrentAnswer();
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              {mode === 'timed' ? 'Timed Challenge' : 'BIDMAS Practice'}
            </h1>
            <div className="flex items-center gap-4">
              {mode === 'timed' && (
                <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-600' : 
                  timeRemaining < 600 ? 'bg-orange-100 text-orange-600' : 
                  'bg-blue-100 text-blue-600'
                }`}>
                  ⏱️ {formatTime(timeRemaining)}
                </div>
              )}
              <span className="text-lg text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="text-sm text-gray-500 mb-2">
              {currentQuestion.sectionTitle} • {currentQuestion.difficulty}
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              {currentQuestion.question}
            </h2>
          </div>

          {!showResult ? (
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Your Answer:
                </label>
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                  className="w-full px-4 py-3 text-2xl text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  placeholder="Enter your answer..."
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="w-full px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answer
              </button>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className={`text-6xl ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isCorrect ? '✓' : '✗'}
              </div>
              
              <div className="space-y-2">
                <p className="text-lg">Your answer: <span className="font-mono font-bold">{userAnswer}</span></p>
                {!isCorrect && currentAnswer && (
                  <p className="text-lg">Correct answer: <span className="font-mono font-bold text-green-600">{currentAnswer.answer}</span></p>
                )}
              </div>

              <button
                onClick={handleNext}
                className="w-full px-6 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700 transition-colors"
              >
                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Session'}
              </button>
            </div>
          )}
        </div>

        {/* Session Progress */}
        {sessionData.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Session Progress: {sessionData.filter(s => s.isCorrect).length}/{sessionData.length} correct
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BIDMASPractice() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice questions...</p>
        </div>
      </div>
    }>
      <BIDMASPracticeContent />
    </Suspense>
  );
}