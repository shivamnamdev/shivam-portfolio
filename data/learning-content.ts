// data/learning-content.ts

export const courseCurriculumMap: Record<string, any[]> = {
  
  "python-beginners" :[
  {
    moduleTitle: "Module 1: Python Fundamentals",
    videoIds:[
      "OkK3E7ApZ4Q", // 1. Python Basics & Setup
      "bpjcslHyYEA", // 2. Variables, Inputs & Operators
      "HDBVcmufHlg", // 3. Operators and Built-in Function
      "kF0wuiDRxHQ", // 4. Conditional Statements
      "_IqLtwGJRss", // 5. Conditional Statements Hands On
      "eehv_5rg238", // 7. Jump Statement | While Loop
      "KY6nWfEeQoY", // 8. Thinking Pattern
      "FSsqe5-2Ni0", // 9. For Loop
      "xTktQsnpBmQ", // 10. For Loop Drill Down
      "0D9Y_2mLi7Q", // 11. For Loop - Pattern
      "ln_gWzCl8Xk", // 12. Loops Brush Up
      "8uwC1ldWPZc", // 13. Strings Data Type
      "t8pYAstFTfg"  // 14. Strings Hands On
    ],
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
          title: "Day 09: For Loop",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2009%3A%20For%20Loop/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2009%3A%20For%20Loop/Solution.py"
        },
        "xTktQsnpBmQ": {
          title: "Day 09: For Loop",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Practice%20Questions",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Solution.py"
        },
        "0D9Y_2mLi7Q": {
          title: "Day 10: For Loop Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Assignment2",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Solution2.py"
        },
        "ln_gWzCl8Xk": {
          title: "Day 12: Loop-Pattern",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2011%3A%20Loop-Pattern/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2011%3A%20Loop-Pattern/Solution.py"
        },
        "8uwC1ldWPZc": {
          title: "Day 11: String",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Solutions.py"
        },
        "t8pYAstFTfg": {
          title: "Day 13: String Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment2.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Solutions2.py"
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
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Solution.py"
        },
        "rikgL_Oj5Ds": {
          title: "Day 15: List Hands On Practice",
          rawUrl: "",
          solutionUrl: ""
        },
        "aMKAALJISv4": {
          title: "Day 16: Tuple and Set Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2015%3A%20Tuple%20and%20Set/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2015%3A%20Tuple%20and%20Set/Solution.py"
        },
        "ri_osXAdVNs":{
          title: "Day 17: Dictionary",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Solutions.py"
        }
    }  
  },
  {
    moduleTitle: "Module 3: Core Programming Concepts",
    videoIds:[
       "A-HB_9s1KtU",// 4. Lists & Advanced Operations
       "ihTNWJ-R3Xk",
       "bIXouqD29z0",
       "eyNMM-GXtyI",
       "ZUym9YQfNwI",  // 21. Functions Introduction
       "lkETxENiTEA",
       "3A0ZXNh3rbA"
    ],
    githubAssignments: {
        "A-HB_9s1KtU": {
          title: "Day 18: File Handling",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Solution.py"
        },
        "bIXouqD29z0":{
          title: "Day 19: File Handling Day 2",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Assigment3",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Solution3.py"
        },
        "eyNMM-GXtyI":{
          title: "Day 20: Exceptional Handling",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2020%3A%20Exceptional%20Handling/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2020%3A%20Exceptional%20Handling/Solutions.py"
        },
        "ZUym9YQfNwI": {
          title: "Day 21: Functions",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution.py"
        },
        "lkETxENiTEA": {
          title: "Day 22: Functions Day 2: Global Variables",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment2",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution2.py"
        },
        "3A0ZXNh3rbA" :{
          title: "Day 23: Functions Day 3: Dunders | Import",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment3",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution3.py"
        }
    }
  },
  {
    moduleTitle: "Module 4: Advanced Python",
    videoIds:[
      "uHRAKjaju04",// OOPS Basics: Class and Objects
      "6FT7QQmf-CM", // OOPS: Constructor and Polymorphism
      "P4lUW1xQDG0", // OOPS: Inheritance
      "ACGqQ4TIGAI",
      "TXRqDxL0Ob0" // OOPS: Access Specifier
    ],
    githubAssignments: {
      "uHRAKjaju04": {
          title: "Day 24: OOPs Concepts: Class & Objects",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2024%3A%20OOPS%3A%20Class/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2024%3A%20OOPS%3A%20Class/Solutions.py"
        },
      "6FT7QQmf-CM": {
          title: "Day 25: OOPs Concepts: Constructor & Polymorphism",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/Solutions.py",
          starterCodeUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/AssignmentAddon.docx"
        },
      "P4lUW1xQDG0": {
          title: "Day 26: OOPs Concepts: Inheritance",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2026%3A%20OOPs%3A%20Inheritance/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2026%3A%20OOPs%3A%20Inheritance/Solution.py"
        }, 
       "ACGqQ4TIGAI": {
          title: "Day 27: OOPs Concepts: Access Specifier",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Solution.py"
        
       },
       "TXRqDxL0Ob0": {
          title: "Virtual Environment and PIP",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Solution.py"
        
       }   
    }
  },
  {
    moduleTitle: "Module 5: Important Python Modules",
    videoIds:[
       // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  }
  ],
  "python-beginners-batch-2": [
    {
    moduleTitle: "Module 1: Python Fundamentals",
    videoIds:[
      ],
    githubAssignments: {
        // Video 2 gets an assignment
        "": {
          title: "Day 01: Introduction and print function",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Solution.py"
        },
        // Video 3 gets an assignment
        "": {
          title: "Day 02: Operator",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2002%3A%20Operator/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2002%3A%20Operator/Solution.py"
        },
        "": {
          title: "Day 03: Built-in Functions",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2003%3A%20Built-in%20Functions/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2003%3A%20Built-in%20Functions/Solution.py"
        },
        "": {
          title: "Day 04: Conditional Statement",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Solution.py"
        },
        "": {
          title: "Day 05: Conditional Statement | Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Assignment2.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2004%3A%20Conditional%20Statement/Solution2.py"
        },
        "": {
          title: "Day 06: Looping (While Loop)",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Solution.py"
        },
        "": {
          title: "Day 07: Jump Statements",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Solution.py"
        },
        "": {
          title: "Day 08: Thinking Method",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2008%3A%20Thinking%20Method/Assignment",
          solutionUrl: "https://github.com/shivamnamdev/learn-python-step-by-step/blob/main/Day%2008%3A%20Thinking%20Method/Solution.py"
        },
        "": {
          title: "Day 09: For Loop",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2009%3A%20For%20Loop/Assignment"
        },
        "": {
          title: "Day 10: For Loop Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2010%3A%20For%20Loop%20Hands%20On/Practice%20Questions"
        },
        "": {
          title: "Day 12: Loop-Pattern",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2011%3A%20Loop-Pattern/Patterns.py"
        },
        "": {
          title: "Day 11: String",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Solutions.py"
        },
        "": {
          title: "Day 13: String Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment2.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Solutions2.py"
        }
        // Notice we left Video 1 ("OkK3E7ApZ4Q") out entirely. The Practice tab will hide itself automatically!
      }
  },
  {
    moduleTitle: "Module 2: Data Structures",
    videoIds:[
      
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ],
    githubAssignments: {
        // Video 2 gets an assignment
        "": {
          title: "Day 14: List Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2014%3A%20List%20Data%20Type/Solution.py"
        },
        "": {
          title: "Day 15: List Hands On Practice",
          rawUrl: "",
          solutionUrl: ""
        },
        "": {
          title: "Day 16: Tuple and Set Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2015%3A%20Tuple%20and%20Set/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2015%3A%20Tuple%20and%20Set/Solution.py"
        },
        "":{
          title: "Day 17: Dictionary",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Solutions.py"
        }
    }  
  },
  {
    moduleTitle: "Module 3: Core Programming Concepts",
    videoIds:[
       
    ],
    githubAssignments: {
        "": {
          title: "Day 18: File Handling",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Solution.py"
        },
        "":{
          title: "Day 19: File Handling Day 2",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Assigment3",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day-18%3A%20File%20Handling/Solution3.py"
        },
        "":{
          title: "Day 20: Exceptional Handling",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2020%3A%20Exceptional%20Handling/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2020%3A%20Exceptional%20Handling/Solutions.py"
        },
        "": {
          title: "Day 21: Functions",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution.py"
        },
        "": {
          title: "Day 22: Functions Day 2: Global Variables",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment2",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution2.py"
        },
        "" :{
          title: "Day 23: Functions Day 3: Dunders | Import",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Assignment3",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2021%3A%20Functions/Solution3.py"
        }
    }
  },
  {
    moduleTitle: "Module 4: Advanced Python",
    videoIds:[
      // OOPS: Constructor and Polymorphism
    ],
    githubAssignments: {
      "": {
          title: "Day 24: OOPs Concepts: Class & Objects",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2024%3A%20OOPS%3A%20Class/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2024%3A%20OOPS%3A%20Class/Solutions.py"
        },
      "": {
          title: "Day 25: OOPs Concepts: Constructor & Polymorphism",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/Solutions.py",
          starterCodeUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2025%3A%20OOPS%3A%20Constructor%20%26%20Method%20Overriding/AssignmentAddon.docx"
        },
    }
  },
  {
    moduleTitle: "Module 5: Important Python Modules",
    videoIds:[
       // 4. Lists & Advanced Operations
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ]
  }
  ]
};