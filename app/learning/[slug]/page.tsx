'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, Lock, ChevronLeft, Loader2, Clock, MessageCircle, AlignLeft, Send, Code, TerminalSquare, Award, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';
import { supabase } from '@/lib/supabaseClient';
import Editor from '@monaco-editor/react';
import { jsPDF } from "jspdf";


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
  
  // Progress Tracking States
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<string[]>([]); // 🚨 NEW STATE
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'description' | 'qa' | 'practice'>('description');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // IDE States
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false); // 🚨 NEW STATE
  
  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);

  const courseDetails = activeCourses.find(c => c.slug === params.slug);

  useEffect(() => {
    const loadPyodideScript = async () => {
      if ((window as any).loadPyodide) return;
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
      script.onload = async () => {
        try {
          const py = await (window as any).loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
          setPyodide(py);
          setIsPyodideLoading(false);
        } catch (err) { console.error("Failed to load Pyodide:", err); }
      };
      document.body.appendChild(script);
    };
    loadPyodideScript();
  },[]);

  const loadGithubAssignment = async (url: string) => {
    try {
      const response = await fetch(`${url}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch assignment");
      const rawText = await response.text();
      const commentedText = rawText.split('\n').map(line => `# ${line}`).join('\n');
      setCode(`${commentedText}\n\n# ==========================================\n# WRITE YOUR PYTHON CODE BELOW THIS LINE:\n# ==========================================\n\n`);
    } catch (error) {
      setCode("# Error loading assignment from GitHub.");
    }
  };

  useEffect(() => {
    async function loadCourseData() {
      if (!isLoaded || !user) return;
      try {
        const courseModules = courseCurriculumMap[params.slug] ||[];
        const allVideoIds = courseModules.flatMap(m => m.videoIds ||[]);

        // Fetch Completed Videos
        const { data: vidProgress } = await supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug);
        setCompletedVideos(vidProgress ? vidProgress.map(p => p.video_id) :[]);

        // 🚨 Fetch Completed Assignments
        const { data: assProgress } = await supabase.from('assignment_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug);
        setCompletedAssignments(assProgress ? assProgress.map(p => p.video_id) :[]);

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
            ytDataMap[item.id] = { title: item.snippet.title, duration: formatYouTubeDuration(item.contentDetails.duration), description: item.snippet.description };
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
            githubAssignment: module.githubAssignments ? module.githubAssignments[id] : null 
          }))
        }));

        setPlaylist(enrichedModules);
        if (enrichedModules.length > 0 && enrichedModules[0].videos.length > 0) {
          setActiveVideo(enrichedModules[0].videos[0]);
          if (enrichedModules[0].videos[0].githubAssignment) loadGithubAssignment(enrichedModules[0].videos[0].githubAssignment.rawUrl);
        }
      } catch (error) {
        console.error("Error loading course:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourseData();
  },[isLoaded, user, params.slug]);

  const handleVideoChange = (video: any) => {
    setActiveVideo(video);
    setOutput(""); 
    setActiveTab('description'); 
    if (video.githubAssignment) {
      setCode("# Loading assignment from GitHub...");
      loadGithubAssignment(video.githubAssignment.rawUrl);
    } else {
      setCode("");
    }
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
      if (!error && data) { setComments([data[0], ...comments]); setNewComment(""); }
    } finally { setIsPosting(false); }
  };

  // Video Completion
  const markAsComplete = async () => {
    if (!user || !activeVideo || isMarking) return;
    setIsMarking(true);
    try {
      await supabase.from('video_progress').insert([{ user_id: user.id, course_slug: params.slug, video_id: activeVideo.id }]);
      setCompletedVideos(prev =>[...prev, activeVideo.id]);
    } finally { setIsMarking(false); }
  };

  // 🚨 NEW: Assignment Submission (Captures Email if Name is missing!)
  const submitAssignment = async () => {
    if (!user || !activeVideo || isSubmittingAssignment) return;
    setIsSubmittingAssignment(true);
    
    try {
      // 1. Get the most useful identifier (Name -> Email -> Fallback)
      const studentIdentifier = 
        user.fullName || 
        user.firstName || 
        user.primaryEmailAddress?.emailAddress || 
        'Student'; 
      
      // 2. Save it to Supabase
      const { error } = await supabase.from('assignment_progress').upsert(
        { 
          user_id: user.id, 
          course_slug: params.slug, 
          video_id: activeVideo.id, 
          submitted_code: code,
          user_name: studentIdentifier // Save the robust identifier
        },
        { onConflict: 'user_id, course_slug, video_id' }
      );

      if (error) throw error;
      
      if (!completedAssignments.includes(activeVideo.id)) {
        setCompletedAssignments(prev =>[...prev, activeVideo.id]);
      }
      alert("✅ Assignment Submitted Successfully!");
    } catch (err) {
      alert("Failed to submit assignment. Please try again.");
      console.error(err);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const runPythonCode = async () => {
    if (!code.trim() || !pyodide) return;
    setIsRunningCode(true);
    setOutput("Running script...");
    try {
      await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);
      await pyodide.runPythonAsync(code);
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      if (stderr) setOutput(`Error:\n${stderr}`);
      else setOutput(stdout || "Script executed successfully. (No output)");
    } catch (error: any) {
      setOutput(`Syntax Error:\n${error.message}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  const [isGeneratingCert, setIsGeneratingCert] = useState(false);

  // 🚨 THE AUTOMATED CERTIFICATE GENERATOR
  const handleGenerateCertificate = () => {
    try {
      // 1. Initialize a landscape A4 PDF document
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      // 2. Draw the Premium Warm Ivory Background
      doc.setFillColor(253, 252, 248); // Ivory color
      doc.rect(0, 0, 297, 210, 'F');
      
      // 3. Draw the Outer and Inner Borders (Amber/Gold)
      doc.setDrawColor(217, 119, 6); // Amber-600
      doc.setLineWidth(2);
      doc.rect(10, 10, 277, 190);
      doc.setLineWidth(0.5);
      doc.rect(12, 12, 273, 186);

      // 4. Add the Header/Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.setTextColor(28, 25, 23); // Stone-900
      doc.text("Certificate of Completion", 148.5, 50, { align: "center" });

      // 5. Add the Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(120, 113, 108); // Stone-500
      doc.text("This is to certify that", 148.5, 75, { align: "center" });

      // 6. Add the Student's Name Dynamically
      const studentName = user?.fullName || user?.firstName || "Dedicated Student";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(32);
      doc.setTextColor(217, 119, 6); // Amber-600
      doc.text(studentName.toUpperCase(), 148.5, 95, { align: "center" });

      // 7. Add Course Details
      doc.setFont("helvetica", "normal");
      doc.setFontSize(16);
      doc.setTextColor(28, 25, 23);
      doc.text(`has successfully completed the immersive program:`, 148.5, 115, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.text(courseDetails?.title || "Python Programming", 148.5, 127, { align: "center" });

      doc.setFont("helvetica", "italic");
      doc.setFontSize(14);
      doc.setTextColor(120, 113, 108);
      doc.text("demonstrating mastery in automation, coding logic, and execution.", 148.5, 140, { align: "center" });

      // 8. Add Verification Details (Date & Unique ID)
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const uniqueId = `SA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(28, 25, 23);
      doc.text(`Date Issued: ${today}`, 40, 170);
      doc.text(`Certificate ID: ${uniqueId}`, 40, 180);

      // 9. Add Your Signature/Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Shivam Namdev", 250, 168, { align: "center" });
      
      doc.setDrawColor(28, 25, 23);
      doc.setLineWidth(0.5);
      doc.line(210, 172, 290, 172); // Signature Line
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text("Lead QA & Instructor", 250, 180, { align: "center" });

      // 10. Trigger the Download!
      doc.save(`${studentName.replace(/\s+/g, '_')}_Certificate.pdf`);

    } catch (error) {
      console.error("Error generating certificate:", error);
      alert("Something went wrong while generating your certificate. Please try again.");
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

  // 🚨 NEW PROGRESS MATH: Calculates Videos + Assignments
  const totalVideos = playlist.flatMap(m => m.videos).length;
  const totalAssignments = playlist.flatMap(m => m.videos.filter((v: any) => v.githubAssignment)).length;
  
  const totalTasks = totalVideos + totalAssignments;
  const completedTasks = completedVideos.length + completedAssignments.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const isVideoCompleted = activeVideo ? completedVideos.includes(activeVideo.id) : false;
  const isAssignmentCompleted = activeVideo ? completedAssignments.includes(activeVideo.id) : false;

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
                <h2 className="text-3xl font-black text-white mb-4">Live Classes Starting Soon</h2>
                
                {/* 🚨 NEW: Google Meet Button inside the Video Player! */}
                {courseDetails?.liveLink ? (
                  <a href={courseDetails.liveLink} target="_blank" rel="noreferrer" className="px-8 py-4 rounded-full bg-amber-500 text-stone-900 font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg">
                    <PlayCircle size={20} /> Join Today's Live Class on Google Meet
                  </a>
                ) : (
                  <p className="text-stone-400 max-w-md">Once the live sessions begin, the recordings will be automatically uploaded and unlocked here for you to watch anytime.</p>
                )}
              </div>
            )}

            {activeVideo && (
              <div className="glass-panel p-6 rounded-2xl border border-stone-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 mb-1">{activeVideo.title}</h2>
                    <p className="text-stone-500 text-sm">Instructor: Shivam Namdev</p>
                  </div>
                  {isVideoCompleted ? (
                    <button disabled className="px-6 py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center gap-2 border border-green-200">
                      <CheckCircle size={18} /> Video Watched
                    </button>
                  ) : (
                    <button onClick={markAsComplete} disabled={isMarking} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center gap-2 hover:bg-amber-600 shadow-md">
                      {isMarking ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />} Mark Video Complete
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeVideo && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-10">
                <div className="flex border-b border-stone-100 bg-stone-50/50">
                  <button onClick={() => setActiveTab('description')} className={`flex-1 py-4 font-bold text-sm flex justify-center gap-2 ${activeTab === 'description' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500'}`}><AlignLeft size={18} /> Lesson Details</button>
                  <button onClick={() => setActiveTab('qa')} className={`flex-1 py-4 font-bold text-sm flex justify-center gap-2 ${activeTab === 'qa' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500'}`}><MessageCircle size={18} /> Q&A ({comments.length})</button>
                  {activeVideo.githubAssignment && (
                    <button onClick={() => setActiveTab('practice')} className={`flex-1 py-4 font-bold text-sm flex justify-center gap-2 ${activeTab === 'practice' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500'}`}>
                      <Code size={18} /> Practice {isAssignmentCompleted && "✅"}
                    </button>
                  )}
                </div>

                <div className="p-6 md:p-8">
                  {activeTab === 'description' && (
                  <div className="prose prose-stone max-w-none">
                    <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      {activeVideo.description}
                    </p>
                  </div>
                )}
                  {activeTab === 'qa' && (
                    <div className="flex flex-col gap-6">
                      <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ask a question..." className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none" rows={3} required />
                        <button type="submit" disabled={isPosting} className="self-end px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center gap-2"><Send size={16} /> Post Question</button>
                      </form>
                      <div className="space-y-6 pt-6 border-t border-stone-100">
                        {comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4">
                            <img src={comment.user_image || "https://www.gravatar.com/avatar/?d=mp"} alt="User" className="w-10 h-10 rounded-full border border-stone-200" />
                            <div className="flex-grow bg-stone-50 p-4 rounded-2xl rounded-tl-none border border-stone-100">
                              <h5 className="font-bold text-stone-900 text-sm mb-1">{comment.user_name}</h5>
                              <p className="text-stone-600 text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'practice' && activeVideo.githubAssignment && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-amber-800 mb-1">Practice Exercise:</h4>
                          <p className="text-stone-700 text-sm font-medium">{activeVideo.githubAssignment.title}</p>
                        </div>
                      </div>

                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-inner">
                        <div className="bg-stone-900 px-4 py-2 flex justify-between items-center">
                          <span className="text-stone-400 text-xs font-mono">main.py</span>
                          <div className="flex gap-2">
                            <button onClick={runPythonCode} disabled={isRunningCode || isPyodideLoading} className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                              {isPyodideLoading || isRunningCode ? <Loader2 size={14} className="animate-spin"/> : <PlayCircle size={14}/>} Run Code
                            </button>
                            
                            {/* 🚨 THE SUBMIT ASSIGNMENT BUTTON */}
                            <button onClick={submitAssignment} disabled={isSubmittingAssignment} className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${isAssignmentCompleted ? 'bg-amber-500 text-white' : 'bg-stone-700 hover:bg-stone-600 text-white'}`}>
                              {isSubmittingAssignment ? <Loader2 size={14} className="animate-spin"/> : <FileCheck size={14}/>} 
                              {isAssignmentCompleted ? "Update Submission" : "Submit Assignment"}
                            </button>
                          </div>
                        </div>
                        <Editor height="300px" defaultLanguage="python" theme="vs-dark" value={code} onChange={(value) => setCode(value || "")} options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} />
                      </div>

                      <div className="bg-black rounded-xl p-4 border border-stone-800 shadow-inner min-h-[120px]">
                        <div className="flex items-center gap-2 text-stone-400 mb-2 border-b border-stone-800 pb-2">
                          <TerminalSquare size={16} /> <span className="text-xs font-mono font-bold uppercase">Output</span>
                        </div>
                        <pre className={`text-sm font-mono whitespace-pre-wrap ${output.startsWith('Error') || output.startsWith('Syntax') ? 'text-red-400' : 'text-green-400'}`}>{output || "Run your code to see the output here..."}</pre>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] overflow-hidden sticky top-32">
            <div className="p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-black text-stone-900 text-lg">Course Progress</h3>
              <p className="text-stone-500 text-sm mt-1">{completedTasks}/{totalTasks} Tasks Completed ({progressPercentage}%)</p>
              <div className="w-full bg-stone-200 rounded-full h-2 mt-4 overflow-hidden mb-4">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              
              {/* 🚨 THE CERTIFICATE UNLOCK BUTTON */}
              {(progressPercentage === 100 || user?.primaryEmailAddress?.emailAddress === "shivamnamdev.corp@gmail.com") && (
                <button onClick={handleGenerateCertificate} className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-900 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform animate-in zoom-in">
                  <Award size={20} /> Claim Certificate
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-grow p-2">
              {playlist.map((module, mIdx) => (
                <div key={mIdx} className="mb-4">
                  <h4 className="px-3 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider">{module.moduleTitle}</h4>
                  <div className="flex flex-col gap-1">
                    {module.videos.map((video: any) => {
                      const isActive = activeVideo?.id === video.id;
                      const isVidDone = completedVideos.includes(video.id);
                      const isAssDone = completedAssignments.includes(video.id);
                      
                      return (
                        <button key={video.id} onClick={() => handleVideoChange(video)} className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-amber-50 border border-amber-200 shadow-sm' : 'hover:bg-stone-50 border border-transparent'}`}>
                          <div className="mt-0.5 flex-shrink-0">
                            {isVidDone ? <CheckCircle size={16} className="text-green-500" /> : <PlayCircle size={16} className="text-amber-500" />}
                          </div>
                          <div className="flex-grow pr-2">
                            <p className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-amber-700' : 'text-stone-700'} ${isVidDone && !isActive ? 'opacity-70' : ''}`}>{video.title}</p>
                            {video.githubAssignment && (
                              <p className={`text-xs mt-1 font-bold ${isAssDone ? 'text-green-600' : 'text-amber-600'}`}>
                                {isAssDone ? "✅ Assignment Submitted" : "📝 Pending Assignment"}
                              </p>
                            )}
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