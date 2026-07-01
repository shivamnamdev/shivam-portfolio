'use client';
import { useState, useEffect } from 'react';
import { useUser, UserButton } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlayCircle, CheckCircle, CheckCircle2, Lock, ChevronLeft, ChevronRight, Loader2, Clock, MessageCircle, AlignLeft, Send, Code, Code2, TerminalSquare, Award, FileCheck, Eye, RefreshCw, X, Plus, FileText, ThumbsUp, Share2 } from 'lucide-react';
import Link from 'next/link';
import { courseCurriculumMap } from '@/data/learning-content';
import { activeCourses } from '@/data/courses';
import { supabase } from '@/lib/supabaseClient';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import GitGraphVisualizer from '@/components/GitGraphVisualizer';

const ADMIN_EMAIL = "shivamnamdev.corp@gmail.com";

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
  const isAdmin = user?.primaryEmailAddress?.emailAddress === ADMIN_EMAIL;
  
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

  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);

  const [files, setFiles] = useState<Record<string, string>>({ "main.py": "" });
  const [activeFile, setActiveFile] = useState("main.py");
  const [stepFiles, setStepFiles] = useState<Record<string, string>[]>([]); 
  
  const [output, setOutput] = useState("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  
  const [examStatus, setExamStatus] = useState({ is_passed: false, attempts_used: 0 });
  const [toastConfig, setToastConfig] = useState<{show: boolean, title: string, desc: string, type: 'success'|'error'}>({ show: false, title: "", desc: "", type: "success" });
  
  const [officialSolutionSteps, setOfficialSolutionSteps] = useState<string[]>([]);
  const [showSolutionModal, setShowSolutionModal] = useState(false);

  // 🚨 THE FIX: Changed from a single string to an Array of strings!
  const [expectedOutcomeSteps, setExpectedOutcomeSteps] = useState<string[]>([]);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  
  const [assignmentSteps, setAssignmentSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [pyodide, setPyodide] = useState<any>(null);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);

  const courseDetails = activeCourses.find(c => c.slug === params.slug);
  const activeAssignment = activeVideo?.githubAssignment;
  const activeLabType = activeAssignment?.labType === "git" ? "git" : "python";
  const isGitLab = activeLabType === "git";
  const isPythonLab = activeLabType === "python";
  const [gitCommandInput, setGitCommandInput] = useState("");
  const [gitCommandHistory, setGitCommandHistory] = useState<string[]>([]);
  const [gitRepoState, setGitRepoState] = useState<Record<string, any>>({
    branch: "main",
    staged: [],
    modified: [],
    commits: []
  });

  const resetGitLabState = () => {
    setGitCommandInput("");
    setGitCommandHistory([]);
    setGitRepoState({
    branch: "main",
    staged: [],
    modified: [],
    commits: []
    });
    };

  const showToast = (title: string, desc: string, type: 'success' | 'error' = 'success') => {
    setToastConfig({ show: true, title, desc, type });
    setTimeout(() => setToastConfig(prev => ({ ...prev, show: false })), 5000);
  };

  useEffect(() => {
    if (isGitLab) {
      setIsPyodideLoading(false);
      return;
    }
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
  },[isGitLab]);

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

      let starterCodeSteps = ["# Write your Python code below:\n\n"];
      if (assignmentObj.starterCodeUrl) {
        try {
          const starterRes = await fetch(`${assignmentObj.starterCodeUrl}?t=${Date.now()}`);
          if (starterRes.ok) {
            const rawStarter = await starterRes.text();
            const parsedStarter = rawStarter.split(/^#\s*-{10,}\s*$/gm).map(s => s.trim()).filter(s => s.length > 0);
            if (parsedStarter.length > 0) starterCodeSteps = parsedStarter;
          }
        } catch (e) {}
      }

      let supportingWorkspace: Record<string, string> = {};
      if (assignmentObj.supportingFiles) {
        for (const file of assignmentObj.supportingFiles) {
          try {
            const res = await fetch(`${file.rawUrl}?t=${Date.now()}`);
            supportingWorkspace[file.filename] = await res.text();
          } catch (err) {}
        }
      }
      
      const initialFilesArray = Array.from({ length: finalSteps.length }, (_, idx) => ({ 
        ...supportingWorkspace,
        "main.py": starterCodeSteps[idx] || starterCodeSteps[0] || "# Write your Python code below:\n\n"
      }));

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

      // 🚨 THE FIX: Fetch Expected Outcome and SPLIT IT into steps!
      if (assignmentObj.expectedOutcomeUrl) {
        const outRes = await fetch(`${assignmentObj.expectedOutcomeUrl}?t=${Date.now()}`);
        if (outRes.ok) {
          const rawOut = await outRes.text();
          // Split using the exact same logic as your solutions/assignments
          const outSteps = rawOut.split(/^#\s*-{10,}\s*$/gm).map(s => s.trim()).filter(s => s.length > 0);
          setExpectedOutcomeSteps(outSteps.length > 0 ? outSteps : [rawOut]);
        } else {
          setExpectedOutcomeSteps(["# Expected outcome file could not be loaded."]);
        }
      } else {
        setExpectedOutcomeSteps([]);
      }

    } catch (error) {
      setAssignmentSteps(["Error loading assignment instructions from GitHub."]);
      setStepFiles([{ "main.py": "" }]);
      setFiles({ "main.py": "" });
      setOfficialSolutionSteps([]);
      setExpectedOutcomeSteps([]);
    } finally {
      setIsFetchingCode(false);
    }
  };

  const loadGitLabAssignment = async (assignmentObj: any) => {
  setIsFetchingCode(true);
  console.log("🔍 Attempting to load Git assignment:", assignmentObj);
  try {
    // Fetch instructions
    if (assignmentObj.instructionsUrl) {
      console.log("📥 Fetching instructions from:", assignmentObj.instructionsUrl);
      const instructRes = await fetch(`${assignmentObj.instructionsUrl}?t=${Date.now()}`);
      console.log("📦 Response status:", instructRes.status);
      if (instructRes.ok) {
        const rawInstructions = await instructRes.text();
        console.log("✅ Raw instructions fetched:", rawInstructions.substring(0, 100));
        const steps = rawInstructions.split(/^---+$/gm).map(s => s.trim()).filter(s => s.length > 0);
        setAssignmentSteps(steps.length > 0 ? steps : [rawInstructions]);
      } else {
        console.error("❌ Failed to fetch instructions, status:", instructRes.status);
        setAssignmentSteps(["Error loading Git lab instructions."]);
      }
    }
    // ... rest of function
  } catch (error) {
    console.error("💥 Error in loadGitLabAssignment:", error);
    setAssignmentSteps(["Error loading Git lab assignment."]);
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

        const [vidRes, assRes, examRes] = await Promise.all([
          supabase.from('video_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug),
          supabase.from('assignment_progress').select('video_id').eq('user_id', user.id).eq('course_slug', params.slug),
          supabase.from('exam_progress').select('*').eq('user_id', user.id).eq('course_slug', params.slug).single()
        ]);

        setCompletedVideos(vidRes.data ? vidRes.data.map(p => p.video_id) :[]);
        setCompletedAssignments(assRes.data ? assRes.data.map(p => p.video_id) :[]);
        if (examRes.data) setExamStatus({ is_passed: examRes.data.is_passed, attempts_used: examRes.data.attempts_used });

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
          const urlParams = new URLSearchParams(window.location.search);
          const videoParam = urlParams.get('v');
          
          let targetVideo = null;
          if (videoParam) {
            for (const mod of enrichedModules) {
              const found = mod.videos.find((v: any) => v.id === videoParam);
              if (found) { targetVideo = found; break; }
            }
          }
          
          const initialVideo = targetVideo || enrichedModules[0].videos[0];
          setActiveVideo(initialVideo);
          
          if (initialVideo.githubAssignment) {
            if (initialVideo.githubAssignment.labType === "git") {
              resetGitLabState();
              setAssignmentSteps(["Git lab ready. Start with a command below."]);
              loadGitLabAssignment(initialVideo.githubAssignment);
            } else {
              loadGithubAssignment(initialVideo.githubAssignment);
            }
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

  useEffect(() => {
    async function fetchLikesAndComments() {
      if (!activeVideo || !user) return;
      const { data: commentData } = await supabase.from('video_comments').select('*').eq('video_id', activeVideo.id).order('created_at', { ascending: false });
      if (commentData) setComments(commentData);

      const { data: likesData } = await supabase.from('video_likes').select('user_id').eq('video_id', activeVideo.id);
      if (likesData) {
        setLikesCount(likesData.length);
        setHasLiked(likesData.some(l => l.user_id === user.id));
      }
    }
    fetchLikesAndComments();
  }, [activeVideo, user]);

  const handleVideoChange = (video: any) => {
    if (activeVideo?.id === video.id) return;
    const isLockedAdvanced = video.githubAssignment?.isAdvanced && !examStatus.is_passed && !isAdmin;
    if (isLockedAdvanced) {
      alert("🔒 This advanced lesson is locked! You must pass the Final Exam with 80% or higher to unlock it.");
      return;
    }

    setActiveVideo(video);
    setOutput(""); 
    setAiResponse(null);
    setActiveTab('description'); 
    setAssignmentSteps([]);
    setCurrentStepIndex(0);
    setOfficialSolutionSteps([]);
    setExpectedOutcomeSteps([]); // 🚨 Reset on video change
    setHasLiked(false);
    setLikesCount(0);
    
    if (video.githubAssignment) {
      if (video.githubAssignment.labType === "git") {
        resetGitLabState();
        setAssignmentSteps(["Loading instructions..."]);
        loadGitLabAssignment(video.githubAssignment);
      } else {
        setAssignmentSteps(["Loading instructions..."]);
        setFiles({ "main.py": "# Loading workspace..." });
        setActiveFile("main.py");
        loadGithubAssignment(video.githubAssignment);
      }
    } else {
      setStepFiles([]);
      setFiles({ "main.py": "" });
      resetGitLabState();
    }
  };

  const handleStepChange = (newIndex: number) => {
    const isCarryOver = activeVideo?.githubAssignment?.carryOverCode;
    if (isCarryOver) {
      setCurrentStepIndex(newIndex);
      setOutput("");
      setAiResponse(null);
    } else {
      const newStepFiles = [...stepFiles];
      newStepFiles[currentStepIndex] = files;
      setStepFiles(newStepFiles);

      setFiles(newStepFiles[newIndex] || { "main.py": "# Write your Python code below:\n\n" });
      setActiveFile("main.py");
      setCurrentStepIndex(newIndex);
      setOutput("");
      setAiResponse(null);
    }
  };

  const handleAddFile = () => {
    const name = prompt("Enter file name (e.g., utils.py or data.txt):");
    if (name) {
      if (name in files) alert("A file with this name already exists.");
      else { setFiles(prev => ({ ...prev, [name]: "" })); setActiveFile(name); }
    }
  };

  const handleDeleteFile = (name: string) => {
    if (name === 'main.py') return alert("You cannot delete main.py!");
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const newFiles = { ...files };
      delete newFiles[name];
      setFiles(newFiles);
      if (activeFile === name) setActiveFile("main.py");
      if (pyodide) { try { pyodide.FS.unlink(name); } catch (e) {} }
    }
  };

  const toggleLike = async () => {
    if (!user || !activeVideo) return;
    try {
      if (hasLiked) {
        setHasLiked(false);
        setLikesCount(prev => prev - 1);
        await supabase.from('video_likes').delete().eq('video_id', activeVideo.id).eq('user_id', user.id);
      } else {
        setHasLiked(true);
        setLikesCount(prev => prev + 1);
        await supabase.from('video_likes').insert([{ video_id: activeVideo.id, user_id: user.id }]);
      }
    } catch (err) {}
  };

  const handleAdminShare = async () => {
    const shareUrl = `https://shivamnamdev.com/share/${activeVideo.youtubeId}?t=${Date.now()}`;
    const shareText = `🚀 Ready to Master Python?\n\nCheck out this exclusive lesson: *${activeVideo?.title}* from Shivam Academy!\n\n🎓 Click here to watch the video directly:\n${shareUrl}\n\n💻 Enroll here to unlock the full platform, interactive labs, and the AI code tutor:\nhttps://shivamnamdev.com/courses/${params.slug}`;
    if (navigator.share) { try { await navigator.share({ title: activeVideo?.title || "Shivam Academy", text: shareText }); } catch (err) {} } 
    else { navigator.clipboard.writeText(shareText); alert("Branded share message copied! Paste it in WhatsApp and wait 3 seconds for your thumbnail to appear!"); }
  };

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
    } finally { setIsMarking(false); }
  };

  const submitAssignment = async () => {
    if (!user || !activeVideo || isSubmittingAssignment) return;
    if (isGitLab) {
      setIsSubmittingAssignment(true);
      try {
        const studentName =
          user.fullName ||
          user.firstName ||
          user.primaryEmailAddress?.emailAddress ||
          "Student";

        const gitSubmission = {
          labType: "git",
          commandHistory: gitCommandHistory,
          repoState: gitRepoState,
          currentStepIndex,
          assignmentTitle: activeVideo.githubAssignment?.title || activeVideo.title,
          submittedAt: new Date().toISOString()
        };

        const { error } = await supabase.from("assignment_progress").upsert(
          {
            user_id: user.id,
            course_slug: params.slug,
            video_id: activeVideo.id,
            submitted_code: JSON.stringify(gitSubmission, null, 2),
            user_name: studentName,
            completed_at: new Date().toISOString()
          },
          { onConflict: "user_id,course_slug,video_id" }
        );

        if (error) throw error;

        if (!completedAssignments.includes(activeVideo.id)) {
          setCompletedAssignments(prev => [...prev, activeVideo.id]);
          supabase.from("admin_activity_log").insert([
            {
              type: "submission",
              message: "New Git Lab Submission: " + (activeVideo.githubAssignment?.title || activeVideo.title),
              user_email: user.primaryEmailAddress?.emailAddress
            }
          ]).then();
        }

        showToast("Success!", "Your Git lab state has been saved.", "success");
      } catch (err) {
        showToast("Error", "Failed to submit Git lab. Please try again.", "error");
      } finally {
        setIsSubmittingAssignment(false);
      }
      return;
    }
    const isExam = activeVideo.githubAssignment?.isExam;
    
    if (isExam) {
      if (examStatus.attempts_used >= 5 && !examStatus.is_passed && !isAdmin) {
        showToast("Maximum Attempts Reached", "You have used all 5 attempts for this exam.", "error");
        return;
      }
      setIsSubmittingAssignment(true);
      setOutput("Running Full Exam Auto-Grader...");
      
      try {
        await pyodide.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
        `);
        
        const finalStepFiles = [...stepFiles];
        finalStepFiles[currentStepIndex] = files;
        const combinedCode = finalStepFiles.map(stepDict => Object.values(stepDict).join('\n\n')).join('\n\n');
        
        try {
          await pyodide.runPythonAsync(combinedCode);
          if (activeVideo.githubAssignment.testCode) {
            await pyodide.runPythonAsync(activeVideo.githubAssignment.testCode);
          }
        } catch(e) {}
        
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        const match = stdout.match(/EXAM_SCORE:\s*(\d+)/);
        const score = match ? parseInt(match[1]) : 0;

        setOutput(stdout || "Failed to generate exam report.");

        const isPassed = score >= 80;
        const newAttempts = examStatus.attempts_used + 1;

        const { error } = await supabase.from('exam_progress').upsert({
          user_id: user.id,
          course_slug: params.slug,
          attempts_used: newAttempts,
          is_passed: isPassed || examStatus.is_passed,
          last_score: score,
          completed_at: isPassed ? new Date().toISOString() : null
        }, { onConflict: 'user_id, course_slug' });

        if (error) throw error;
        setExamStatus({ is_passed: isPassed || examStatus.is_passed, attempts_used: newAttempts });

        if (isPassed) {
          showToast("🏆 EXAM PASSED!", `You scored ${score}%. All Advanced Videos are now unlocked!`, "success");
        } else {
          showToast("❌ Exam Failed", `You scored ${score}%. You need 80% to pass. Attempts left: ${5 - newAttempts}`, "error");
        }
      } catch (err) {
        showToast("Error", "Failed to grade exam. Try again.", "error");
      } finally {
        setIsSubmittingAssignment(false);
      }
      return; 
    }

    setIsSubmittingAssignment(true);
    try {
      const isCarryOver = activeVideo?.githubAssignment?.carryOverCode;
      let combinedCode = "";

      if (isCarryOver) {
        combinedCode = Object.entries(files).map(([name, cont]) => `# --- File: ${name} ---\n${cont}`).join('\n\n');
      } else {
        const finalStepFiles = [...stepFiles];
        finalStepFiles[currentStepIndex] = files;
        combinedCode = finalStepFiles.map((stepDict, idx) => {
          const safeDict = stepDict || { "main.py": "# No code provided" };
          const filesText = Object.entries(safeDict).map(([name, cont]) => `# --- File: ${name} ---\n${cont}`).join('\n\n');
          return `# === Step ${idx + 1} ===\n${filesText}`;
        }).join('\n\n');
      }
      
      const studentName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress || 'Student';
      const { error } = await supabase.from('assignment_progress').upsert(
        { user_id: user.id, course_slug: params.slug, video_id: activeVideo.id, submitted_code: combinedCode, user_name: studentName, completed_at: new Date().toISOString() },
        { onConflict: 'user_id, course_slug, video_id' }
      );
      if (error) throw error;
      
      if (!completedAssignments.includes(activeVideo.id)) {
        setCompletedAssignments(prev => [...prev, activeVideo.id]);
        supabase.from('admin_activity_log').insert([{ type: 'submission', message: `New Code Submission: ${activeVideo.githubAssignment?.title || activeVideo.title}`, user_email: user.primaryEmailAddress?.emailAddress }]).then();
      }
      
      showToast("Success!", "Your code has been securely saved.", "success");
      if (officialSolutionSteps.length > 0) setShowSolutionModal(true);

    } catch (err) {
      showToast("Error", "Failed to submit assignment. Please try again.", "error");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const runPythonCode = async () => {
    if (!files['main.py'].trim() || !pyodide) return;
    setIsRunningCode(true);
    setOutput("Running script...");
    try {
      await pyodide.runPythonAsync(`
import sys
import io
import builtins
from js import prompt
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
def custom_input(p=""):
    sys.stdout.write(str(p))
    val = prompt(str(p))
    if val is None:
        sys.stdout.write("\\n")
        raise EOFError("EOF when reading a line")
    sys.stdout.write(val + "\\n")
    return val
builtins.input = custom_input
      `);
      
      try {
        const pyodideFiles = pyodide.FS.readdir('.');
        for (const fname of pyodideFiles) {
          if (fname !== '.' && fname !== '..') {
            const stat = pyodide.FS.stat(fname);
            if (pyodide.FS.isFileSync(stat.mode)) pyodide.FS.unlink(fname);
          }
        }
      } catch(e) {}

      for (const [fname, content] of Object.entries(files)) {
        pyodide.FS.writeFile(fname, content);
      }

      await pyodide.runPythonAsync(files['main.py']);
      
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");
      let finalOutput = stdout;

      const isExam = activeVideo?.githubAssignment?.isExam;

      if (!stderr && activeVideo?.githubAssignment?.testCode && !isExam) {
        try {
          await pyodide.runPythonAsync(activeVideo.githubAssignment.testCode);
          finalOutput += "\n\n✅ --------------------------\n✅ ALL TESTS PASSED! Great job.\n✅ --------------------------";
        } catch (testError: any) {
          const errorMsg = testError.message.split('AssertionError:')[1]?.strip() || "Test Failed: Output did not match expected results.";
          finalOutput += `\n\n❌ --------------------------\n❌ ${errorMsg}\n❌ --------------------------`;
        }
      }

      if (isExam && !stderr) {
        finalOutput += "\n\n(Note: This is an Exam. Your code will be officially graded when you click 'Submit Exam' on the final step!)";
      }

      try {
        const currentPyodideFiles = pyodide.FS.readdir('.');
        const syncedFiles = { ...files };
        for (const fname of currentPyodideFiles) {
          if (fname !== '.' && fname !== '..') {
            const stat = pyodide.FS.stat(fname);
            if (pyodide.FS.isFileSync(stat.mode)) syncedFiles[fname] = pyodide.FS.readFile(fname, { encoding: 'utf8' });
          }
        }
        for (const fname in files) {
          if (!currentPyodideFiles.includes(fname)) delete syncedFiles[fname];
        }
        setFiles(syncedFiles);
      } catch(e) {}

      if (stderr) setOutput(`Error:\n${stderr}`);
      else setOutput(finalOutput || "Script executed successfully. (No output)");
    } catch (error: any) {
      setOutput(`Syntax Error:\n${error.message.split('File "<exec>"')[1] || error.message}`);
    } finally {
      setIsRunningCode(false);
    }
  };
  const runGitCommand = async () => {
  const cmd = gitCommandInput.trim();
  if (!cmd) return;

  // Handle clear separately — reset terminal
  if (cmd === "clear") {
    setGitCommandHistory([]);
    setOutput("");
    setGitCommandInput("");
    return;
  }

  const nextHistory = [...gitCommandHistory, "$ " + cmd];
  const nextState = { ...gitRepoState };
  nextState.files = nextState.files || {};
  nextState.branches = nextState.branches || ["main"];
  let response = "";

  if (cmd === "git init") {
    response = "Initialized empty Git repository in .git/";
  }
  else if (cmd === "git status") {
    const staged = nextState.staged || [];
    const modified = nextState.modified || [];
    let out = "On branch " + nextState.branch + "\n";
    if (!staged.length && !modified.length) {
      out += "nothing to commit, working tree clean";
    } else {
      if (staged.length) out += "Changes to be committed:\n  " + staged.map((f: string) => "new file: " + f).join("\n  ");
      if (modified.length) out += "\nChanges not staged for commit:\n  " + modified.map((f: string) => "modified: " + f).join("\n  ");
    }
    response = out;
  }
  else if (cmd.startsWith("git add ")) {
    const target = cmd.replace("git add ", "").trim();
    const toStage = target === "." ? [...(nextState.modified || []), ...(Object.keys(nextState.files || {}))] : [target];
    nextState.staged = Array.from(new Set([...(nextState.staged || []), ...toStage]));
    nextState.modified = (nextState.modified || []).filter((f: string) => !toStage.includes(f));
    response = toStage.length ? "staged: " + toStage.join(", ") : "nothing to stage";
  }
  else if (cmd.startsWith("git commit -m ")) {
    const msg = cmd.replace("git commit -m ", "").replace(/^["']|["']$/g, "");
    const staged = nextState.staged || [];
    if (!staged.length) {
      response = "nothing to commit, working tree clean";
    } else {
      const hash = Math.random().toString(36).substring(2, 9);
      nextState.commits = [...(nextState.commits || []), { hash, message: msg || "commit", files: staged, branch: nextState.branch, ts: Date.now() }];
      nextState.staged = [];
      response = "[" + nextState.branch + " " + hash + "] " + (msg || "commit") + "\n " + staged.length + " file" + (staged.length > 1 ? "s" : "") + " changed";
    }
  }
  else if (cmd === "git log" || cmd === "git log --oneline") {
    const commits = [...(nextState.commits || [])].reverse();
    if (!commits.length) { response = "no commits yet"; }
    else if (cmd === "git log --oneline") {
      response = commits.map((c: any) => (c.hash || "abc1234") + " " + c.message).join("\n");
    } else {
      response = commits.map((c: any) =>
        "commit " + (c.hash || "abc1234") + "\nDate: " + new Date(c.ts).toLocaleString() + "\n\n    " + c.message
      ).join("\n\n");
    }
  }
  else if (cmd === "git branch") {
    const branches = nextState.branches || ["main"];
    response = branches.map((b: string) => (b === nextState.branch ? "* " : "  ") + b).join("\n");
  }
  else if (cmd.startsWith("git checkout -b ")) {
    const newBranch = cmd.replace("git checkout -b ", "").trim();
    if (!newBranch) { response = "branch name required"; }
    else if ((nextState.branches || []).includes(newBranch)) { response = "fatal: A branch named '" + newBranch + "' already exists."; }
    else {
      nextState.branches = [...(nextState.branches || ["main"]), newBranch];
      nextState.branch = newBranch;
      response = "Switched to a new branch '" + newBranch + "'";
    }
  }
  else if (cmd.startsWith("git checkout ")) {
    const target = cmd.replace("git checkout ", "").trim();
    if (!(nextState.branches || ["main"]).includes(target)) { response = "error: pathspec '" + target + "' did not match any known branch"; }
    else {
      nextState.branch = target;
      response = "Switched to branch '" + target + "'";
    }
  }
  else if (cmd.startsWith("git merge ")) {
    const target = cmd.replace("git merge ", "").trim();
    if (!(nextState.branches || []).includes(target)) { response = "fatal: branch '" + target + "' not found"; }
    else if (target === nextState.branch) { response = "Already up to date."; }
    else { response = "Merge made by the 'ort' strategy.\n Fast-forward"; }
  }
  else if (cmd.startsWith("git diff")) {
    const staged = nextState.staged || [];
    const modified = nextState.modified || [];
    if (!staged.length && !modified.length) response = "(no changes to diff)";
    else response = "diff --git a/file b/file\n--- a/file\n+++ b/file\n@@ -1 +1 @@\n+your changes here";
  }
  else if (cmd.startsWith("git remote add ")) {
    const parts = cmd.replace("git remote add ", "").trim().split(" ");
    nextState.remotes = nextState.remotes || {};
    nextState.remotes[parts[0]] = parts[1] || "";
    response = "";
  }
  else if (cmd === "git remote -v") {
    const remotes = nextState.remotes || {};
    response = Object.keys(remotes).length
      ? Object.entries(remotes).map(([n, u]) => n + "\t" + u + " (fetch)\n" + n + "\t" + u + " (push)").join("\n")
      : "(no remotes configured)";
  }
  else if (cmd === "git push" || cmd.startsWith("git push ")) {
    const remotes = nextState.remotes || {};
    if (!Object.keys(remotes).length) response = "fatal: No remote repository configured.\nUse: git remote add origin <url>";
    else response = "Enumerating objects: " + (nextState.commits || []).length + ", done.\nTo " + Object.values(remotes)[0] + "\n * [new branch] " + nextState.branch + " -> " + nextState.branch;
  }
  else if (cmd.startsWith("git pull")) {
    response = "Already up to date.";
  }
  else if (cmd.startsWith("git stash")) {
    if (cmd === "git stash") {
      const staged = nextState.staged || [];
      nextState.stash = nextState.stash || [];
      if (!staged.length) response = "No local changes to save";
      else {
        nextState.stash.push(staged);
        nextState.staged = [];
        response = "Saved working directory and index state WIP on " + nextState.branch + ": stash@{0}";
      }
    } else if (cmd === "git stash pop") {
      if (!(nextState.stash || []).length) response = "No stash entries found.";
      else {
        const top = nextState.stash.pop();
        nextState.staged = [...(nextState.staged || []), ...top];
        response = "Restored stash@{0}";
      }
    }
  }
  else if (cmd.startsWith("touch ") || cmd.startsWith("echo ")) {
    const filename = cmd.startsWith("touch ") ? cmd.replace("touch ", "").trim() : cmd.split(">").pop()?.trim() || "file.txt";
    nextState.files = { ...(nextState.files || {}), [filename]: "" };
    nextState.modified = Array.from(new Set([...(nextState.modified || []), filename]));
    response = "";
  }
  else if (cmd.startsWith("ls")) {
    const fileList = Object.keys(nextState.files || {});
    response = fileList.length ? fileList.join("  ") : "(empty directory)";
  }
  else if (cmd.startsWith("mkdir ")) {
    response = "";
  }
  else if (cmd === "pwd") {
    response = "/home/student/my-project";
  }
  else {
    response = "command not found: " + cmd + "\n(Supported: git init, git status, git add, git commit -m, git log, git branch, git checkout, git merge, git diff, git remote, git push, git pull, git stash, touch, ls, clear)";
  }

  setGitRepoState(nextState);
  const newHistory = response ? [...nextHistory, response] : nextHistory;
  setGitCommandHistory(newHistory);
  setOutput(newHistory.join("\n"));
  setGitCommandInput("");
};
    const runActiveLab = async () => {
    if (isGitLab) {
      await runGitCommand();
      return;
    }
  await runPythonCode();
  };
  const askAITutor = async () => {
  if (isAskingAI) return;
  if (!isGitLab && !files['main.py'].trim()) return;
    setIsAskingAI(true);
    setAiResponse(null);
    try {
      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        labType: activeLabType,
        assignment: activeVideo.githubAssignment?.title || "Exercise",
        code: files["main.py"] || "",
        output: output || "No output yet.",
        gitContext: {
        commandInput: gitCommandInput,
        commandHistory: gitCommandHistory,
        repoState: gitRepoState
        }
        })      
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
      
      doc.setFillColor(18, 18, 18); doc.rect(0, 0, 297, 210, 'F');
      doc.setDrawColor(245, 158, 11); doc.setLineWidth(1.5); doc.rect(12, 12, 273, 186);
      doc.setDrawColor(251, 191, 36); doc.setLineWidth(0.5); doc.rect(15, 15, 267, 180);

      doc.setFont("helvetica", "bold"); doc.setFontSize(38); doc.setTextColor(255, 255, 255);
      doc.text("CERTIFICATE OF COMPLETION", 148.5, 45, { align: "center" });

      doc.setFont("helvetica", "italic"); doc.setFontSize(14); doc.setTextColor(168, 162, 158);
      doc.text("This prestigious credential is proudly presented to", 148.5, 70, { align: "center" });

      const studentName = String(user?.fullName || user?.firstName || "Dedicated Student");
      doc.setFont("helvetica", "bold"); doc.setFontSize(42); doc.setTextColor(245, 158, 11);
      doc.text(studentName.toUpperCase(), 148.5, 95, { align: "center" });

      doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(214, 211, 209);
      doc.text(`for successfully completing the curriculum and passing all technical requirements in:`, 148.5, 120, { align: "center" });
      
      doc.setFont("helvetica", "bold");
      doc.text(String(courseDetails?.title || "Python Foundation & Logic Building"), 148.5, 135, { align: "center" });

      doc.setFont("helvetica", "italic"); doc.setFontSize(12); doc.setTextColor(168, 162, 158);
      doc.text("demonstrating the ability to read, understand, debug, and build Python programs independently.", 148.5, 150, { align: "center" });

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const uniqueId = `SA-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      doc.setFont("courier", "bold"); doc.setFontSize(11); doc.setTextColor(251, 191, 36);
      doc.text(`ISSUED: ${today.toUpperCase()}`, 30, 175); doc.text(`VERIFICATION ID: ${uniqueId}`, 30, 182);

      doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(255, 255, 255);
      doc.text("Shivam Namdev", 250, 168, { align: "center" });
      doc.setDrawColor(168, 162, 158); doc.setLineWidth(0.5); doc.line(210, 172, 290, 172);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(168, 162, 158);
      doc.text("Python Mentor & Software Professional", 250, 182, { align: "center" });

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
      <div className="h-screen w-screen flex flex-col bg-[#0d1117]">
        <div className="flex-grow flex items-center justify-center flex-col gap-4">
          <Loader2 className="animate-spin text-amber-500" size={48} />
          <p className="text-stone-400 font-medium">Loading your personalized curriculum...</p>
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
    <div className="h-screen w-screen flex flex-col bg-[#0d1117] overflow-hidden text-white font-sans">
      
      {/* PRO LMS TOP BAR */}
      <header className="h-16 bg-[#161b22] border-b border-white/10 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/learning" className="flex items-center gap-2 text-stone-400 hover:text-amber-500 transition-colors font-bold text-sm">
            <ChevronLeft size={16} /> Back
          </Link>
          <div className="h-6 w-px bg-white/10 hidden md:block"></div>
          <h1 className="font-display font-black text-lg text-white truncate max-w-[200px] md:max-w-md hidden sm:block">
            {courseDetails?.title || "Python Live Session"}
          </h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:flex items-center gap-3">
             <span className="text-xs font-bold text-stone-400">{completedTasks}/{totalTasks} Completed</span>
             <div className="w-32 bg-[#0a0c10] border border-white/5 rounded-full h-2 overflow-hidden">
               <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progressPercentage}%` }}></div>
             </div>
          </div>
          {(progressPercentage === 100 || isAdmin) && (
            <button onClick={handleGenerateCertificate} className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-lg text-xs flex items-center gap-1 shadow-lg hover:scale-105 transition-transform">
              <Award size={14} /> Certificate
            </button>
          )}
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* PRO LMS BODY */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* LEFT SIDEBAR (PLAYLIST) */}
        <aside className="w-full md:w-80 lg:w-96 bg-[#0a0c10] border-r border-white/10 flex flex-col shrink-0 order-2 md:order-1 overflow-y-auto">
          <div className="p-5 border-b border-white/5 sticky top-0 bg-[#0a0c10] z-10">
            <h3 className="font-black text-white text-lg">Course Content</h3>
            <div className="md:hidden mt-3">
              <p className="text-stone-500 text-xs mb-1">{completedTasks}/{totalTasks} Tasks Completed</p>
              <div className="w-full bg-[#161b22] border border-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          </div>

          <div className="flex-grow p-3">
            {playlist.map((module, mIdx) => (
              <div key={mIdx} className="mb-6">
                <h4 className="px-3 py-2 text-xs font-bold text-stone-500 uppercase tracking-widest">{module.moduleTitle}</h4>
                <div className="flex flex-col gap-1">
                  {module.videos.map((video: any) => {
                    const isActive = activeVideo?.id === video.id;
                    const isVidDone = completedVideos.includes(video.id);
                    const isAssDone = completedAssignments.includes(video.id);
                    const isLockedAdvanced = video.githubAssignment?.isAdvanced && !examStatus.is_passed && !isAdmin;

                    return (
                      <button 
                        key={video.id} 
                        onClick={() => {
                          if (isLockedAdvanced) {
                            showToast("🔒 Advanced Content Locked", "Pass the Final Exam with 80% to unlock this lesson.", "error");
                            return;
                          }
                          handleVideoChange(video);
                        }} 
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-xl transition-all ${isLockedAdvanced ? 'opacity-50 cursor-not-allowed bg-stone-900/50' : isActive ? 'bg-[#161b22] border border-amber-500/30 shadow-sm' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isLockedAdvanced ? <Lock size={16} className="text-stone-600" /> : isVidDone ? <CheckCircle size={16} className="text-green-500" /> : <PlayCircle size={16} className={isActive ? 'text-amber-500' : 'text-stone-500'} />}
                        </div>
                        <div className="flex-grow pr-2">
                          <p className={`text-sm font-bold line-clamp-2 ${isActive ? 'text-amber-400' : 'text-stone-300'} ${(isVidDone || isLockedAdvanced) && !isActive ? 'opacity-50' : ''}`}>{video.title}</p>
                          {video.githubAssignment && !isLockedAdvanced && (
                            <p className={`text-xs mt-1 font-bold ${video.githubAssignment.isExam ? 'text-purple-400' : isAssDone ? 'text-green-500' : 'text-amber-500/70'}`}>
                              {video.githubAssignment.isExam ? "🏆 Final Exam" : isAssDone ? "✅ Assignment Submitted" : "📝 Pending Assignment"}
                            </p>
                          )}
                          {isLockedAdvanced && (
                            <p className="text-xs mt-1 font-bold text-red-400">🔒 Locked (Pass Exam Required)</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-[#0d1117] relative order-1 md:order-2 flex flex-col">
          
          {/* 🚨 NEW MODAL: Expected Outcome Viewer */}
          <AnimatePresence>
            {showOutcomeModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#0d1117] w-full max-w-4xl rounded-3xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-stone-800 flex justify-between items-center bg-[#161b22]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><TerminalSquare className="text-amber-500" /> Expected Outcome</h3>
                    <button onClick={() => setShowOutcomeModal(false)} className="text-stone-400 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  {/* 🚨 THE FIX: Rendering the specific step's outcome instead of the whole file! */}
                  <div className="flex-grow p-6 overflow-y-auto bg-[#0a0c10]">
                     <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap leading-relaxed">
                       {expectedOutcomeSteps[currentStepIndex] || "No expected outcome provided for this step."}
                     </pre>
                  </div>
                  <div className="p-4 border-t border-stone-800 bg-[#161b22] flex justify-end">
                    <button onClick={() => setShowOutcomeModal(false)} className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-bold transition-colors">Close</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Solution Modal */}
          <AnimatePresence>
            {showSolutionModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
                <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-[#0d1117] w-full max-w-6xl rounded-3xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  <div className="px-6 py-4 border-b border-stone-800 flex justify-between items-center bg-[#161b22]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2"><Award className="text-amber-500" /> Official Solution & Code Review</h3>
                    <button onClick={() => setShowSolutionModal(false)} className="text-stone-400 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex flex-col md:flex-row flex-grow overflow-hidden h-[60vh]">
                     <div className="w-full md:w-1/2 border-r border-stone-800 flex flex-col">
                        <div className="bg-[#161b22] px-4 py-3 border-b border-stone-800 text-stone-400 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2">Your Submitted Code (Step {currentStepIndex + 1})</div>
                        <div className="flex-grow p-5 overflow-y-auto"><pre className="text-sm font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">{files['main.py']}</pre></div>
                     </div>
                     <div className="w-full md:w-1/2 flex flex-col bg-[#0a0c10]">
                        <div className="bg-[#161b22] px-4 py-3 border-b border-stone-800 text-amber-500 text-xs font-mono font-bold uppercase tracking-widest flex items-center gap-2"><Code2 size={16}/> Instructor's Solution (Step {currentStepIndex + 1})</div>
                        <div className="flex-grow relative"><Editor height="100%" defaultLanguage="python" theme="vs-dark" value={officialSolutionSteps[currentStepIndex] || "# No official solution provided for this specific step."} options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} /></div>
                     </div>
                  </div>
                  <div className="p-4 border-t border-stone-800 bg-[#161b22] flex justify-end">
                    <button onClick={() => setShowSolutionModal(false)} className="px-8 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl font-bold transition-colors">Close Code Review</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className="max-w-[1200px] mx-auto w-full p-4 lg:p-8 flex flex-col gap-6 flex-grow">
            
            {/* The Cinematic Video Player */}
            {activeVideo ? (
              <div className="w-full bg-black rounded-2xl overflow-hidden shadow-2xl aspect-video border border-white/10 relative select-none shrink-0">
                <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`} title={activeVideo.title} frameBorder="0" allowFullScreen></iframe>
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center mix-blend-difference">
                  <motion.div animate={{ x:[-150, 150, 150, -150, -150], y:[-80, -80, 80, 80, -80] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute text-white/30 font-mono text-sm md:text-lg font-bold tracking-widest pointer-events-none drop-shadow-md transform -rotate-12">
                    {user?.primaryEmailAddress?.emailAddress || user?.id} <br/><span className="text-xs">DO NOT DISTRIBUTE</span>
                  </motion.div>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#0a0c10] rounded-2xl shadow-2xl aspect-video border border-white/10 flex flex-col items-center justify-center text-center p-8 shrink-0">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-4">
                  <Clock size={40} className="text-amber-500" />
                </div>
                <h2 className="text-3xl font-black text-white mb-4">Live Classes Starting Soon</h2>
                {courseDetails?.liveLink ? (
                  <Link href={`/live/${params.slug}`} className="px-8 py-4 rounded-full bg-amber-500 text-stone-900 font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-lg mt-4">
                    <PlayCircle size={20} /> Enter Live Classroom
                  </Link>
                ) : (
                  <p className="text-stone-400 max-w-md">Once the live sessions begin, the recordings will be automatically uploaded and unlocked here.</p>
                )}
              </div>
            )}

            {/* Video Action Header */}
            {activeVideo && (
              <div className="p-6 md:p-8 rounded-2xl border border-white/10 bg-[#121212] shadow-xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] pointer-events-none" />
                
                <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6 relative z-10">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white mb-2 leading-snug">{activeVideo.title}</h2>
                    <p className="text-stone-400 text-sm font-medium">Instructor: Shivam Namdev</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {isAdmin && (
                      <button onClick={async () => {
                        const shareUrl = `https://shivamnamdev.com/share/${activeVideo.youtubeId}?t=${Date.now()}`;
                        const shareText = `🚀 Ready to Master Python?\n\nCheck out this exclusive lesson: *${activeVideo?.title}* from Shivam Academy!\n\n🎓 Click here to watch the video directly:\n${shareUrl}\n\n💻 Enroll here to unlock the full platform:\nhttps://shivamnamdev.com/courses/${params.slug}`;
                        if (navigator.share) { try { await navigator.share({ title: activeVideo?.title || "Shivam Academy", text: shareText }); } catch (err) {} } 
                        else { navigator.clipboard.writeText(shareText); alert("Branded share message copied!"); }
                      }} className="px-4 py-3 rounded-xl bg-purple-500/10 text-purple-400 font-bold text-sm flex items-center justify-center gap-2 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                        <Share2 size={18} /> Share
                      </button>
                    )}

                    {isVideoCompleted ? (
                      <button disabled className="px-6 py-3.5 rounded-xl bg-green-500/10 text-green-400 font-bold text-sm flex items-center justify-center gap-2 border border-green-500/20 shadow-sm">
                        <CheckCircle size={18} /> Video Watched
                      </button>
                    ) : (
                      <button onClick={markAsComplete} disabled={isMarking} className="px-6 py-3.5 rounded-xl bg-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-400 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-70">
                        {isMarking ? <Loader2 size={18} className="animate-spin text-black"/> : <CheckCircle size={18} />} Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* The Tabbed Content Area */}
            {activeVideo && (
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 shadow-2xl overflow-hidden mb-10 shrink-0">
                <div className="flex overflow-x-auto border-b border-white/10 bg-[#121212]">
                  <button onClick={() => setActiveTab('description')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'description' ? 'text-amber-500 border-b-2 border-amber-500 bg-[#0a0a0a]' : 'text-stone-400 hover:text-stone-200'}`}><AlignLeft size={18} /> Details</button>
                  <button onClick={() => setActiveTab('qa')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'qa' ? 'text-amber-500 border-b-2 border-amber-500 bg-[#0a0a0a]' : 'text-stone-400 hover:text-stone-200'}`}><MessageCircle size={18} /> Q&A ({comments.length})</button>
                  {activeVideo.githubAssignment && (
                    <>
                      <button onClick={() => setActiveTab('practice')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'practice' ? 'text-amber-500 border-b-2 border-amber-500 bg-[#0a0a0a]' : 'text-stone-400 hover:text-stone-200'}`}><Code size={18} /> Practice {isAssignmentCompleted && "✅"}</button>
                      <button onClick={() => setActiveTab('visualize')} className={`flex-1 py-4 font-bold text-sm flex justify-center items-center gap-2 transition-all min-w-[150px] ${activeTab === 'visualize' ? 'text-amber-500 border-b-2 border-amber-500 bg-[#0a0a0a]' : 'text-stone-400 hover:text-stone-200'}`}><Eye size={18} /> 
                      {isGitLab ? 'Git Graph' : 'Visualize'} </button>
                    </>
                  )}
                </div>

                <div className="flex-grow flex flex-col relative overflow-y-auto">
                  
                  {activeTab === 'description' && (<div className="p-6 md:p-8 prose prose-invert max-w-none"><p className="text-stone-300 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{activeVideo.description}</p></div>)}
                  
                  {activeTab === 'qa' && (
                    <div className="p-6 md:p-8 flex flex-col gap-6">
                      <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                        <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Ask Shivam or the community..." className="w-full p-4 rounded-xl border border-white/10 bg-black text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all" rows={3} required />
                        <div className="flex justify-end"><button type="submit" disabled={isPosting} className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm flex items-center gap-2 hover:bg-amber-400 transition-colors disabled:opacity-70 shadow-md">{isPosting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />} Post Question</button></div>
                      </form>
                      <div className="space-y-6 pt-6 border-t border-white/10">
                        {comments.length === 0 ? <p className="text-center text-stone-500 text-sm italic py-4">No questions yet. Start the discussion!</p> : comments.map((comment) => (
                          <div key={comment.id} className="flex gap-4">
                            <img src={comment.user_image || "https://www.gravatar.com/avatar/?d=mp"} alt="User" className="w-10 h-10 rounded-full border border-white/10 shadow-sm" />
                            <div className="flex-grow bg-[#121212] p-4 rounded-2xl rounded-tl-none border border-white/5">
                              <div className="flex justify-between items-center mb-1"><h5 className="font-bold text-white text-sm">{comment.user_name}</h5></div>
                              <p className="text-stone-300 text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'practice' && activeVideo.githubAssignment && (
                    <div className="flex flex-col lg:flex-row h-[700px] bg-[#0d1117] overflow-hidden border-t border-white/10 shadow-inner">
                      
                      <div className="w-full lg:w-1/3 flex flex-col border-r border-stone-800 bg-[#161b22] shrink-0">
                        <div className="flex flex-col items-center p-4 border-b border-stone-800 bg-[#0d1117]">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Question {currentStepIndex + 1} of {assignmentSteps.length}</span>
                          <div className="flex gap-1.5 w-full justify-center">
                            {assignmentSteps.map((_, idx) => <div key={idx} className={`h-1.5 w-8 rounded-full ${idx < currentStepIndex ? 'bg-green-500' : idx === currentStepIndex ? 'bg-blue-500' : 'bg-stone-700'}`} />)}
                          </div>
                        </div>

                        <div className="flex-grow p-6 overflow-y-auto">
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
                            {/* 🚨 NEW: Added Expected Outcome Button */}
                            {expectedOutcomeSteps.length > 0 && (
                              <button onClick={() => setShowOutcomeModal(true)} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-colors border border-stone-700">
                                Expected Outcome
                              </button>
                            )}

                            {officialSolutionSteps.length > 0 && (
                              <button onClick={() => setShowSolutionModal(true)} className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-bold transition-colors border border-stone-700">View Solution</button>
                            )}
                            
                            {currentStepIndex < assignmentSteps.length - 1 ? (
                              <button onClick={() => handleStepChange(currentStepIndex + 1)} className="flex items-center gap-1 px-4 py-2 bg-stone-800 rounded-lg text-sm font-bold text-amber-500 hover:bg-stone-700 hover:text-amber-400 transition-colors border border-stone-700 shadow-sm">
                                Next <ChevronRight size={16} />
                              </button>
                            ) : (
                              <button onClick={submitAssignment} disabled={isSubmittingAssignment} className={`px-4 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-2 transition-colors shadow-md ${activeVideo.githubAssignment?.isExam && !examStatus.is_passed ? 'bg-purple-600 hover:bg-purple-500 text-white' : isAssignmentCompleted ? 'bg-green-600 text-white' : 'bg-amber-500 hover:bg-amber-400 text-stone-900'}`}>
                                {isSubmittingAssignment ? <Loader2 size={14} className="animate-spin"/> : activeVideo.githubAssignment?.isExam ? <Award size={14}/> : <CheckCircle2 size={14}/>} 
                                {activeVideo.githubAssignment?.isExam ? `Submit Exam (${examStatus.attempts_used}/5)` : isAssignmentCompleted ? "Update" : "Submit"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col bg-[#0d1117] min-h-[500px]">
                        <div className="flex bg-[#161b22] border-b border-stone-800 justify-between items-center pr-4 overflow-x-auto">
                          {isGitLab ? (
                            <div className="flex items-center gap-3 px-4 py-2.5">
                              <span className="text-xs font-mono text-stone-500">branch:</span>
                              <span className="text-xs font-mono font-bold text-amber-400">{gitRepoState.branch}</span>
                              {gitRepoState.staged.length > 0 && (
                                <span className="text-xs font-mono text-green-400">{gitRepoState.staged.length} staged</span>
                              )}
                              {gitRepoState.commits.length > 0 && (
                                <span className="text-xs font-mono text-blue-400">{gitRepoState.commits.length} commits</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex">
                              {Object.keys(files).map(filename => (
                                <div key={filename} onClick={() => setActiveFile(filename)} className={`px-4 py-2.5 text-xs font-mono flex items-center gap-2 cursor-pointer border-r border-stone-800 ${activeFile === filename ? 'bg-[#0d1117] text-amber-400 border-t-2 border-t-amber-500' : 'bg-[#161b22] text-stone-500 hover:text-stone-300 border-t-2 border-t-transparent'}`}>
                                  <FileText size={14} /> {filename}
                                  {filename !== 'main.py' && <X size={12} className="hover:text-red-400 ml-2" onClick={(e) => { e.stopPropagation(); handleDeleteFile(filename); }}/>}
                                </div>
                              ))}
                              <button onClick={handleAddFile} className="px-3 py-2 text-stone-500 hover:text-white transition-colors"><Plus size={16} /></button>
                            </div>
                          )}
                          <div className="flex gap-2 shrink-0 py-1.5 ml-4">
                            <button onClick={askAITutor} disabled={(!isGitLab && !files['main.py']?.trim()) || isAskingAI} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-purple-400 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-stone-700 disabled:opacity-50">
                              {isAskingAI ? <Loader2 size={12} className="animate-spin"/> : <MessageCircle size={12}/>} Ask AI
                            </button>
                            {!isGitLab && (
                            <button onClick={runActiveLab} disabled={isRunningCode || isPyodideLoading || isFetchingCode} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50">
                              {isPyodideLoading || isFetchingCode ? <Loader2 size={12} className="animate-spin"/> : isRunningCode ? <Loader2 size={12} className="animate-spin"/> : <PlayCircle size={12}/>} Run
                            </button>
                          )}
                          </div>
                        </div>
                        {!isGitLab && (
                        <div className="flex-grow relative min-h-[300px]">
                          <Editor height="100%" defaultLanguage={getLanguage(activeFile)} theme="vs-dark" value={files[activeFile] || ""} onChange={(value) => { setFiles(prev => ({ ...prev, [activeFile]: value || "" })); setAiResponse(null); }} options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }} />
                        </div>
                        )}
                        <div className={`${isGitLab ? 'flex-grow' : 'h-[200px]'} border-t border-stone-800 flex flex-col bg-[#0d1117] shrink-0`}>
                          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-stone-800">
                            <div className="flex gap-4">
                              <span className="text-xs font-mono text-white border-b border-blue-500 pb-1">TERMINAL</span>
                            </div>
                            <button onClick={() => setOutput("")} className="text-stone-500 hover:text-stone-300 text-xs flex items-center gap-1"><RefreshCw size={12}/> Clear</button>
                          </div>
                          <div className="flex-grow p-4 overflow-y-auto bg-[#0d1117]">
                            <pre className={`text-sm font-mono whitespace-pre-wrap ${output.startsWith('Error') || output.startsWith('Syntax') || output.includes('❌') ? 'text-red-400' : 'text-green-400'}`}>{output || "shivam@academy:~$ _"}</pre>
                          </div>
                          {isGitLab && (
                            <form
                              onSubmit={(e) => { e.preventDefault(); runGitCommand(); }}
                              className="flex items-center gap-2 px-4 py-3 bg-[#0a0c10] border-t border-stone-800 shrink-0"
                            >
                              <span className="text-green-400 font-mono text-sm shrink-0">$</span>
                              <input
                                type="text"
                                value={gitCommandInput}
                                onChange={(e) => setGitCommandInput(e.target.value)}
                                placeholder="git status"
                                className="flex-1 bg-transparent text-green-400 font-mono text-sm focus:outline-none placeholder:text-stone-600"
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <button type="submit" className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-xs font-bold transition-colors shrink-0">
                                Run
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VISUALIZER TAB */}
                  {activeTab === 'visualize' && activeVideo.githubAssignment && (
                    isGitLab ? <GitGraphVisualizer commits={gitRepoState.commits} branch={gitRepoState.branch} />: (
                      // existing Python Tutor iframe block stays here unchanged
                    <div className="p-6 md:p-8 flex flex-col flex-grow">
                      <div className="bg-[#121212] border border-white/10 p-4 rounded-xl flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-bold text-white mb-1">Code Visualizer</h4>
                          <p className="text-stone-400 text-sm">Note: The visualizer only steps through your <code className="bg-white/10 px-1 rounded">main.py</code> file.</p>
                        </div>
                      </div>
                      <div className="w-full bg-[#0d1117] rounded-xl border border-white/10 shadow-inner overflow-hidden flex-grow min-h-[500px] flex flex-col">
                        <div className="h-10 bg-[#0a0a0a] border-b border-white/10 flex items-center px-4 gap-2 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-red-400"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                          <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          <span className="text-xs font-mono font-bold text-stone-500 ml-4">shivam-academy-visualizer.exe</span>
                        </div>
                        <div className="flex-grow relative overflow-hidden">
                          <iframe className="absolute top-0 left-0 w-full h-full invert hue-rotate-180 contrast-125 brightness-110" style={{ backgroundColor: "transparent" }} frameBorder="0" src={`https://pythontutor.com/iframe-embed.html#code=${encodeURIComponent(files['main.py'] || "")}&cumulative=false&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&py=3&rawInputLstJSON=%5B%5D&textReferences=false`}></iframe>
                        </div>
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            )}
          </div>
         </main>
       </div>        
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {toastConfig.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`fixed bottom-10 right-10 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[9999] border text-white ${toastConfig.type === 'error' ? 'bg-red-600 border-red-400' : 'bg-green-600 border-green-400'}`}
          >
            <div className="bg-black/20 p-2 rounded-full">
              {toastConfig.type === 'error' ? <X size={24} className="text-white" /> : <Award size={24} className="text-white" />}
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-widest">{toastConfig.title}</h4>
              <p className="text-xs font-bold opacity-90">{toastConfig.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}