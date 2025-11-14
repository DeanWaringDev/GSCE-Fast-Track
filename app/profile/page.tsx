'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
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

  const displayName = user.user_metadata?.username || user.email;
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--primary)'}}>
            My Profile
          </h1>
          <p className="text-lg text-gray-600">
            Manage your account settings
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-md border p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mr-4" 
                 style={{backgroundColor: 'var(--primary)'}}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-semibold" style={{color: 'var(--primary)'}}>
                {displayName}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <p className="text-lg">{displayName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <p className="text-lg">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type
              </label>
              <p className="text-lg capitalize">
                {user.app_metadata?.provider || 'Email'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Since
              </label>
              <p className="text-lg">{joinedDate}</p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--primary)'}}>
              Account Actions
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full md:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full md:w-auto px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 ml-0 md:ml-4"
              >
                {isSigningOut ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing Out...
                  </span>
                ) : (
                  'Sign Out'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border">
          <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--primary)'}}>
            Your GCSE Progress
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--secondary)'}}>0</p>
              <p className="text-sm text-gray-600">Subjects Started</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--secondary)'}}>0</p>
              <p className="text-sm text-gray-600">Topics Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--secondary)'}}>0</p>
              <p className="text-sm text-gray-600">Practice Tests</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{color: 'var(--secondary)'}}>0</p>
              <p className="text-sm text-gray-600">Hours Studied</p>
            </div>
          </div>
          <p className="text-center text-gray-600 mt-4">
            Start your revision journey from the dashboard!
          </p>
        </div>
      </div>
    </div>
  );
}