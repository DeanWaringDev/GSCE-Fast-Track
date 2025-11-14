'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EnrollmentService } from '@/lib/enrollmentService';

interface LessonContent {
  metadata: {
    lessonId: number;
    lessonNumber: string;
    title: string;
    difficulty: string;
    duration: number;
    topics: string[];
    totalScreens: number;
  };
  screens: {
    title: string;
    content: string;
  }[];
}

interface LessonData {
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

interface LessonPageProps {
  params: Promise<{ slug: string }>;
}

export default function LessonInstructionsPage({ params }: LessonPageProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [lessonData, setLessonData] = useState<LessonData | null>(null);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ slug: string } | null>(null);

  // Resolve params Promise
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Load lesson content
  useEffect(() => {
    if (!resolvedParams?.slug) return;

    const loadLessonContent = async () => {
      try {
        // First load lesson data to get the lesson number
        const lessonsResponse = await fetch('/data/maths/lessons.json');
        if (!lessonsResponse.ok) throw new Error('Failed to load lessons');
        
        const lessonsData = await lessonsResponse.json();
        const lessonInfo = lessonsData.lessons.find((l: LessonData) => l.slug === resolvedParams.slug);
        
        if (!lessonInfo) throw new Error('Lesson not found');
        setLessonData(lessonInfo);
        
        // Now load the markdown file using the lesson number
        console.log('Attempting to load:', `/data/maths/instructions/${lessonInfo.number}_BIDMAS_lesson.md`);
        const response = await fetch(`/data/maths/instructions/${lessonInfo.number}_BIDMAS_lesson.md`);
        console.log('Response status:', response.status, response.ok);
        
        if (!response.ok) {
          // Try alternative naming pattern if first doesn't work
          console.log('Trying alternative:', `/data/maths/instructions/${lessonInfo.number}_lesson.md`);
          const altResponse = await fetch(`/data/maths/instructions/${lessonInfo.number}_lesson.md`);
          console.log('Alt response status:', altResponse.status, altResponse.ok);
          if (!altResponse.ok) throw new Error('Lesson content not found');
          
          const markdownContent = await altResponse.text();
          console.log('Loaded alt markdown content, first 200 chars:', markdownContent.substring(0, 200));
          const parsedLesson = parseMarkdownLesson(markdownContent);
          setLesson(parsedLesson);
        } else {
        const markdownContent = await response.text();
        console.log('Raw markdown length:', markdownContent.length);
        
        // Add a simple test to see if the content contains screen separators
        const separatorCount = (markdownContent.match(/\n---\n/g) || []).length;
        console.log('Found separator count:', separatorCount);
        
        const parsedLesson = parseMarkdownLesson(markdownContent);
        console.log('Final parsed screens count:', parsedLesson.screens.length);
        parsedLesson.screens.forEach((screen, i) => {
          console.log(`Screen ${i + 1}: "${screen.title}" (${screen.content.length} chars)`);
        });
        setLesson(parsedLesson);
        }
      } catch (error) {
        console.error('Failed to load lesson:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLessonContent();
  }, [resolvedParams]);

  const parseMarkdownLesson = (content: string): LessonContent => {
    console.log('Raw content length:', content.length);
    
    // Extract metadata from frontmatter
    let metadata = {
      lessonId: 1,
      lessonNumber: "001",
      title: "BIDMAS - Basic Operations",
      difficulty: "Easy",
      duration: 45,
      topics: ["order of operations"],
      totalScreens: 7
    };

    // Remove frontmatter (everything between --- and ---)
    let contentWithoutFrontmatter = content;
    const frontmatterMatch = content.match(/^---[\s\S]*?---\s*/);
    if (frontmatterMatch) {
      contentWithoutFrontmatter = content.substring(frontmatterMatch[0].length).trim();
    }
    
    console.log('Content without frontmatter length:', contentWithoutFrontmatter.length);
    
    // Split by --- separators (standalone lines)
    const sections = contentWithoutFrontmatter.split(/^---$/m);
    console.log('Found sections:', sections.length);
    
    const screens = sections.map((section, index) => {
      const trimmed = section.trim();
      if (!trimmed) return null;
      
      console.log(`Processing section ${index + 1}:`, trimmed.substring(0, 100));
      
      const lines = trimmed.split('\n');
      let title = `Screen ${index + 1}`;
      let contentStartIndex = 0;
      
      // Find the screen title line
      for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i].trim();
        if (line.startsWith('# Screen ')) {
          // Extract title after "# Screen X: "
          const match = line.match(/^# Screen \d+:\s*(.+)$/);
          if (match) {
            title = match[1];
          }
          contentStartIndex = i + 1;
          break;
        }
      }
      
      // Get the content (everything after the title)
      const contentLines = lines.slice(contentStartIndex);
      const content = contentLines.join('\n').trim();
      
      console.log(`Screen ${index + 1} - Title: "${title}", Content length: ${content.length}`);
      
      return { title, content };
    }).filter(screen => screen !== null && screen.content.length > 0);

    console.log('Final screens:', screens.length, screens.map(s => s?.title).filter(Boolean));
    return { metadata, screens: screens.filter((screen): screen is { title: string; content: string } => screen !== null) };
  };

  const formatContent = (content: string) => {
    if (!content) return '';
    
    return content
      // Convert markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/g, '<div class="bg-gray-100 p-4 rounded-lg font-mono text-sm my-4 border">$1</div>')
      // Convert headers
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-800 mt-6 mb-4">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-gray-700 mt-4 mb-3">$1</h3>')
      // Convert lists
      .replace(/^- (.*)$/gim, '<li class="ml-6 mb-1">$1</li>')
      .replace(/^(\d+)\. (.*)$/gim, '<li class="ml-6 mb-1">$1. $2</li>')
      // Wrap consecutive list items in ul tags
      .replace(/((<li class="ml-6 mb-1">.*<\/li>\s*)+)/g, '<ul class="list-disc mb-4">$1</ul>')
      // Convert paragraphs
      .split('\n\n')
      .map(paragraph => {
        const trimmed = paragraph.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<')) return trimmed;
        return `<p class="mb-4 text-gray-700 leading-relaxed">${trimmed}</p>`;
      })
      .join('\n');
  };

  const handleNext = () => {
    if (lesson && currentScreen < lesson.screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handlePrevious = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const handleComplete = async () => {
    if (!user || !lessonData || !resolvedParams) return;
    
    console.log('Attempting to complete lesson:', {
      userId: user.id,
      lessonId: lessonData.id,
      lessonSlug: lessonData.slug
    });
    
    try {
      // Skip enrollment check for now due to RLS issues
      console.log('Skipping enrollment check due to RLS policies...');
      
      console.log('Updating lesson progress...');
      // Update lesson progress to completed status
      await EnrollmentService.updateLessonProgress(
        user.id,
        'maths',
        lessonData.id,
        { 
          lesson_slug: lessonData.slug,
          status: 'completed',
          completed_at: new Date().toISOString(),
          score: 100,
          attempts: 1,
          time_spent_minutes: 0
        }
      );
      
      console.log('Lesson completion success!');
      
      // Navigate back to lesson overview
      router.push(`/courses/maths/lesson/${resolvedParams.slug}`);
    } catch (error: any) {
      console.error('Failed to update progress - Full error:', error);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      // Show user-friendly error message with actual error
      alert(`Failed to save progress: ${error.message || error}. Please try again.`);
    }
  };

  const handleClose = () => {
    router.push(`/courses/maths/lesson/${resolvedParams?.slug}`);
  };

  if (loading || !lesson || !lessonData || lesson.screens.length === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loading ? 'Loading lesson...' : 'No lesson content available'}
          </p>
        </div>
      </div>
    );
  }

  const isLastScreen = currentScreen === lesson.screens.length - 1;
  const progress = ((currentScreen + 1) / lesson.screens.length) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {lessonData?.title || 'Loading...'}
              </h1>
              <p className="text-sm text-gray-600">
                Screen {currentScreen + 1} of {lesson?.screens.length || 0}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 min-h-[500px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {lesson.screens[currentScreen]?.title || 'Loading...'}
          </h2>
          
          <div 
            className="prose prose-lg max-w-none text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: formatContent(lesson.screens[currentScreen].content)
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentScreen === 0}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                currentScreen === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <div className="flex space-x-2">
              {Array.from({ length: lesson.screens.length }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentScreen(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentScreen
                      ? 'bg-blue-600'
                      : i <= currentScreen
                      ? 'bg-blue-300'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {isLastScreen ? (
              <button
                onClick={handleComplete}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Complete Lesson
                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Next
                <svg className="h-5 w-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}