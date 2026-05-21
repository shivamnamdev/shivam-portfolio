// data/courses.ts

export const activeCourses = [
  // 🚀 BRAND NEW: BATCH 3 (Active Pricing)
  {
    id: "python-beginners-live-03",
    slug: "python-beginners-batch-3",
    title: "Python Live Session (Batch 3)",
    statusText: "🚀 Enrollment Open",
    demoOffer: "Early Bird Offer",
    duration: "30 Sessions | Complete in 45 Days (Weekdays)",
    contactPhone: "7057034840",
    enrollmentClosed: false, // 🚨 OPEN FOR SALES!

    vsl: {
      headlinePart1: "Master Python Programming &",
      headlineHighlight: "Logic Building",
      subheadline: "Batch 3 is officially open! Join my interactive live cohort to write code confidently, build real-world projects, and become job-ready.",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/course-flyer.jpg"
    },
    
    pricing: {
      inr: { currentPrice: "₹1,999", originalPrice: "₹2,499", savingsText: "Save ₹500! (Early Bird)", currencyCode: "INR" },
      usd: { currentPrice: "$200", originalPrice: "$250", savingsText: "Early Bird Access (Global)", currencyCode: "USD" }
    },
    
    outcomes: ["Build strong coding logic from scratch", "Write Python programs confidently", "Work on real-world problems", "Become job-ready for entry-level roles"],
    bonuses: ["Hands-on Capstone Mini Project", "Learn GitHub Copilot for faster & smarter coding"],
    modules: [
      { title: "Python Fundamentals", topics: ["Python Basics & Setup", "Variables & Operators", "Conditional Statements & Loops"] },
      { title: "Data Structures in Python", topics: ["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries"] },
      { title: "Core Programming Concepts", topics: ["Writing Custom Functions", "Exception Handling", "File Handling"] },
      { title: "Advanced Python", topics: ["Object-Oriented Programming", "Virtual Environments"] }
    ]
  },

  // 🔒 EXISTING: BATCH 2 (Closed)
  {
    id: "python-beginners-live-02",
    slug: "python-beginners-batch-2",
    title: "Python Live Session (Batch 2)",
    statusText: "🔒 Cohort Full",
    demoOffer: "Enrollment Closed",
    duration: "30 Sessions | Complete in 45 Days (Weekdays)",
    contactPhone: "7057034840",
    enrollmentClosed: true, // 🚨 CLOSED FOR SALES!
    
    vsl: {
      headlinePart1: "Master Python Programming &",
      headlineHighlight: "Logic Building",
      subheadline: "Batch 2 is currently in progress. Please check out Batch 3 to enroll!",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/course-flyer.jpg"
    },
    
    pricing: {
      inr: { currentPrice: "₹899", originalPrice: "₹1,499", savingsText: "Closed", currencyCode: "INR" },
      usd: { currentPrice: "$200", originalPrice: "$250", savingsText: "Closed", currencyCode: "USD" }
    },
    // ... keep same outcomes, bonuses, modules
    outcomes: ["Build strong coding logic from scratch", "Write Python programs confidently"],
    bonuses: ["Hands-on Capstone Mini Project", "Learn GitHub Copilot"],
    modules: [{ title: "Python Fundamentals", topics: ["Python Basics & Setup", "Variables & Operators", "Conditional Statements & Loops"] },
      { title: "Data Structures in Python", topics: ["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries"] },
      { title: "Core Programming Concepts", topics: ["Writing Custom Functions", "Exception Handling", "File Handling"] },
      { title: "Advanced Python", topics: ["Object-Oriented Programming", "Virtual Environments"] }
    ]
  },

  // 🔒 EXISTING: BATCH 1 (Closed)
  {
    id: "python-beginners-live-01",
    slug: "python-beginners", 
    title: "Python Live Session (Batch 1)",
    statusText: "🔒 Cohort Completed",
    demoOffer: "Enrollment Closed",
    duration: "30 Sessions | Complete in 45 Days",
    contactPhone: "7057034840",
    enrollmentClosed: true, // 🚨 CLOSED FOR SALES!
    
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
      { title: "Advanced Python", topics: ["Object-Oriented Programming", "Virtual Environments"] }
    ]
  }
];