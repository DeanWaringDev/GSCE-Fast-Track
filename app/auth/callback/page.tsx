'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the current URL
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        
        if (code) {
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('Code exchange error:', error);
            setError('Failed to complete authentication. Please try again.');
          } else if (data.session) {
            // Successfully authenticated - redirect to dashboard
            router.push('/dashboard');
            return;
          }
        } else {
          // Check if we have a session already
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            // Already authenticated - redirect to dashboard
            router.push('/dashboard');
            return;
          } else {
            setError('No authentication code found. Please try the link again.');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during authentication.');
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-red-900">Confirmation Failed</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2 px-4 rounded-md text-white font-medium hover:opacity-90 transition-colors"
            style={{backgroundColor: 'var(--secondary)'}}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
}