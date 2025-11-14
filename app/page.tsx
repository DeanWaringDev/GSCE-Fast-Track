'use client';

import { useAuth } from '@/contexts/AuthContext';
import { EnrollmentService } from '@/lib/enrollmentService';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrollingSubject, setEnrollingSubject] = useState<string | null>(null);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserEnrollments();
    } else {
      setLoadingEnrollments(false);
    }
  }, [user]);

  const loadUserEnrollments = async () => {
    if (!user) return;
    
    try {
      const enrollments = await EnrollmentService.getUserEnrollments(user.id);
      const subjects = enrollments.map(e => e.subject);
      setEnrolledSubjects(subjects);
    } catch (error) {
      console.error('Error loading enrollments:', error);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const subjects = [
    'Maths',
    'Computer Science',
    'Biology',
    'Chemistry',
    'Physics',
    'English Language',
    'English Literature',
    'Geography',
    'History',
    'French'
  ];

  const handleEnroll = async (subject: string) => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/login?redirect=${encodeURIComponent(`/?enroll=${subject}`)}`);
      return;
    }

    // If already enrolled, go to course/dashboard
    if (enrolledSubjects.includes(subject)) {
      if (subject === 'Maths') {
        router.push('/courses/maths');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    setEnrollingSubject(subject);

    try {
      await EnrollmentService.enrollUser(user, subject);
      
      // Update local state
      setEnrolledSubjects(prev => [...prev, subject]);
      
      // Redirect to course or dashboard
      if (subject === 'Maths') {
        router.push('/courses/maths');
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('Enrollment failed:', error);
      
      // Check if error is due to already being enrolled
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        // Already enrolled, just redirect
        router.push('/dashboard');
      } else {
        alert('Failed to enroll. Please try again.');
      }
    } finally {
      setEnrollingSubject(null);
    }
  };

  const getButtonText = (subject: string) => {
    if (enrollingSubject === subject) {
      return (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Enrolling...
        </span>
      );
    }
    
    if (subject !== 'Maths') {
      return 'Coming Soon';
    }
    
    if (enrolledSubjects.includes(subject)) {
      return 'Study';
    }
    
    return 'Enroll';
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="py-20 px-4" style={{backgroundColor: 'var(--primary)'}}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h1 className="text-5xl font-bold mb-6">
            GCSE Fast Track
          </h1>
          <p className="text-xl mb-8">
            Your complete revision guide for GCSE success
          </p>
          <button 
            className="px-8 py-3 text-lg font-semibold rounded-lg hover:opacity-90 transition-opacity"
            style={{backgroundColor: 'var(--secondary)'}}
          >
            Start Learning
          </button>
        </div>
      </section>

      {/* Subjects Cards */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12" style={{color: 'var(--text)'}}>
            Choose Your Subject
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {subjects.map((subject) => (
              <div 
                key={subject}
                className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow cursor-pointer relative"
              >
                {/* Coming Soon stamp for all subjects except Maths */}
                {subject !== 'Maths' && (
                  <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full transform rotate-12 shadow-md">
                    COMING SOON
                  </div>
                )}
                
                <h3 className="text-lg font-semibold mb-3" style={{color: 'var(--primary)'}}>
                  {subject}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Comprehensive revision materials and practice questions
                </p>
                <button 
                  onClick={() => handleEnroll(subject)}
                  disabled={subject !== 'Maths' || enrollingSubject === subject || loadingEnrollments}
                  className={`w-full py-2 px-4 rounded text-white font-medium transition-opacity ${
                    subject !== 'Maths' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                  style={{backgroundColor: 'var(--secondary)'}}
                >
                  {getButtonText(subject)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
