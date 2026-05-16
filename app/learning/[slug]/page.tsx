'use client';
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, CheckCircle2, Lock, ChevronLeft, ChevronRight, Loader2, Clock, MessageCircle, AlignLeft, Send, Code, Code2, TerminalSquare, Award, FileCheck, Eye, RefreshCw, X, Plus, FileText } from 'lucide-react';
import Link from 'next/link';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';
import { supabase } from '@/lib/supabaseClient';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [completedAssignments, setCompletedAssignments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'description' | 'qa' | 'practice' | 'visualize'>('description');
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [files, setFiles] = useState<Record<string, string>>({ "main.py": "" });
  const [activeFile, setActiveFile] = useState("main.py");
  const [stepFiles, setStepFiles] = useState<Record<string, string>[]>([]); 
  
  const [output, setOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  
  const [officialSolutionSteps, setOfficialSolutionSteps] = useState<string[]>([]);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  
  const [assignmentSteps, setAssignmentSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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

  const loadGithubAssignment = async (assignmentObj: any) => {
    setIsFetchingCode(true);
    try {
      const response = await fetch(`${assignmentObj.rawUrl}?t=${Date.now()}`);
      if (!response.ok) throw new Error("Failed to fetch assignment");
      const rawText = await response.text();
      
      const steps = rawText.split(/^\s*-{3,}\s*$/gm).map(s => s.trim()).filter(s => s.length > 0);
      const finalSteps = steps.length > 0 ? steps : [rawText];
      
      setAssignmentSteps(finalSteps);
      setCurrentStepIndex(0);

      let initialWorkspace: Record<string, string> = { "main.py": "# Write your Python code below:\n\n" };
      
      if (assignmentObj.supportingFiles) {
        for (const file of assignmentObj.supportingFiles) {
          try {
            const res = await fetch(`${file.rawUrl}?t=${Date.now()}`);
            initialWorkspace[file.filename] = await res.text();
          } catch (err) {}
        }
      }
      
      const initialFilesArray = Array.from({ length: finalSteps.length }, () => ({ ...initialWorkspace }));
      setStepFiles(initialFilesArray);
      setFiles(initialFilesArray[0]);
      setActiveFile("main.py");

      if (assignmentObj.solutionUrl) {
        const solRes = await fetch(`${assignmentObj.solutionUrl}?t=${Date.now()}`);
        if (solRes.ok) {
          const rawSol = await solRes.text();
          const solSteps = rawSol.split(/^#\s*-{10,}\s*$/gm).map(s => s.trim()).filter(s => s.length > 0);
          setOfficialSolutionSteps(solSteps.length > 0 ? solSteps : [rawSol]);
        } else {
          setOfficialSolutionSteps(["# Official solution file could not be loaded."]);
        }
      } else {
        setOfficialSolutionSteps([]);
      }
    } catch (error) {
      setAssignmentSteps(["Error loading assignment instructions from GitHub."]);
      setStepFiles([{ "main.py": "" }]);
      setFiles({ "main.py": "" });
      setOfficialSolutionSteps([]);
    } finally {
      setIsFetchingCode(false);
    }
  };

  useEffect(() => {
    async function loadCourseData() {
      if (!isLoaded || !user?.id) return;
      try {
        const courseModules = courseCurriculumMap[params.slug] ||[];
        const allVideoIds = courseModules.flatMap(m => m.videoIds ||[]);

        const { data: vidProgress } = await supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug);
        setCompletedVideos(vidProgress ? vidProgress.map(p => p.video_id) :[]);

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
          if (enrichedModules[0].videos[0].githubAssignment) {
            loadGithubAssignment(enrichedModules[0].videos[0].githubAssignment);
          }
        }
      } catch (error) {
        console.error("Error loading course:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourseData();
  },[isLoaded, user?.id, params.slug]);

  const handleVideoChange = (video: any) => {
    setActiveVideo(video);
    setOutput(""); 
    setAiResponse(null);
    setActiveTab('description'); 
    setAssignmentSteps([]);
    setCurrentStepIndex(0);
    setOfficialSolutionSteps([]);
    
    if (video.githubAssignment) {
      setAssignmentSteps(["Loading instructions..."]);
      setFiles({ "main.py": "# Loading workspace..." });
      setActiveFile("main.py");
      loadGithubAssignment(video.githubAssignment);
    } else {
      setStepFiles([]);
      setFiles({ "main.py": "" });
    }
  };

  const handleStepChange = (newIndex: number) => {
    const newStepFiles = [...stepFiles];
    newStepFiles[currentStepIndex] = files;
    setStepFiles(newStepFiles);

    setFiles(newStepFiles[newIndex] || { "main.py": "# Write your Python code below:\n\n" });
    setActiveFile("main.py");
    setCurrentStepIndex(newIndex);
    setOutput("");
    setAiResponse(null);
  };

  // 🚨 FIXED: Now explicitly checks if name exists in object keys to prevent overwriting
  const handleAddFile = () => {
    const name = prompt("Enter file name (e.g., utils.py or data.txt):");
    if (name) {
      if (name in files) {
        alert("A file with this name already exists.");
      } else {
        setFiles(prev => ({ ...prev, [name]: "" }));
        setActiveFile(name);
      }
    }
  };

  // 🚨 FIXED: Also deletes the file from Pyodide Virtual Hard Drive so it doesn't resurrect!
  const handleDeleteFile = (name: string) => {
    if (name === 'main.py') return alert("You cannot delete main.py!");
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const newFiles = { ...files };
      delete newFiles[name];
      setFiles(newFiles);
      if (activeFile === name) setActiveFile("main.py");
      
      // Wipe it from Pyodide memory
      if (pyodide) {
        try { pyodide.FS.unlink(name); } catch (e) {}
      }
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
    const newEntry = { video_id: activeVideo.id, user_id: user.id, user_name: user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student', user_image: user.imageUrl, content: newComment.trim() };
    try {
      const { data, error } = await supabase.from('video_comments').insert([newEntry]).select();
      if (!error && data) { setComments([data[0], ...comments]); setNewComment(""); }
    } finally { setIsPosting(false); }
  };

  const markAsComplete = async () => {
    if (!user || !activeVideo || isMarking) return;
    setIsMarking(true);
    try {
      await supabase.from('video_progress').insert([{ user_id: user.id, course_slug: params.slug, video_id: activeVideo.id }]);
      setCompletedVideos(prev =>[...prev, activeVideo.id]);
      
      await awardPoints(10); // 🚨 AWARD 10 POINTS!
      
    } finally { setIsMarking(false); }
  };

  // 🚨 GAMIFICATION - Award Points & Save Email
  const awardPoints = async (pointsToAdd: number) => {
    if (!user) return;
    try {
      const studentName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student';
      const studentEmail = user.primaryEmailAddress?.emailAddress || "";

      const { data } = await supabase.from('user_stats').select('*').eq('user_id', user.id).single();
      
      if (data) {
        await supabase.from('user_stats').update({ 
          total_points: (data.total_points || 0) + pointsToAdd,
          user_name: studentName,
          user_email: studentEmail // 🚨 Update email
        }).eq('user_id', user.id);
      } else {
        await supabase.from('user_stats').insert([{ 
          user_id: user.id, 
          user_name: studentName,
          user_email: studentEmail, // 🚨 Save email
          total_points: pointsToAdd,
          current_streak: 1,
          last_active_date: new Date().toISOString().split('T')[0]
        }]);
      }
    } catch (err) { console.error("Gamification Error:", err); }
  };

  // 🚨 UPDATED: Assignment Submission with Timestamp Forcing & Safety Checks
  const submitAssignment = async () => {
    if (!user || !activeVideo || isSubmittingAssignment) return;
    setIsSubmittingAssignment(true);
    
    try {
      // 1. Create a final copy of the current step safely
      const finalStepFiles = [...stepFiles];
      finalStepFiles[currentStepIndex] = files;
      
      // 2. Merge all files from all steps (with safety fallback for empty steps)
      const combinedCode = finalStepFiles.map((stepDict, idx) => {
        const safeDict = stepDict || { "main.py": "# No code provided" };
        const filesText = Object.entries(safeDict).map(([name, cont]) => `# --- File: ${name} ---\n${cont}`).join('\n\n');
        return `# === Step ${idx + 1} ===\n${filesText}`;
      }).join('\n\n');
      
      const studentName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student';
      
      // 3. Upsert to Supabase AND force the timestamp to update!
      const { error } = await supabase.from('assignment_progress').upsert(
        { 
          user_id: user.id, 
          course_slug: params.slug, 
          video_id: activeVideo.id, 
          submitted_code: combinedCode, 
          user_name: studentName,
          completed_at: new Date().toISOString() // 🚨 THE FIX: Forces it to the top of your Admin list!
        },
        { onConflict: 'user_id, course_slug, video_id' }
      );

      if (error) {
        console.error("Supabase Submission Error:", error);
        throw error;
      }
      
      if (!completedAssignments.includes(activeVideo.id)) {
        setCompletedAssignments(prev => [...prev, activeVideo.id]);
        await awardPoints(50); // 🚨 AWARD 50 POINTS ONLY FOR FIRST-TIME SUBMISSION!
      }
      
      setShowSuccessOverlay(true);
      setTimeout(() => setShowSuccessOverlay(false), 4000);

      // Pop open the solution modal if it exists
      if (officialSolutionSteps.length > 0) {
        setShowSolutionModal(true);
      }

    } catch (err: any) {
      console.error("Submission Crash:", err);
      alert(`Failed to submit assignment. Please check your internet connection.`);
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // 🚨 THE FIX: TWO-WAY VIRTUAL FILE SYSTEM SYNC!
  // 🚨 THE UPGRADED RUN COMMAND (Now supports Python input()!)
  const runPythonCode = async () => {
    if (!files['main.py'].trim() || !pyodide) return;
    setIsRunningCode(true);
    setOutput("Running script...");
    try {
      // 1. Setup Python terminal capture & OVERRIDE input() function!
      await pyodide.runPythonAsync(`
import sys
import io
import builtins
from js import prompt

sys.stdout = io.StringIO()
sys.stderr = io.StringIO()

# Custom input handler to route Python input() to Browser prompt()
def custom_input(p=""):
    sys.stdout.write(str(p)) # Print the prompt question to our terminal
    val = prompt(str(p))     # Open the browser popup
    if val is None:          # If user clicks 'Cancel'
        sys.stdout.write("\\n")
        raise EOFError("EOF when reading a line")
    sys.stdout.write(val + "\\n") # Echo what they typed into our terminal
    return val

builtins.input = custom_input
      `);
      
      // 2. Wipe old files from previous steps
      try {
        const pyodideFiles = pyodide.FS.readdir('.');
        for (const fname of pyodideFiles) {
          if (fname !== '.' && fname !== '..') {
            const stat = pyodide.FS.stat(fname);
            if (pyodide.FS.isFileSync(stat.mode)) pyodide.FS.unlink(fname);
          }
        }
      } catch(e) {}

      // 3. Inject React files into Pyodide VFS
      for (const [fname, content] of Object.entries(files)) {
        pyodide.FS.writeFile(fname, content);
      }

      // 4. Execute main.py
      await pyodide.runPythonAsync(files['main.py']);
      
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      let finalOutput = stdout;

      // 5. Run Hidden Auto-Grader Tests
      if (!stderr && activeVideo?.githubAssignment?.testCode) {
        try {
          await pyodide.runPythonAsync(activeVideo.githubAssignment.testCode);
          finalOutput += "\n\n✅ --------------------------\n✅ ALL TESTS PASSED! Great job.\n✅ --------------------------";
        } catch (testError: any) {
          const errorMsg = testError.message.split('AssertionError:')[1]?.strip() || "Test Failed: Output did not match expected results.";
          finalOutput += `\n\n❌ --------------------------\n❌ ${errorMsg}\n❌ --------------------------`;
        }
      }

      // 6. Sync Generated Files back to React UI
      try {
        const currentPyodideFiles = pyodide.FS.readdir('.');
        const syncedFiles = { ...files };
        
        for (const fname of currentPyodideFiles) {
          if (fname !== '.' && fname !== '..') {
            const stat = pyodide.FS.stat(fname);
            if (pyodide.FS.isFileSync(stat.mode)) {
              syncedFiles[fname] = pyodide.FS.readFile(fname, { encoding: 'utf8' });
            }
          }
        }
        for (const fname in files) {
          if (!currentPyodideFiles.includes(fname)) delete syncedFiles[fname];
        }
        setFiles(syncedFiles);
      } catch(e) {}

      // 7. Render Output
      if (stderr) setOutput(`Error:\n${stderr}`);
      else setOutput(finalOutput || "Script executed successfully. (No output)");
      
    } catch (error: any) {
      setOutput(`Syntax Error:\n${error.message.split('File "<exec>"')[1] || error.message}`);
    } finally {
      setIsRunningCode(false);
    }
  };

  const askAITutor = async () => {
    if (!files['main.py'].trim() || isAskingAI) return;
    setIsAskingAI(true);
    setAiResponse(null);
    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: files['main.py'], assignment: activeVideo.githubAssignment?.title || "Python exercise", output: output || "No output yet." })
      });
      const data = await response.json();
      if (data.success) setAiResponse(data.message);
      else setAiResponse("AI Tutor is taking a break. Please check your syntax manually.");
    } catch (error) {
      setAiResponse("Network error. AI Tutor could not be reached.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleGenerateCertificate = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      doc.setFillColor(253, 252, 248); doc.rect(0, 0, 297, 210, 'F');
      doc.setDrawColor(217, 119, 6); doc.setLineWidth(2); doc.rect(10, 10, 277, 190);
      doc.setLineWidth(0.5); doc.rect(12, 12, 273, 186);

      doc.setFont("helvetica", "bold"); doc.setFontSize(36); doc.setTextColor(28, 25, 23);
      doc.text("Certificate of Completion", 148.5, 50, { align: "center" });

      doc.setFont("helvetica", "normal"); doc.setFontSize(16); doc.setTextColor(120, 113, 108);
      doc.text("This is to certify that", 148.5, 75, { align: "center" });

      const studentName = String(user?.fullName || user?.firstName || "Dedicated Student");
      doc.setFont("helvetica", "bold"); doc.setFontSize(32); doc.setTextColor(217, 119, 6);
      doc.text(studentName.toUpperCase(), 148.5, 95, { align: "center" });

      doc.setFont("helvetica", "normal"); doc.setFontSize(16); doc.setTextColor(28, 25, 23);
      doc.text(`has successfully completed the immersive program:`, 148.5, 115, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.text(String(courseDetails?.title || "Python Programming"), 148.5, 127, { align: "center" });

      doc.setFont("helvetica", "italic"); doc.setFontSize(14); doc.setTextColor(120, 113, 108);
      doc.text("demonstrating mastery in automation, coding logic, and execution.", 148.5, 140, { align: "center" });

      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const uniqueId = `SA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(28, 25, 23);
      doc.text(`Date Issued: ${today}`, 40, 170);
      doc.text(`Certificate ID: ${uniqueId}`, 40, 180);

      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.text("Shivam Namdev", 250, 168, { align: "center" });
      doc.setDrawColor(28, 25, 23); doc.setLineWidth(0.5); doc.line(210, 172, 290, 172);
      doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.text("Lead QA & Instructor", 250, 180, { align: "center" });

      doc.save(`${studentName.replace(/\s+/g, '_')}_Certificate.pdf`);
    } catch (error) {
      alert("Something went wrong while generating your certificate.");
    }
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith('.py')) return 'python';
    if (filename.endsWith('.csv')) return 'csv';
    if (filename.endsWith('.json')) return 'json';
    return 'plaintext';
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
        
        <AnimatePresence>
          {showSolutionModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0d1117] w-full max-w-6xl rounded-3xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
              >
                <div className="px-6 py-4 border-b border-stone-800 flex justify-between items-center bg-[#161b22]">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Award className="text-amber-500" /> Official Solution & Code Review
                  </h3>
                  <button onClick={() => setShowSolutionModal(false)} className="text-stone-400 hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex flex-col md:flex-row flex-grow overflow-hidden h-[60vh]">
                   <div className="w-full md:w-1/2 border-r border-stone-800 flex flex-col">
                      <div className="bg-[#161b22] px-4 py-3 border-b border-stone-800 text-stone-400 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                        Your Submitted Code (Step {currentStepIndex + 1})
                      </div>
                      <div className="flex-grow p-5 overflow-y-auto">
                         <pre className="text-sm font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">{files['main.py']}</pre>
                      </div>
                   </div>

                   <div className="w-full md:w-1/2 flex flex-col bg-[#0a0c10]">
                      <div className="bg-[#161b22] px-4 py-3 border-b border-stone-800 text-amber-500 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                        <Code2 size={16}/> Instructor's Solution (Step {currentStepIndex + 1})
                      </div>
                      <div className="flex-grow relative">
                         <Editor height="100%" defaultLanguage="python" theme="vs-dark" value={officialSolutionSteps[currentStepIndex] || "# No official solution provided for this specific step."} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} />
                      </div>
                   </div>
                </div>

                <div className="p-4 border-t border-stone-800 bg-[#161b22] flex justify-end">
                  <button onClick={() => setShowSolutionModal(false)} className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-bold transition-colors">Close Code Review</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
              <div className="w-full bg-black rounded-2xl overflow-hidden shadow-xl aspect-video border border-stone-200 relative select-none">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`} title={activeVideo.title} frameBorder="0" allowFullScreen></iframe>
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center mix-blend-difference">
                  <motion.div animate={{ x:[-150, 150, 150, -150, -150], y:[-80, -80, 80, 80, -80] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute text-white/30 font-mono text-sm md:text-lg font-bold tracking-widest pointer-events-none drop-shadow-md transform -rotate-12">
                    {user?.primaryEmailAddress?.emailAddress || user?.id} <br/><span className="text-xs">DO NOT DISTRIBUTE</span>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="w-full bg-stone-900 rounded-2xl shadow-xl aspect-video border border-stone-200 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-stone-800 rounded-full flex items-center justify-center mb-4">
                  <Clock size={40} className="text-amber-500" />
                </div>
                {/* 🚨 THE NEW NATIVE LIVE CLASS LINK */}
                <Link href={`/live/${params.slug}`} className="px-8 py-4 rounded-full bg-amber-500 text-stone-900 font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg mt-4">
                  <PlayCircle size={20} /> Enter Live Classroom
                </Link>
                {courseDetails?.liveLink ? (
                  <a href={courseDetails.liveLink} target="_blank" rel="noreferrer" className="px-8 py-4 rounded-full bg-amber-500 text-stone-900 font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg">
                    <PlayCircle size={20} /> Join Today's Live Class on Google Meet
                  </a>
                ) : (
                  <p className="text-stone-400 max-w-md">Once the live sessions begin, the recordings will be automatically uploaded and unlocked here.</p>
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
                    <button disabled className="px-6 py-3 rounded-xl bg-green-50 text-green-600 font-bold text-sm flex items-center justify-center gap-2 border border-green-200 w-full sm:w-auto">
                      <CheckCircle size={18} /> Video Watched
                    </button>
                  ) : (
                    <button onClick={markAsComplete} disabled={isMarking} className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors w-full sm:w-auto shadow-md disabled:opacity-70">
                      {isMarking ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18} />} Mark Video Complete
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeVideo && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-10">
                <div className="flex overflow-x-auto border-b border-stone-100 bg-stone-50/50">
                  <button onClick={() => setActiveTab('description')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'description' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                    <AlignLeft size={18} /> Lesson Details
                  </button>
                  <button onClick={() => setActiveTab('qa')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'qa' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                    <MessageCircle size={18} /> Q&A ({comments.length})
                  </button>
                  {activeVideo.githubAssignment && (
                    <>
                      <button onClick={() => setActiveTab('practice')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'practice' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                        <Code size={18} /> Practice {isAssignmentCompleted && "✅"}
                      </button>
                      <button onClick={() => setActiveTab('visualize')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'visualize' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}>
                        <Eye size={18} /> Visualize 👁️
                      </button>
                    </>
                  )}
                </div>

                <div className="p-0 md:p-0">
                  
                  {activeTab === 'description' && (
                    <div className="p-6 md:p-8 prose prose-stone max-w-none">
                      <p className="text-stone-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{activeVideo.description}</p>
                    </div>
                  )}

                  {activeTab === 'qa' && (
                    <div className="p-6 md:p-8 flex flex-col gap-6">
                      <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ask Shivam or the community..." className="w-full p-4 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all" rows={3} required />
                        <div className="flex justify-end">
                          <button type="submit" disabled={isPosting} className="px-6 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-sm flex items-center gap-2 hover:bg-stone-800 transition-colors disabled:opacity-70 shadow-md">
                            {isPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />} Post Question
                          </button>
                        </div>
                      </form>
                      <div className="space-y-6 pt-6 border-t border-stone-100">
                        {comments.length === 0 ? <p className="text-center text-stone-400 text-sm italic py-4">No questions yet. Start the discussion!</p> : comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4">
                            <img src={comment.user_image || "https://www.gravatar.com/avatar/?d=mp"} alt="User" className="w-10 h-10 rounded-full border border-stone-200 shadow-sm" />
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

                  {/* 🚨 THE UPDATED KODEKLOUD LAB: VFS SYNC */}
                  {activeTab === 'practice' && activeVideo.githubAssignment && (
                    <div className="flex flex-col lg:flex-row h-[700px] bg-[#0d1117] overflow-hidden border-t border-stone-200 shadow-inner">
                      
                      <div className="w-full lg:w-1/3 flex flex-col border-r border-stone-800 bg-[#161b22]">
                        <div className="flex justify-between items-center p-3 border-b border-stone-800 bg-[#0d1117]">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                            <FileCheck size={14} className="text-amber-500" /> Task {currentStepIndex + 1} of {assignmentSteps.length}
                          </span>
                        </div>

                        <div className="flex-grow p-6 overflow-y-auto">
                          <div className="flex gap-1.5 w-full justify-center mb-6">
                            {assignmentSteps.map((_, idx) => (
                              <div key={idx} className={`h-1.5 w-8 rounded-full ${idx < currentStepIndex ? 'bg-green-500' : idx === currentStepIndex ? 'bg-blue-500' : 'bg-stone-700'}`} />
                            ))}
                          </div>
                          
                          <h3 className="text-xl font-bold text-white mb-6">{activeVideo.githubAssignment.title}</h3>
                          <div className="prose prose-invert max-w-none text-sm text-stone-300 leading-relaxed mb-8 whitespace-pre-wrap font-sans">
                            {assignmentSteps[currentStepIndex] || "Loading instructions..."}
                          </div>
                          
                          {aiResponse && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl flex gap-3 items-start mt-6">
                              <div className="text-2xl">🤖</div>
                              <div>
                                <h4 className="font-bold text-purple-300 text-xs uppercase tracking-widest mb-1">AI Assistant</h4>
                                <p className="text-purple-200 text-xs leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        <div className="p-4 border-t border-stone-800 bg-[#0d1117] flex justify-between items-center gap-2">
                          <button onClick={() => handleStepChange(Math.max(0, currentStepIndex - 1))} disabled={currentStepIndex === 0} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${currentStepIndex === 0 ? 'text-stone-600 cursor-not-allowed' : 'text-stone-300 hover:bg-stone-800 hover:text-white'}`}>
                            <ChevronLeft size={16} /> Prev
                          </button>

                          <div className="flex items-center gap-2">
                            {officialSolutionSteps.length > 0 && (
                              <button onClick={() => setShowSolutionModal(true)} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-colors border border-stone-700">View Solution</button>
                            )}
                            {currentStepIndex < assignmentSteps.length - 1 ? (
                              <button onClick={() => handleStepChange(currentStepIndex + 1)} className="flex items-center gap-1 px-4 py-2 bg-stone-800 rounded-lg text-sm font-bold text-amber-500 hover:bg-stone-700 hover:text-amber-400 transition-colors border border-stone-700 shadow-sm">
                                Next <ChevronRight size={16} />
                              </button>
                            ) : (
                              <button onClick={submitAssignment} disabled={isSubmittingAssignment} className={`px-4 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-2 transition-colors shadow-md ${isAssignmentCompleted ? 'bg-green-600 text-white' : 'bg-amber-500 hover:bg-amber-400 text-stone-900'}`}>
                                {isSubmittingAssignment ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} {isAssignmentCompleted ? "Update" : "Submit"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Panel: File Tabs & Editor */}
                      <div className="w-full lg:w-2/3 flex flex-col bg-[#0d1117]">
                        
                        <div className="flex bg-[#161b22] border-b border-stone-800 justify-between items-center pr-4 overflow-x-auto">
                          <div className="flex">
                            {Object.keys(files).map(filename => (
                              <div 
                                key={filename} 
                                onClick={() => setActiveFile(filename)}
                                className={`px-4 py-2.5 text-xs font-mono flex items-center gap-2 cursor-pointer border-r border-stone-800 ${activeFile === filename ? 'bg-[#0d1117] text-amber-400 border-t-2 border-t-amber-500' : 'bg-[#161b22] text-stone-500 hover:text-stone-300 border-t-2 border-t-transparent'}`}
                              >
                                <FileText size={14} /> {filename}
                                {filename !== 'main.py' && (
                                  <X size={12} className="hover:text-red-400 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}/>
                                )}
                              </div>
                            ))}
                            <button onClick={handleAddFile} className="px-3 py-2 text-stone-500 hover:text-white transition-colors"><Plus size={16} /></button>
                          </div>
                          
                          <div className="flex gap-2 shrink-0 py-1.5">
                            <button onClick={askAITutor} disabled={!files['main.py']?.trim() || isAskingAI} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-purple-400 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-stone-700 disabled:opacity-50">
                              {isAskingAI ? <Loader2 size={12} className="animate-spin"/> : <MessageCircle size={12}/>} Ask AI
                            </button>
                            <button onClick={runPythonCode} disabled={isRunningCode || isPyodideLoading || isFetchingCode} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50">
                              {isPyodideLoading || isFetchingCode ? <Loader2 size={12} className="animate-spin"/> : isRunningCode ? <Loader2 size={12} className="animate-spin"/> : <PlayCircle size={12}/>} Run
                            </button>
                          </div>
                        </div>

                        <div className="flex-grow relative">
                          <Editor 
                            height="100%" 
                            defaultLanguage={getLanguage(activeFile)} 
                            theme="vs-dark" 
                            value={files[activeFile] || ""} 
                            onChange={(value) => { 
                              setFiles(prev => ({ ...prev, [activeFile]: value || "" })); 
                              setAiResponse(null); 
                            }} 
                            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} 
                          />
                        </div>

                        <div className="h-[200px] border-t border-stone-800 flex flex-col bg-[#0d1117]">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-stone-800">
                            <div className="flex gap-4">
                              <span className="text-xs font-mono text-white border-b border-blue-500 pb-1">TERMINAL</span>
                              <span className="text-xs font-mono text-stone-600">OUTPUT</span>
                            </div>
                            <button onClick={() => setOutput("")} className="text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1"><RefreshCw size={12}/> Clear</button>
                          </div>
                          <div className="flex-grow p-4 overflow-y-auto bg-[#0d1117]">
                            <pre className={`text-sm font-mono whitespace-pre-wrap ${output.startsWith('Error') || output.startsWith('Syntax') || output.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>{output || "shivam@academy:~$ _"}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISUALIZER TAB */}
                  {activeTab === 'visualize' && activeVideo.githubAssignment && (
                    <div className="p-6 md:p-8 flex flex-col gap-6">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-blue-800 mb-1">Code Visualizer</h4>
                          <p className="text-blue-900/70 text-sm">Note: The visualizer only steps through your <code className="bg-blue-100 px-1 rounded">main.py</code> file.</p>
                        </div>
                      </div>
                      <div className="w-full bg-[#fdfcf8] rounded-xl border border-stone-200 shadow-inner overflow-hidden h-[600px] flex flex-col">
                        <div className="h-10 bg-stone-100 border-b border-stone-200 flex items-center px-4 gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          <span className="text-xs font-mono font-bold text-stone-400 ml-4">shivam-academy-visualizer.exe</span>
                        </div>
                        <div className="flex-grow bg-[#fdfcf8] relative overflow-hidden">
                          <iframe className="absolute top-0 left-0 w-full h-full" style={{ filter: "contrast(0.95) sepia(0.05)", mixBlendMode: "multiply" }} frameBorder="0" src={`https://pythontutor.com/iframe-embed.html#code=${encodeURIComponent(files['main.py'] || "")}&cumulative=false&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&py=3&rawInputLstJSON=%5B%5D&textReferences=false`}></iframe>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* Playlist Column */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[600px] overflow-hidden sticky top-32">
            <div className="p-5 border-b border-stone-100 bg-stone-50">
              <h3 className="font-black text-stone-900 text-lg">Course Progress</h3>
              <p className="text-stone-500 text-sm mt-1">{completedTasks}/{totalTasks} Tasks Completed ({progressPercentage}%)</p>
              <div className="w-full bg-stone-200 rounded-full h-2 mt-4 overflow-hidden mb-4">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
              
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

      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-10 right-10 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] border border-green-400"
          >
            <div className="bg-white/20 p-2 rounded-full"><Award size={24} className="text-white" /></div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-widest">Success!</h4>
              <p className="text-xs text-green-100 font-medium">Your code has been securely saved.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}