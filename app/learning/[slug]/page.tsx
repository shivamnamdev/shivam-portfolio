'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, Lock, ChevronLeft, Loader2, Clock, MessageCircle, AlignLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';
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
  
  // NEW STATES FOR TABS & COMMENTS
  const [activeTab, setActiveTab] = useState<'description' | 'qa'>('description');
  const [comments, setComments] = useState<any[]>([]);
  const[newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const courseDetails = activeCourses.find(c => c.slug === params.slug);

  // 1. Fetch Course Data & YouTube Descriptions
  useEffect(() => {
    async function loadCourseData() {
      if (!isLoaded || !user) return;
      try {
        const courseModules = courseCurriculumMap[params.slug] ||[];
        const allVideoIds = courseModules.flatMap(m => m.videoIds);

        const { data: progressData } = await supabase
          .from('video_progress')
          .select('video_id')
          .eq('user_id', user.id)
          .eq('course_slug', params.slug);
        
        setCompletedVideos(progressData ? progressData.map(p => p.video_id) :[]);

        if (allVideoIds.length === 0) {
          setPlaylist(courseModules.map(m => ({ moduleTitle: m.moduleTitle, videos:[] })));
          setIsLoading(false);
          return;
        }

        const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${allVideoIds.join(',')}&key=${apiKey}`);
        const ytData = await ytRes.json();

        const ytDataMap: Record<string, any> = {};
        if (ytData.items) {
          ytData.items.forEach((item: any) => {
            ytDataMap[item.id] = { 
              title: item.snippet.title, 
              duration: formatYouTubeDuration(item.contentDetails.duration),
              description: item.snippet.description // 🚨 NEW: Fetching the YT Description!
            };
          });
        }

        const enrichedModules = courseModules.map((module) => ({
          moduleTitle: module.moduleTitle,
          videos: module.videoIds.map((id, index) => ({
            id: id,
            title: ytDataMap[id]?.title || `Lesson ${index + 1}`,
            duration: ytDataMap[id]?.duration || "--:--",
            description: ytDataMap[id]?.description || "No description available for this lesson.",
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

  // 2. Fetch Comments whenever the Active Video Changes
  useEffect(() => {
    async function fetchComments() {
      if (!activeVideo) return;
      const { data, error } = await supabase
        .from('video_comments')
        .select('*')
        .eq('video_id', activeVideo.id)
        .order('created_at', { ascending: false }); // Newest first

      if (!error && data) setComments(data);
    }
    fetchComments();
  }, [activeVideo]);

  // 3. Post a New Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !activeVideo) return;
    
    setIsPosting(true);
    const newEntry = {
      video_id: activeVideo.id,
      user_id: user.id,
      user_name: user.fullName || user.firstName || 'Student',
      user_image: user.imageUrl,
      content: newComment.trim()
    };

    try {
      const { data, error } = await supabase.from('video_comments').insert([newEntry]).select();
      if (error) throw error;
      if (data) {
        setComments([data[0], ...comments]); // Add new comment to the top of the list instantly
        setNewComment(""); // Clear input
      }
    } catch (err) {
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const markAsComplete = async () => {
    if (!user || !activeVideo || isMarking) return;
    setIsMarking(true);
    try {
      const { error } = await supabase.from('video_progress').insert([{ user_id: user.id, course_slug: params.slug, video_id: activeVideo.id }]);
      if (error) throw error;
      setCompletedVideos(prev => [...prev, activeVideo.id]);
    } catch (error) {
      alert("Failed to mark as complete.");
    } finally {
      setIsMarking(false);
    }
  };

  if (isLoading) {
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

  const totalVideos = playlist.flatMap(m => m.videos).length;
  const progressPercentage = totalVideos > 0 ? Math.round((completedVideos.length / totalVideos) * 100) : 0;
  const isCurrentlyCompleted = activeVideo ? completedVideos.includes(activeVideo.id) : false;

  return (
    <div className="relative min-h-screen flex flex-col bg-stone-50">
      <Navbar />
      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-6">
          <Link href="/learning" className="inline-flex items-center gap-2 text-stone-500 hover:text-amber-600 transition-colors mb-4 font-bold text-sm">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-black text-stone-900">
            {courseDetails?.title || "Python Live Session"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Player & Info/Q&A */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Video Player */}
            {activeVideo ? (
              <div className="w-full bg-black rounded-2xl overflow-hidden shadow-xl aspect-video border border-stone-200">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`} title={activeVideo.title} frameBorder="0" allowFullScreen></iframe>
              </div>
            ) : (
              <div className="w-full bg-stone-900 rounded-2xl shadow-xl aspect-video border border-stone-200 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center mb-4">
                  <Clock size={40} className="text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2">Live Classes Starting Soon</h2>
                <p className="text-stone-400 max-w-md">Once the live sessions begin, the recordings will be automatically uploaded and unlocked here for you to watch anytime.</p>
              </div>
            )}

            {/* Video Header & Complete Button */}
            {activeVideo && (
              <div className="glass-panel p-6 rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 mb-1">{activeVideo.title}</h2>
                    <p className="text-stone-500 text-sm">Instructor: Shivam Namdev</p>
                  </div>
                  {isCurrentlyCompleted ? (
                    <button disabled className="px-6 py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center gap-2 border border-green-200 w-full sm:w-auto">
                      <CheckCircle size={18} /> Completed
                    </button>
                  ) : (
                    <button onClick={markAsComplete} disabled={isMarking} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors w-full sm:w-auto shadow-md disabled:opacity-70">
                      {isMarking ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />} Mark as Complete
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TABS: Description & Q&A */}
            {activeVideo && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-10">
                
                {/* Tab Headers */}
                <div className="flex border-b border-stone-100 bg-stone-50/50">
                  <button 
                    onClick={() => setActiveTab('description')} 
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'description' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    <AlignLeft size={18} /> Description & Resources
                  </button>
                  <button 
                    onClick={() => setActiveTab('qa')} 
                    className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'qa' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
                  >
                    <MessageCircle size={18} /> Q&A Discussion ({comments.length})
                  </button>
                </div>

                {/* Tab Body */}
                <div className="p-6 md:p-8">
                  {activeTab === 'description' ? (
                    // Description Tab
                    <div className="prose prose-stone max-w-none">
                      <h3 className="text-lg font-bold text-stone-900 mb-4">About this lesson</h3>
                      <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                        {activeVideo.description}
                      </p>
                    </div>
                  ) : (
                    // Q&A Tab
                    <div className="flex flex-col gap-8">
                      
                      {/* Post Comment Input */}
                      <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                        <textarea 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Have a doubt? Ask Shivam or the community here..."
                          className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all"
                          rows={3}
                          required
                        />
                        <div className="flex justify-end">
                          <button type="submit" disabled={isPosting} className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-md">
                            {isPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />} Post Question
                          </button>
                        </div>
                      </form>

                      {/* Comments List */}
                      <div className="space-y-6 border-t border-stone-100 pt-6">
                        {comments.length === 0 ? (
                          <p className="text-center text-stone-400 text-sm italic py-4">No questions yet. Be the first to start the discussion!</p>
                        ) : (
                          comments.map((comment) => (
                            <div key={comment.id} className="flex gap-4">
                              <img src={comment.user_image || "https://www.gravatar.com/avatar/?d=mp"} alt={comment.user_name} className="w-10 h-10 rounded-full border border-stone-200 shadow-sm" />
                              <div className="flex-grow bg-stone-50 p-4 rounded-2xl rounded-tl-none border border-stone-100">
                                <div className="flex justify-between items-center mb-1">
                                  <h5 className="font-bold text-stone-900 text-sm">{comment.user_name}</h5>
                                  <span className="text-xs text-stone-400">
                                    {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-stone-600 text-sm whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Right Column: Playlist & Progress (Unchanged) */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] overflow-hidden sticky top-32">
            <div className="p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-black text-stone-900 text-lg">Course Progress</h3>
              <p className="text-stone-500 text-sm mt-1">{completedVideos.length}/{totalVideos} Lessons Completed ({progressPercentage}%)</p>
              <div className="w-full bg-stone-200 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow p-2">
              {playlist.map((module, mIdx) => (
                <div key={mIdx} className="mb-4">
                  <h4 className="px-3 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider">{module.moduleTitle}</h4>
                  
                  {module.videos.length === 0 ? (
                    <div className="p-3 text-sm text-stone-400 italic flex items-center gap-2">
                      <Clock size={14} /> Recordings unlocking soon...
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {module.videos.map((video: any) => {
                        const isActive = activeVideo?.id === video.id;
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
                  )}

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