'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, Lock, ChevronLeft, Loader2, Clock, MessageCircle, AlignLeft, Send, Code, TerminalSquare } from 'lucide-react';
import Link from 'next/link';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';
import { supabase } from '@/lib/supabaseClient';
import Editor from '@monaco-editor/react';

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
  const[isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'description' | 'qa' | 'practice'>('description');
  const [comments, setComments] = useState<any[]>([]);
  const[newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Python IDE States
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  
  // 🚨 NEW: Pyodide (In-Browser Python) States
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const [isFetchingCode, setIsFetchingCode] = useState(false);

  const courseDetails = activeCourses.find(c => c.slug === params.slug);

  // 🚨 NEW: Load the Python WebAssembly Engine
  useEffect(() => {
    const loadPyodideScript = async () => {
      if ((window as any).loadPyodide) return; // Prevent loading twice
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
      script.onload = async () => {
        try {
          const py = await (window as any).loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
          });
          setPyodide(py);
          setIsPyodideLoading(false);
        } catch (err) {
          console.error("Failed to load Pyodide:", err);
        }
      };
      document.body.appendChild(script);
    };
    loadPyodideScript();
  },[]);

  useEffect(() => {
    async function loadCourseData() {
      if (!isLoaded || !user) return;
      try {
        const courseModules = courseCurriculumMap[params.slug] ||[];
        const allVideoIds = courseModules.flatMap(m => m.videoIds ||[]);

        const { data: progressData } = await supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug);
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
              description: item.snippet.description 
            };
          });
        }

        const enrichedModules = courseModules.map((module) => ({
          moduleTitle: module.moduleTitle,
          videos: module.videoIds.map((id, index) => ({
            id: id,
            title: ytDataMap[id]?.title || `Lesson ${index + 1}`,
            duration: ytDataMap[id]?.duration || "--:--",
            description: ytDataMap[id]?.description || "No description available.",
            youtubeId: id,
            // 🚨 Map the GitHub URL if it exists
            githubAssignment: module.githubAssignments ? module.githubAssignments[id] : null 
          }))
        }));

        // 🚨 NEW: Fetch the raw Python code from GitHub
  const loadGithubAssignment = async (url: string) => {
    setIsFetchingCode(true);
    try {
      // Add a cache-busting timestamp so we always get your latest GitHub pushes!
      const response = await fetch(`${url}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch assignment");
      const codeText = await response.text();
      setCode(codeText);
    } catch (error) {
      setCode("# Error loading assignment from GitHub.\n# Please check your internet connection or try again later.");
    } finally {
      setIsFetchingCode(false);
    }
  };

  // Update handleVideoChange to trigger the fetch
  const handleVideoChange = (video: any) => {
    setActiveVideo(video);
    setOutput(""); 
    setActiveTab('description'); 
    
    if (video.githubAssignment) {
      setCode("# Loading assignment from GitHub...");
      loadGithubAssignment(video.githubAssignment.rawUrl);
    } else {
      setCode(""); // Clear the editor if there is no assignment
    }
  };

        setPlaylist(enrichedModules);
        if (enrichedModules.length > 0 && enrichedModules[0].videos.length > 0) {
          setActiveVideo(enrichedModules[0].videos[0]);
          setCode(enrichedModules[0].videos[0].assignment?.starterCode || "# Write your Python code here\n");
        }
      } catch (error) {
        console.error("Error loading course:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourseData();
  }, [isLoaded, user, params.slug]);

  const handleVideoChange = (video: any) => {
    setActiveVideo(video);
    setCode(video.assignment?.starterCode || "# Write your Python code here\n");
    setOutput(""); 
    setActiveTab('description'); 
  };

  useEffect(() => {
    async function fetchComments() {
      if (!activeVideo) return;
      const { data, error } = await supabase.from('video_comments').select('*').eq('video_id', activeVideo.id).order('created_at', { ascending: false });
      if (!error && data) setComments(data);
    }
    fetchComments();
  }, [activeVideo]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !activeVideo) return;
    setIsPosting(true);
    const newEntry = { video_id: activeVideo.id, user_id: user.id, user_name: user.fullName || user.firstName || 'Student', user_image: user.imageUrl, content: newComment.trim() };
    try {
      const { data, error } = await supabase.from('video_comments').insert([newEntry]).select();
      if (error) throw error;
      if (data) { setComments([data[0], ...comments]); setNewComment(""); }
    } catch (err) {} finally { setIsPosting(false); }
  };

  const markAsComplete = async () => {
    if (!user || !activeVideo || isMarking) return;
    setIsMarking(true);
    try {
      const { error } = await supabase.from('video_progress').insert([{ user_id: user.id, course_slug: params.slug, video_id: activeVideo.id }]);
      if (error) throw error;
      setCompletedVideos(prev => [...prev, activeVideo.id]);
    } catch (error) {} finally { setIsMarking(false); }
  };

  // 🚨 NEW: Execute Python Code ENTIRELY in the Browser!
  const runPythonCode = async () => {
    if (!code.trim() || !pyodide) return;
    setIsRunningCode(true);
    setOutput("Running script...");
    
    try {
      // Intercept the Python 'print' function so it outputs to our black terminal
      await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);
      
      // Run the student's code
      await pyodide.runPythonAsync(code);
      
      // Fetch the output
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      
      if (stderr) {
        setOutput(`Error:\n${stderr}`);
      } else {
        setOutput(stdout || "Script executed successfully. (No output)");
      }
    } catch (error: any) {
      // Catch syntax errors (like missing colons or brackets)
      setOutput(`Syntax Error:\n${error.message}`);
    } finally {
      setIsRunningCode(false);
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
          
          <div className="lg:col-span-2 flex flex-col gap-6">
            
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
              </div>
            )}

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

            {activeVideo && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-10">
                <div className="flex border-b border-stone-100 bg-stone-50/50">
                  <button onClick={() => setActiveTab('description')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'description' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                    <AlignLeft size={18} /> Lesson Details
                  </button>
                  <button onClick={() => setActiveTab('qa')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'qa' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                    <MessageCircle size={18} /> Q&A ({comments.length})
                  </button>
                  {activeVideo.assignment && (
                    <button onClick={() => setActiveTab('practice')} className={`flex-1 py-4 font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'practice' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                      <Code size={18} /> Practice 💻
                    </button>
                  )}
                </div>

                <div className="p-6 md:p-8">
                  {activeTab === 'description' && (
                    <div className="prose prose-stone max-w-none">
                      <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{activeVideo.description}</p>
                    </div>
                  )}

                  {activeTab === 'qa' && (
                    <div className="flex flex-col gap-8">
                      <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ask Shivam or the community..." className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all" rows={3} required />
                        <div className="flex justify-end">
                          <button type="submit" disabled={isPosting} className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-md">
                            {isPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />} Post Question
                          </button>
                        </div>
                      </form>
                      <div className="space-y-6 border-t border-stone-100 pt-6">
                        {comments.length === 0 ? <p className="text-center text-stone-400 text-sm italic py-4">No questions yet. Start the discussion!</p> : comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4">
                            <img src={comment.user_image || "https://www.gravatar.com/avatar/?d=mp"} alt={comment.user_name} className="w-10 h-10 rounded-full border border-stone-200 shadow-sm" />
                            <div className="flex-grow bg-stone-50 p-4 rounded-2xl rounded-tl-none border border-stone-100">
                              <div className="flex justify-between items-center mb-1">
                                <h5 className="font-bold text-stone-900 text-sm">{comment.user_name}</h5>
                              </div>
                              <p className="text-stone-600 text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🚨 THE UPGRADED PYODIDE IDE */}
                  {/* 🚨 THE INTERACTIVE PYTHON IDE */}
                  {activeTab === 'practice' && activeVideo.githubAssignment && (
                    <div className="flex flex-col gap-6">
                      
                      {/* Dynamic GitHub Header */}
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-amber-800 mb-1">Practice Exercise:</h4>
                          <p className="text-stone-700 text-sm font-medium">{activeVideo.githubAssignment.title}</p>
                        </div>
                        {/* Optional: Add a button linking directly to the repo file */}
                        <a href={activeVideo.githubAssignment.rawUrl.replace('raw.githubusercontent.com', 'github.com').replace('/main/', '/blob/main/')} 
                           target="_blank" rel="noreferrer" 
                           className="text-xs text-amber-600 hover:text-amber-800 font-bold underline">
                          View on GitHub
                        </a>
                      </div>

                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-inner">
                        <div className="bg-stone-900 px-4 py-2 flex justify-between items-center">
                          <span className="text-stone-400 text-xs font-mono">
                            {isFetchingCode ? "Fetching from GitHub..." : "main.py"}
                          </span>
                          
                          <button onClick={runPythonCode} disabled={isRunningCode || isPyodideLoading || isFetchingCode} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                            {isPyodideLoading || isFetchingCode ? <Loader2 size={14} className="animate-spin"/> : isRunningCode ? <Loader2 size={14} className="animate-spin"/> : <PlayCircle size={14}/>} 
                            {isPyodideLoading ? "Loading Engine..." : isFetchingCode ? "Loading Code..." : "Run Code"}
                          </button>
                        </div>
                        <Editor
                          height="300px"
                          defaultLanguage="python"
                          theme="vs-dark"
                          value={code}
                          onChange={(value) => setCode(value || "")}
                          options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
                        />
                      </div>

                      <div className="bg-black rounded-xl p-4 border border-stone-800 shadow-inner min-h-[120px]">
                        <div className="flex items-center gap-2 text-stone-400 mb-2 border-b border-stone-800 pb-2">
                          <TerminalSquare size={16} /> <span className="text-xs font-mono font-bold tracking-widest uppercase">Output</span>
                        </div>
                        <pre className={`text-sm font-mono whitespace-pre-wrap ${output.startsWith('Error') || output.startsWith('Syntax') ? 'text-red-400' : 'text-green-400'}`}>
                          {output || "Run your code to see the output here..."}
                        </pre>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Right Column: Playlist */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] overflow-hidden sticky top-32">
            <div className="p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-black text-stone-900 text-lg">Course Progress</h3>
              <p className="text-stone-500 text-sm mt-1">{completedVideos.length}/{totalVideos} Lessons Completed</p>
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
                      const isActive = activeVideo?.id === video.id;
                      const isDone = completedVideos.includes(video.id);
                      return (
                        <button key={video.id} onClick={() => handleVideoChange(video)} className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-amber-50 border border-amber-200 shadow-sm' : 'hover:bg-stone-50 border border-transparent'}`}>
                          <div className="mt-0.5 flex-shrink-0">
                            {isDone ? <CheckCircle size={16} className="text-green-500" /> : isActive ? <PlayCircle size={16} className="text-amber-500" /> : <Lock size={16} className="text-stone-300" />}
                          </div>
                          <div className="flex-grow pr-2">
                            <p className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-amber-700' : 'text-stone-700'} ${isDone && !isActive ? 'line-through opacity-70' : ''}`}>{video.title}</p>
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