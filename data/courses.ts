// data/courses.ts

export const activeCourses =[
  {
    id: "python-beginners-live-01",
    slug: "python-beginners",
    title: "Python Live Session for Beginners",
    statusText: "🔒 Cohort 1 In Progress",
    demoOffer: "Join Waitlist for Cohort 2",
    duration: "30 Sessions | Complete in 45 Days (Weekdays)",
    contactPhone: "7057034840",
    
    // NEW: Data specifically for the Hero VSL component
    vsl: {
      headlinePart1: "Master Python Programming &",
      headlineHighlight: "Logic Building",
      subheadline: "Stop getting stuck in 'tutorial hell.' Join my interactive live cohort to write code confidently, build real-world projects, and become job-ready in just 45 days.",
      videoCoverUrl: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=2000&auto=format&fit=crop",
      flyerUrl: "/course-flyer.jpg" // The promotional image we added earlier
    },
    
    pricing: {
      currentPrice: "₹599",
      originalPrice: "₹899",
      savingsText: "Lock in Early Bird Pricing for Cohort 2!"
    },
    outcomes:[
      "Build strong coding logic from scratch",
      "Write Python programs confidently",
      "Work on real-world problems",
      "Become job-ready for entry-level roles"
    ],
    bonuses:[
      "Hands-on Capstone Mini Project (Real-world Implementation)",
      "Learn GitHub Copilot for faster & smarter coding"
    ],
    modules:[
      {
        title: "Python Fundamentals",
        topics:["Python Basics & Setup", "Variables, Inputs & Operators", "Conditional Statements & Loops", "String Handling & Functions"]
      },
      {
        title: "Data Structures in Python",
        topics:["Lists & Advanced Operations", "Tuples & Sets", "Dictionaries & Real-world Usage"]
      },
      {
        title: "Core Programming Concepts",
        topics:["Writing Custom Functions", "Exception Handling (Error Management)", "File Handling (Read/Write Operations)"]
      },
      {
        title: "Advanced Python",
        topics:["Object-Oriented Programming (OOPs)", "Virtual Environments & Project Setup"]
      },
      {
        title: "Important Python Modules",
        topics:["JSON (Data Handling)", "OS (System Operations)", "Requests (API Handling)", "Time & Utility Modules"]
      }
    ]
  }
];