// data/courses.ts

export const activeCourses = [
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
    whatsappLink: "https://chat.whatsapp.com/JC7u8pWcePA2o89Tu0QL9O",

    vsl: {
      headlinePart1: "Don't just learn Python.",
      headlineHighlight: "THINK IN PYTHON",
      subheadline: "Build logic. Solve problems. Write code with confidence. A Foundation level Python cohort for Beginners, Students, Professionals & Career Transitioners.",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/batch3-flyer.jpg" // 🚨 Make sure to save your new image as this in the 'public' folder!
    },
    
    pricing: {
      inr: { currentPrice: "₹1,999", originalPrice: "₹2,499", savingsText: "Early Bird Offer Valid Till 31st May", currencyCode: "INR" },
      usd: { currentPrice: "$25", originalPrice: "$35", savingsText: "Early Bird Access (Global)", currencyCode: "USD" }
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
      { week: "WEEK 1", title: "Think Like a Programmer", topics: ["Setup, Basics, Variables, Inputs", "Operators, Conditions & Loops"] },
      { week: "WEEK 2", title: "Build Logic Confidence", topics: ["Functions, String Handling", "Lists, Tuples, Dictionaries"] },
      { week: "WEEK 3", title: "Write Real Programs", topics: ["File Handling", "Exception Handling, Modular Coding"] },
      { week: "WEEK 4", title: "Beginner Developer Mindset", topics: ["Debugging Techniques, Reading Code", "Writing Independent Solutions"] },
      { week: "WEEK 5-6", title: "OOPs & Mini Project", topics: ["Object-Oriented Programming", "Virtual Environments", "Build & Deploy a Mini Project"] }
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
    
    pricing: {
      inr: { currentPrice: "₹599", originalPrice: "₹899", savingsText: "Closed", currencyCode: "INR" },
      usd: { currentPrice: "$150", originalPrice: "$250", savingsText: "Closed", currencyCode: "USD" }
    },
    outcomes: ["Build strong coding logic from scratch"],
    bonuses: ["Hands-on Capstone Mini Project"],
    modules: [{ title: "Python Fundamentals", topics: ["Python Basics & Setup", "Variables & Operators", "Conditional Statements & Loops"] },
      { title: "Data Structures in Python", topics: ["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries"] },
      { title: "Core Programming Concepts", topics: ["Writing Custom Functions", "Exception Handling", "File Handling"] },
      { title: "Advanced Python", topics: ["Object-Oriented Programming", "Virtual Environments"] }]
  }
];