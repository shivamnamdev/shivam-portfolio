// data/courses.ts

export const activeCourses =[
  {
    // Inside data/courses.ts (Scroll down to Batch 1)

  // --- 🔒 EXISTING COHORT (BATCH 1) ---
    id: "python-beginners-live-01",
    slug: "python-beginners", 
    title: "Python Live Session (Batch 1)",
    statusText: "🔒 Cohort 1 In Progress",
    demoOffer: "Enrollment Closed",
    duration: "30 Sessions | Complete in 45 Days (Weekdays)",
    contactPhone: "7057034840",
    liveLink: "https://meet.google.com/eso-nykg-qgi", 

    
    vsl: {
      headlinePart1: "Master Python Programming &",
      headlineHighlight: "Logic Building",
      subheadline: "This cohort is currently in progress. If you missed it, please join the Batch 2 enrollment!",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/course-flyer.jpg"
    },
    
    // 🚨 THE FIX: Upgraded Batch 1 to use the dual-pricing structure!
    pricing: {
      inr: {
        currentPrice: "₹899",
        // originalPrice: "₹899",
        savingsText: "Closed",
        currencyCode: "INR"
      },
      usd: {
        currentPrice: "$200",
        originalPrice: "$250",
        savingsText: "Closed",
        currencyCode: "USD"
      }
    },
    
    outcomes:["Build strong coding logic from scratch", "Write Python programs confidently", "Work on real-world problems", "Become job-ready for entry-level roles"],
    bonuses:["Hands-on Capstone Mini Project", "Learn GitHub Copilot for faster & smarter coding"],
    modules:[
      { title: "Python Fundamentals", topics: ["Python Basics & Setup", "Variables, Inputs & Operators", "Conditional Statements & Loops", "String Handling"] },
      { title: "Data Structures in Python", topics:["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries"] },
      { title: "Core Programming Concepts", topics:["Writing Custom Functions", "Exception Handling", "File Handling"] },
      { title: "Advanced Python", topics:["Object-Oriented Programming", "Virtual Environments & Project Setup"] }
    ]
  }
];