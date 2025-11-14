'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b relative">
      <nav className="px-4 xl:max-w-7xl xl:mx-auto">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              <Image 
                src="/images/logo-bar.svg" 
                alt="GCSE Fast Track Logo" 
                width={40} 
                height={40}
                className="h-10 w-10 sm:h-15 sm:w-15"
              />
              <div className="flex flex-col leading-tight sm:flex-row sm:space-x-1">
                <span className="text-base font-bold sm:text-2xl" style={{color: 'var(--primary)'}}>
                  GCSE
                </span>
                <span className="text-base font-bold sm:text-2xl" style={{color: 'var(--secondary)'}}>
                  FastTrack
                </span>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation - hidden on mobile, shown on md+ */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/dashboard" className="text-base font-medium hover:text-blue-600 transition-colors" style={{color: 'var(--text)'}}>
              Dashboard
            </Link>
            <Link href="/about" className="text-base font-medium hover:text-blue-600 transition-colors" style={{color: 'var(--text)'}}>
              About Us
            </Link>
            <Link href="/contact" className="text-base font-medium hover:text-blue-600 transition-colors" style={{color: 'var(--text)'}}>
              Contact Us
            </Link>
            <Link href="/help" className="text-base font-medium hover:text-blue-600 transition-colors" style={{color: 'var(--text)'}}>
              Help/FAQ
            </Link>
            
            {user ? (
              <Link href="/profile" className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-300 hover:bg-gray-400 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </Link>
            ) : (
              <Link 
                href="/login" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Login
              </Link>
            )}
          </div>
          
          {/* Mobile menu button - only shown on mobile */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors duration-200 md:hidden"
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center items-center relative">
              {isMenuOpen ? (
                // X icon
                <>
                  <span className="absolute block h-0.5 w-6 bg-gray-600 transform rotate-45 transition-transform duration-300"></span>
                  <span className="absolute block h-0.5 w-6 bg-gray-600 transform -rotate-45 transition-transform duration-300"></span>
                </>
              ) : (
                // Hamburger icon
                <div className="space-y-1">
                  <span className="block h-0.5 w-6 bg-gray-600 transition-all duration-300"></span>
                  <span className="block h-0.5 w-6 bg-gray-600 transition-all duration-300"></span>
                  <span className="block h-0.5 w-6 bg-gray-600 transition-all duration-300"></span>
                </div>
              )}
            </div>
          </button>
        </div>
        
        {/* Mobile dropdown menu - only shown on mobile */}
        <div className={`absolute left-0 right-0 top-full bg-white shadow-lg transform transition-all duration-300 ease-in-out z-50 rounded-b-lg mx-2 md:hidden ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}>
          <div className="py-3">
            <Link 
              href="/" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>
            <Link 
              href="/dashboard" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </Link>
            <Link 
              href="/profile" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </Link>
            
            <div className="flex items-center justify-center mx-4 my-3">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-xs text-gray-400 bg-white">INFO</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            
            <Link 
              href="/about" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About Us
            </Link>
            <Link 
              href="/contact" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Us
            </Link>
            <Link 
              href="/help" 
              className="flex items-center px-4 py-3 text-base font-medium hover:bg-blue-50 transition-colors duration-200 border-l-4 border-transparent hover:border-blue-500 rounded-r-md mx-2"
              style={{color: 'var(--text)'}}
              onClick={() => setIsMenuOpen(false)}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help/FAQ
            </Link>
            
            <div className="flex items-center justify-center mx-4 my-3">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-3 text-xs text-gray-400 bg-white">ACCOUNT</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            
            {user ? (
              <button 
                className="flex items-center w-full px-4 py-3 text-base font-medium hover:bg-red-50 transition-colors duration-200 border-l-4 border-transparent hover:border-red-500 text-red-600 rounded-r-md mx-2"
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            ) : (
              <Link 
                href="/login" 
                className="flex items-center px-4 py-3 text-base font-semibold hover:bg-green-50 transition-colors duration-200 border-l-4 border-transparent hover:border-green-500 text-green-700 rounded-r-md mx-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}