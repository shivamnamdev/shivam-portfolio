'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, Lock, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { pythonCourseModules } from '@/data/learning-content';
import { supabase } from '@/lib/supabaseClient';

function formatYouTubeDuration(duration: string) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function CoursePlayerPage({ params }: { params: { slug: string } }) {
  const { user, isLoaded } = useUser();
  const [playlist, setPlaylist] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    async function loadCourseData() {
      if (!isLoaded || !user) return;

      try {
        // 1. Fetch YouTube Data
        const allVideoIds = pythonCourseModules.flatMap(m => m.videoIds);
        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${allVideoIds.join(',')}&key=${apiKey}`);
        const ytData = await ytRes.json();

        const ytDataMap: Record<string, any> = {};
        if (ytData.items) {
          ytData.items.forEach((item: any) => {
            ytDataMap[item.id] = { title: item.snippet.title, duration: formatYouTubeDuration(item.contentDetails.duration) };
          });
        }

        // 2. Fetch User Progress from Supabase
        const { data: progressData, error: progressError } = await supabase
          .from('video_progress')
          .select('video_id')
          .eq('user_id', user.id)
          .eq('course_slug', params.slug);

        if (progressError) throw progressError;
        
        // Create an array of completed video IDs
        const completedIds = progressData ? progressData.map(p => p.video_id) :[];
        setCompletedVideos(completedIds);

        // 3. Merge Data into Playlist
        const enrichedModules = pythonCourseModules.map((module) => ({
          moduleTitle: module.moduleTitle,
          videos: module.videoIds.map((id, index) => ({
            id: id,
            title: ytDataMap[id]?.title || `Lesson ${index + 1}`,
            duration: ytDataMap[id]?.duration || "--:--",
            youtubeId: id,
          }))
        }));

        setPlaylist(enrichedModules);
        if (enrichedModules.length > 0 && enrichedModules[0].videos.length > 0) {
          setActiveVideo(enrichedModules[0].videos[0]);
        }
      } catch (error) {
        console.error("Error loading course data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourseData();
  },[isLoaded, user, params.slug]);

  // Handle Marking a Video as Complete
  const markAsComplete = async () => {
    if (!user || !activeVideo || isMarking) return;
    setIsMarking(true);

    try {
      // Send the data to Supabase
      const { error } = await supabase
        .from('video_progress')
        .insert([{ 
          user_id: user.id, 
          course_slug: params.slug, 
          video_id: activeVideo.id 
        }]);

      if (error) throw error;

      // Instantly update the UI without reloading the page!
      setCompletedVideos(prev => [...prev, activeVideo.id]);
    } catch (error) {
      console.error("Error marking complete:", error);
      alert("Failed to mark as complete. Try again.");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading || !activeVideo) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Navbar />
        <div className="flex-grow flex items-center justify-center flex-col gap-4">
          <Loader2 className="animate-spin text-amber-500" size={48} />
          <p className="text-stone-500 font-medium">Loading your personalized curriculum...</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic progress percentage
  const totalVideos = playlist.flatMap(m => m.videos).length;
  const progressPercentage = Math.round((completedVideos.length / totalVideos) * 100) || 0;
  const isCurrentlyCompleted = completedVideos.includes(activeVideo.id);

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <Link href="/learning" className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-600 transition-colors mb-4 font-bold text-sm">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-black text-stone-900">Python Live Session for Beginners</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Player & Controls */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="w-full bg-black rounded-2xl overflow-hidden shadow-xl aspect-video border border-stone-200">
              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`} title={activeVideo.title} frameBorder="0" allowFullScreen></iframe>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-stone-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 mb-1">{activeVideo.title}</h2>
                  <p className="text-stone-500 text-sm">Instructor: Shivam Namdev</p>
                </div>
                
                {/* Dynamic Button State */}
                {isCurrentlyCompleted ? (
                  <button disabled className="px-6 py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center gap-2 border border-green-200 w-full sm:w-auto">
                    <CheckCircle size={18} /> Completed
                  </button>
                ) : (
                  <button onClick={markAsComplete} disabled={isMarking} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors w-full sm:w-auto shadow-md disabled:opacity-70">
                    {isMarking ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />} 
                    Mark as Complete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Playlist & Progress */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
            <div className="p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-black text-stone-900 text-lg">Course Progress</h3>
              <p className="text-stone-500 text-sm mt-1">{completedVideos.length}/{totalVideos} Lessons Completed ({progressPercentage}%)</p>
              
              {/* Dynamic Progress Bar */}
              <div className="w-full bg-stone-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow p-2">
              {playlist.map((module, mIdx) => (
                <div key={mIdx} className="mb-4">
                  <h4 className="px-3 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider">{module.moduleTitle}</h4>
                  <div className="flex flex-col gap-1">
                    {module.videos.map((video: any) => {
                      const isActive = activeVideo.id === video.id;
                      const isDone = completedVideos.includes(video.id);
                      return (
                        <button key={video.id} onClick={() => setActiveVideo(video)} className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-amber-50 border border-amber-200 shadow-sm' : 'hover:bg-stone-50 border border-transparent'}`}>
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone ? <CheckCircle size={16} className="text-green-500" /> : isActive ? <PlayCircle size={16} className="text-amber-500" /> : <Lock size={16} className="text-stone-300" />}
                          </div>
                          <div className="flex-grow pr-2">
                            <p className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-amber-700' : 'text-stone-700'} ${isDone && !isActive ? 'line-through opacity-70' : ''}`}>{video.title}</p>
                            <p className="text-xs text-stone-400 mt-1">{video.duration}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}