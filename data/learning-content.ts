// data/learning-content.ts

export const courseCurriculumMap: Record<string, any[]> = {
  
  "python-beginners" :[
  {
    moduleTitle: "Module 1: Python Fundamentals",
    videoIds:[
      "OkK3E7ApZ4Q", // 1. Python Basics & Setup
      "bpjcslHyYEA", // 2. Variables, Inputs & Operators
      "HDBVcmufHlg",  // 3. Conditional Statements
      "kF0wuiDRxHQ",
      "_IqLtwGJRss",
      "eehv_5rg238",
      "KY6nWfEeQoY",
      "FSsqe5-2Ni0",
      "xTktQsnpBmQ",
      "0D9Y_2mLi7Q",
      "8uwC1ldWPZc",
      "ln_gWzCl8Xk",
      "t8pYAstFTfg"
    ],
      // 🚨 NEW: Adding Interactive Assignments!
      // assignments: {
      //   "OkK3E7ApZ4Q": {
      //     question: "Write a Python script that prints 'Hello, Automation World!' to the console.",
      //     starterCode: "# Write your code below:\n\nprint('...')",
      //   },
      //   "bpjcslHyYEA": {
      //     question: "Create two variables: 'a' with the value 10, and 'b' with the value 5. Print their sum.",
      //     starterCode: "# Create your variables here\n\n\n# Print the sum\n",
      //   }
      // },
    githubAssignments: {
        // Video 2 gets an assignment
        "OkK3E7ApZ4Q": {
          title: "Day 01: Introduction and print function",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Assignment"
        },
        // Video 3 gets an assignment
        "bpjcslHyYEA": {
          title: "Day 02: Operator",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2002%3A%20Operator/Assignment"
        }
        // Notice we left Video 1 ("OkK3E7ApZ4Q") out entirely. The Practice tab will hide itself automatically!
      }
  },
  {
    moduleTitle: "Module 2: Data Structures",
    videoIds:[
      "TtsqgKlLzlg", // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  },
  {
    moduleTitle: "Module 3: Core Programming Concepts",
    videoIds:[
       // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  },
  {
    moduleTitle: "Module 4: Advanced Python",
    videoIds:[
       // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  },
  {
    moduleTitle: "Module 5: Important Python Modules",
    videoIds:[
       // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  }
  ],
  "python-beginners-batch-2":[
    {
      moduleTitle: "Module 1: Python Fundamentals",
      // 🚨 PUT YOUTUBE IDs HERE TO UNLOCK THE VIDEOS!
      videoIds:[] 
    },
    {
      moduleTitle: "Module 2: Data Structures",
      videoIds:[]
    }
  ]
};