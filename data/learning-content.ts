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
      "ln_gWzCl8Xk",
      "8uwC1ldWPZc",
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
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Solution.py"
        },
        // Video 3 gets an assignment
        "bpjcslHyYEA": {
          title: "Day 02: Operator",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2002%3A%20Operator/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2002%3A%20Operator/Solution.py"
        },
        "HDBVcmufHlg": {
          title: "Day 03: Built-in Functions",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2003%3A%20Built-in%20Functions/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2003%3A%20Built-in%20Functions/Solution.py"
        },
        "kF0wuiDRxHQ": {
          title: "Day 04: Conditional Statement",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Solution.py"
        },
        "_IqLtwGJRss": {
          title: "Day 05: Conditional Statement | Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Assignment2.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Solution2.py"
        },
        "eehv_5rg238": {
          title: "Day 06: Looping (While Loop)",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Solution.py"
        },
        "KY6nWfEeQoY": {
          title: "Day 07: Jump Statements",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Solution.py"
        },
        "FSsqe5-2Ni0": {
          title: "Day 08: Thinking Method",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2008%3A%20Thinking%20Method/Assignment",
          solutionUrl: "https://github.com/shivamnamdev/learn-python-step-by-step/blob/main/Day%2008%3A%20Thinking%20Method/Solution.py"
        },
        "xTktQsnpBmQ": {
          title: "Day 09: For Loop",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2009%3A%20For%20Loop/Assignment"
        },
        "0D9Y_2mLi7Q": {
          title: "Day 10: For Loop Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Practice%20Questions"
        },
        "ln_gWzCl8Xk": {
          title: "Day 12: Loop-Pattern",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2011%3A%20Loop-Pattern/Patterns.py"
        },
        "8uwC1ldWPZc": {
          title: "Day 11: String",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment.docx"
        },
        "t8pYAstFTfg": {
          title: "Day 13: String Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment2.docx"
        }
        // Notice we left Video 1 ("OkK3E7ApZ4Q") out entirely. The Practice tab will hide itself automatically!
      }
  },
  {
    moduleTitle: "Module 2: Data Structures",
    videoIds:[
      "TtsqgKlLzlg", // 4. Lists & Advanced Operations
      "rikgL_Oj5Ds",
      "aMKAALJISv4",// tuple and set
      "ri_osXAdVNs", // Dictionary
      "HUXjBqiJ6sk"
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ],
    githubAssignments: {
        // Video 2 gets an assignment
        "TtsqgKlLzlg": {
          title: "Day 14: List Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Assignment.docx"
        },
        "rikgL_Oj5Ds": {
          title: "Day 15: List Hands On Practice",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Assignment.docx"
        },
        "aMKAALJISv4": {
          title: "Day 16: Tuple and Set Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/78415aab26bd2a44bb579835fb734d03f0edd2f5/Day%2015%3A%20Tuple%20and%20Set/Assignment.docx"
        },
        "ri_osXAdVNs":{
          title: "Day 17: Dictionary",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Assignment.docx"
        }
    }  
  },
  {
    moduleTitle: "Module 3: Core Programming Concepts",
    videoIds:[
       "A-HB_9s1KtU",// 4. Lists & Advanced Operations
       "ihTNWJ-R3Xk"  // 5. Dictionaries & Real-world Usage
    ],
    githubAssignments: {
        "A-HB_9s1KtU": {
          title: "Day 18: File Handling",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Assignment"
        }
    }
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