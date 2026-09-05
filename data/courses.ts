// data/courses.ts

export const activeCourses = [

  {
id: "git-beginner-batch-1",
slug: "git-beginner-batch-1",
title: "Git Beginner Live Session",
statusText: "🚀 Teacher's Day Offer Valid only on 5th Sept",
demoOffer: "Teacher's Day Offer",
duration: "2-3 Weeks | Weekdays Only (Mon-Fri)",
contactPhone: "7057034840",
// enrollmentClosed: true,
// liveLink: "https://meet.google.com/web-uzkz-ghr",

// whatsappLink: "https://chat.whatsapp.com/EjE3pU7synO9jMFpOPuHZp",

vsl: {
  headlinePart1: "Don't just learn Git.",
  headlineHighlight: "UNDERSTAND VERSION CONTROL",
  subheadline: "Learn Git from scratch with real-life analogies and practical scenarios. Perfect for beginners, students, aspiring developers & career transitioners.",
  videoCoverUrl: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?q=80&w=2000&auto=format&fit=crop",
  flyerUrl: "/git-batch1-flyer.jpeg"
},

painPoints: {
  oldWay: [
    "Struggling to understand version control concepts",
    "Lost in Git command syntax and documentation",
    "Confused about branches and merge conflicts",
    "Unable to collaborate on GitHub workflows"
  ],
  newWay: [
    "Understanding why Git exists with clear analogies",
    "Mastering Git through practical hands-on work",
    "Handling branches and merges with confidence",
    "Collaborating using real industry workflows"
  ]
},

resources: {
syllabusPdf: "/syllabus/Git_Foundation_Cohort_Syllabus_No_Pricing.pdf",
syllabusLabel: "Download Full Syllabus (PDF)"
},

pricing: {
  inr: { 
    currentPrice: "₹399", 
    originalPrice: "₹799", 
    savingsText: "Teacher's Day Offer Valid only on 5th Sept", 
    currencyCode: "INR" 
  },
  usd: { 
    currentPrice: "$9.99", 
    originalPrice: "$9.99", 
    savingsText: "Teacher's Day Offer Valid only on 5th Sept (Global)", 
    currencyCode: "USD" 
  }
},

differentiators: [
  { icon: "analogy", title: "ANALOGY BASED LEARNING", description: "Learn Git with relatable real-life examples instead of memorizing commands" },
  { icon: "scenarios", title: "SCENARIO DRIVEN", description: "Understand why Git exists before learning how it works" },
  { icon: "practical", title: "PRACTICAL EXECUTION", description: "Work locally on Git to build actual understanding" },
  { icon: "support", title: "DOUBT SUPPORT", description: "Dedicated live doubt solving during sessions" },
  { icon: "recordings", title: "SESSION RECORDINGS", description: "Access recordings anytime for revision" },
  { icon: "workflow", title: "INDUSTRY WORKFLOW", description: "Learn real team collaboration flow used in companies" }
],

cohortHighlights: [
  "Live Classes: 1 Hour Every Weekday",
  "Beginner Friendly (No Pre-Requisite)",
  "Hands-on Practice on Local Git",
  "Learn Git Before GitHub",
  "Real Collaboration Simulation",
  "Certificate for Serious Learners"
],
courseTestimonials: [
      { name: "Shirish", text: "Best part is asking Random questions kept everyone engaged, while in-depth discussions of fundamentals and behind-the-scenes concepts made Git easier to understand." },
      { name: "Nishchal", text: "The course took me from zero Git/GitHub knowledge to confident hands-on practice, improving screen-sharing confidence and teaching real-world industry workflows." },
      { name: "Harshit", text: "The sessions were highly interactive and practical, covering topics from the basics to advanced concepts. Hands-on learning made the concepts easier to understand and apply confidently." }
    ],

outcomes: [
  "Understands why Git exists", 
  "Uses Git confidently in projects", 
  "Handles branches and merges", 
  "Collaborates using GitHub workflow"
],

bonuses: [
  "Complete Industry Workflow Understanding:",
  "Branch → Commit → Push → Pull Request → Review → Merge"
],

modules: [
  { 
    week: "MODULE 1", 
    title: "Why Git Exists", 
    topics: [
      "Life Before Git (Version Chaos)", 
      "Version Control Basics", 
      "Git as a Time Machine"
    ] 
  },
  { 
    week: "MODULE 2", 
    title: "Core Git Workflow", 
    topics: [
      "Repository Concept", 
      "Working Directory, Staging Area, Commits", 
      "Tracking Changes"
    ] 
  },
  { 
    week: "MODULE 3", 
    title: "Branches & Safe Development", 
    topics: [
      "Branching Concept", 
      "Parallel Development", 
      "Merge & Merge Conflicts"
    ] 
  },
  { 
    week: "MODULE 4", 
    title: "Remote Repositories & GitHub", 
    topics: [
      "Why GitHub Exists", 
      "Push, Pull, Clone", 
      "Remote Collaboration"
    ] 
  },
  { 
    week: "MODULE 5", 
    title: "Industry Workflow", 
    topics: [
      "Pull Requests", 
      "Code Review Flow", 
      "Real Team Collaboration Simulation"
    ] 
  }
]


},
  // 🚀 BRAND NEW: BATCH 3 (Active Pricing & New VSL Data)
  {
    id: "python-beginners-batch-2",
    slug: "python-beginners-batch-2",
    title: "Python Live Session (Batch 2)",
    statusText: "🚀 Enrollment Open",
    demoOffer: "Early Bird Offer",
    duration: "6-8 Weeks | Weekends Only (Sat & Sun)",
    contactPhone: "7057034840",
    enrollmentClosed: false, 
    // 🚨 NEW: Add your private group link here!
    whatsappLink: "https://chat.whatsapp.com/COiL4vkIxEBAKy4WtH5Fyp",

    vsl: {
      headlinePart1: "Don't just learn Python.",
      headlineHighlight: "THINK IN PYTHON",
      subheadline: "Build logic. Solve problems. Write code with confidence. A Foundation level Python cohort for Beginners, Students, Professionals & Career Transitioners.",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/batch3-flyer.png" // 🚨 Make sure to save your new image as this in the 'public' folder!
    },
    
    painPoints: {
  oldWay: [
    "Watching tutorials but unable to write code from scratch",
    "Struggling to build strong programming logic",
    "Feeling overwhelmed by complex coding jargon",
    "Learning syntax but failing to solve real problems"
  ],
  newWay: [
    "Building strong coding logic step-by-step from scratch",
    "Writing Python programs confidently and independently",
    "Working on real-world capstone projects, not just theory",
    "Becoming job-ready for entry-level roles"
    ] 
  },
    pricing: {
      inr: { currentPrice: "₹1,999", originalPrice: "₹2,499", savingsText: "Early Bird Offer Valid Till 5th July", currencyCode: "INR" },
      usd: { currentPrice: "$25", originalPrice: "$35", savingsText: "Early Bird Access (Global)", currencyCode: "USD" }
    },
    
    resources: {
    syllabusPdf: "/syllabus/Python_Foundation_Cohort_Syllabus_Updated_Fixed.pdf",
    syllabusLabel: "Download Full Syllabus (PDF)"
  },

    // 🚨 NEW: Specific Data from your Flyer!
    differentiators: [
      { icon: "mentorship", title: "LIVE MENTORSHIP", description: "Interactive sessions with personal guidance" },
      { icon: "accountability", title: "ACCOUNTABILITY", description: "Daily assignments, practice & consistent follow-ups" },
      { icon: "visualiser", title: "CODE VISUALISER", description: "Visualise code execution and understand deeply" },
      { icon: "support", title: "DOUBT SUPPORT", description: "Dedicated doubt clearing in live sessions" },
      { icon: "recordings", title: "DAILY RECORDINGS", description: "Missed a class? Watch anytime on our portal" },
      { icon: "certificate", title: "CERTIFICATE", description: "Earn a certificate by completing the requirements" }
    ],

    cohortHighlights: [
      "Live Classes: 2 Hours Each Saturday & Sunday",
      "Small Batch: Max 20 Learners",
      "Daily Assignment with Solutions",
      "Real-Life Examples",
      "Project Showcase Day: Present your final mini-project live!",
      "Certificate for Committed Learners (75% Attendance + Assignments)"
    ],

    courseTestimonials: [
      { name: "Pradhyumna", text: "What I liked most about the sessions was the clarity and simplicity in the way concepts were explained. Appreciated the patience to explain doubts multiple times." },
      { name: "Gungun", text: "I liked tutor is ensuring everyone personally during session and clearing everyone's doubts." },
      { name: "Mahak", text: "It is completely for beginners, easy to understand, and live practice for better understanding and experience." }
    ],
    
    outcomes: [
      "Understands & writes code", 
      "Debugs with confidence", 
      "Solves problems logically", 
      "Builds real programs on own"
    ],
    
    bonuses: [
      "Score Above 70-80% & Get Access to Advance Python Recordings:",
      "List Comprehension, Decorator, Generators, Lambda Function, Recursion"
    ],
    
    modules: [
      { week: "MODULE 1", title: "Think Like a Programmer", topics: ["Setup, Basics, Variables, Inputs", "Operators, Conditions & Loops"] },
      { week: "MODULE 2", title: "Build Logic Confidence", topics: ["Functions, String Handling", "Lists, Tuples, Dictionaries"] },
      { week: "MODULE 3", title: "Write Real Programs", topics: ["File Handling", "Exception Handling, Modular Coding"] },
      { week: "MODULE 4", title: "Beginner Developer Mindset", topics: ["Debugging Techniques, Reading Code", "Writing Independent Solutions"] },
      { week: "MODULE 5-6", title: "OOPs & Mini Project", topics: ["Object-Oriented Programming", "Virtual Environments", "Build & Deploy a Mini Project"] }
    ]
  },


  // 🔒 EXISTING: BATCH 1 (Closed)
  {
    id: "python-beginners",
    slug: "python-beginners", 
    title: "Python Live Session (Batch 1)",
    statusText: "🔒 Cohort Completed",
    demoOffer: "Enrollment Closed",
    duration: "30 Sessions | Complete in 45 Days",
    contactPhone: "7057034840",
    enrollmentClosed: true, 
    // liveLink: "https://meet.google.com/eso-nykg-qgi", 
    
    vsl: {
      headlinePart1: "Master Python Programming &",
      headlineHighlight: "Logic Building",
      subheadline: "This cohort has concluded. Recordings are available to enrolled students.",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/course-flyer.jpg"
    },
    painPoints: {
  oldWay: [
    "Random tutorial watching without direction",
    "No accountability or consistent follow-up",
    "Isolated learning without peer community",
    "Unable to verify if your logic is actually correct"
  ],
  newWay: [
    "Structured curriculum from beginner to advanced",
    "Live mentorship with daily assignments and follow-ups",
    "Learning alongside peers in a cohort",
    "Real-time feedback from an experienced instructor"
    ]
  },
    pricing: {
      inr: { currentPrice: "₹599", originalPrice: "₹899", savingsText: "Closed", currencyCode: "INR" },
      usd: { currentPrice: "$150", originalPrice: "$250", savingsText: "Closed", currencyCode: "USD" }
    },

    resources: {
    syllabusPdf: "/syllabus/Python_Foundation_Cohort_Syllabus_Updated_Fixed.pdf",
    syllabusLabel: "Download Full Syllabus (PDF)"
  },
  
    outcomes: ["Build strong coding logic from scratch"],
    bonuses: ["Hands-on Capstone Mini Project"],
    modules: [{ title: "Python Fundamentals", topics: ["Python Basics & Setup", "Variables & Operators", "Conditional Statements & Loops"] },
      { title: "Data Structures in Python", topics: ["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries"] },
      { title: "Core Programming Concepts", topics: ["Writing Custom Functions", "Exception Handling", "File Handling"] },
      { title: "Advanced Python", topics: ["Object-Oriented Programming", "Virtual Environments"] }]
  }
];