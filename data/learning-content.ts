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
      "ACGqQ4TIGAI", // OOPS: Access Specifier
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
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2026%3A%20OOPs%3A%20Inheritance/Solution.py",
          carryOverCode: true
        }, 
       "ACGqQ4TIGAI": {
          title: "Day 27: OOPs Concepts: Access Specifier",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2027%3A%20OOPs%20Access%20Specifier/Solution.py",
          carryOverCode: true
       }  
    }
  },
  {
    moduleTitle: "Module 5: Important Python Modules",
    videoIds:[
      "TXRqDxL0Ob0",
      "AZshKqAy0Qc",
      "WhP2F-xk3Kk"
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ], githubAssignments: {
        "WhP2F-xk3Kk": {
    title: "Final Foundation Certification Exam",
    rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Assignments/refs/heads/main/python-basics/v1.docx",
    starterCodeUrl: "https://raw.githubusercontent.com/shivamnamdev/Assignments/refs/heads/main/python-basics/v1_addon.docx",
    isExam: true, // 🚨 Marks this as the test!
    expectedOutcomeUrl: "https://raw.githubusercontent.com/shivamnamdev/Assignments/refs/heads/main/python-basics/v1_expected_result.py",
    // The Python test script that grades all 5 steps!
    testCode: `
          # ---------------------------------------------------------
          # SHIVAM ACADEMY: FINAL EXAM AUTO-GRADER
          # ---------------------------------------------------------
          import sys
          import re
          import traceback

          score = 0
          total_questions = 5
          points_per_question = 20

          # Capture everything the student printed to the terminal
          student_output = sys.stdout.getvalue().strip()
          student_globals = globals()

          print("\\n" + "="*50)
          print("🤖 SHIVAM ACADEMY AUTO-GRADER RUNNING...")
          print("="*50)

          # ==========================================
          # Q1: Advanced List Analyzer
          # ==========================================
          try:
              q1_passed = False
              
              # Check for the correct Topper and Lowest
              has_topper = re.search(r'Jaskeerat', student_output, re.IGNORECASE)
              has_lowest = re.search(r'Amit', student_output, re.IGNORECASE)
              
              # Check for students >80 in 3 subjects
              has_top_performers = re.search(r'Smeeta', student_output, re.IGNORECASE) and re.search(r'Jaskeerat', student_output, re.IGNORECASE)
              
              # 🚨 THE FIX: Strict check for the EXACT Improvement Report logic!
              has_improvement = (
                  re.search(r'Rahul\s*(->|:|-)?\s*Yes', student_output, re.IGNORECASE) and
                  re.search(r'Smeeta\s*(->|:|-)?\s*No', student_output, re.IGNORECASE) and
                  re.search(r'Amit\s*(->|:|-)?\s*No', student_output, re.IGNORECASE) and
                  re.search(r'Jaskeerat\s*(->|:|-)?\s*Yes', student_output, re.IGNORECASE) and
                  re.search(r'Niraj\s*(->|:|-)?\s*Yes', student_output, re.IGNORECASE)
              )
              
              if has_topper and has_lowest and has_top_performers and has_improvement:
                  score += points_per_question
                  q1_passed = True
                  print("✅ Q1 (Lists) passed! Excellent data extraction and improvement logic.")
              else:
                  print("❌ Q1 (Lists) failed: Double check your 'Improvement Report' Yes/No logic!")
          except Exception as e:
              print(f"❌ Q1 (Lists) crashed: {str(e)}")

          # ==========================================
          # Q2: Advanced String Validator
          # ==========================================
          try:
              q2_passed = False
              
              # 🚨 THE FIX: Check for Medium, and correct counts (9 Lowercase)
              has_counts = "2" in student_output and "9" in student_output and "5" in student_output
              has_masked = re.search(r'Py\\*+5!', student_output)
              has_rating = re.search(r'Medium', student_output, re.IGNORECASE)

              if has_counts and has_masked and has_rating:
                  score += points_per_question
                  q2_passed = True
                  print("✅ Q2 (Strings) passed! Great slicing and formatting.")
              else:
                  print("❌ Q2 (Strings) failed: Check your character counts, masking, or final rating logic.")
          except Exception as e:
              print(f"❌ Q2 (Strings) crashed: {str(e)}")

          # ==========================================
          # Q3: Advanced Dictionary Payroll
          # ==========================================
          try:
              q3_passed = False
              
              has_highest_dept = re.search(r'Finance', student_output, re.IGNORECASE)
              has_payslips = re.search(r'54000', student_output) and re.search(r'55000', student_output) and re.search(r'28000', student_output)
              has_bands = re.search(r'Senior', student_output, re.IGNORECASE) and re.search(r'Mid', student_output, re.IGNORECASE)

              if has_highest_dept and has_payslips and has_bands:
                  score += points_per_question
                  q3_passed = True
                  print("✅ Q3 (Dictionaries) passed! Perfect payroll calculations.")
              else:
                  print("❌ Q3 (Dictionaries) failed: Verify your net salary deductions and department averages.")
          except Exception as e:
              print(f"❌ Q3 (Dictionaries) crashed: {str(e)}")

          # ==========================================
          # Q4: File & Exception Handling
          # ==========================================
          try:
              q4_passed = False
              
              required_funcs = ['create_log_file', 'add_task', 'read_tasks', 'search_task', 'delete_task', 'generate_report']
              funcs_exist = all(func in student_globals for func in required_funcs)
              
              if funcs_exist:
                  score += points_per_question
                  q4_passed = True
                  print("✅ Q4 (File Handling) passed! All required functions defined.")
              else:
                  print("❌ Q4 (File Handling) failed: You did not define all the required functions exactly as named in the instructions.")
          except Exception as e:
              print(f"❌ Q4 (File Handling) crashed: {str(e)}")

          # ==========================================
          # Q5: OOPs Debugging & Extending
          # ==========================================
          try:
              q5_passed = False
              
              if 'Hospital' in student_globals and 'Doctor' in student_globals and 'Patient' in student_globals:
                  Hospital = student_globals['Hospital']
                  Doctor = student_globals['Doctor']
                  Patient = student_globals['Patient']
                  
                  if hasattr(Hospital, 'discharge_patient') and hasattr(Hospital, 'get_doctor_report'):
                      if hasattr(Patient, 'calculate_discount') and hasattr(Doctor, 'show_cabin'):
                          score += points_per_question
                          q5_passed = True
                          print("✅ Q5 (OOPs) passed! Errors fixed and new methods successfully implemented.")
                      else:
                          print("❌ Q5 (OOPs) failed: Missing 'calculate_discount' or 'show_cabin' methods.")
                  else:
                      print("❌ Q5 (OOPs) failed: Missing 'discharge_patient' or 'get_doctor_report' methods.")
              else:
                  print("❌ Q5 (OOPs) failed: The required classes were not found. Did you rename them?")
          except Exception as e:
              print(f"❌ Q5 (OOPs) crashed: {str(e)}")

          # ==========================================
          # FINAL OUTPUT FOR REACT FRONTEND
          # ==========================================
          print("="*50)
          print(f"EXAM_SCORE:{score}")
          print("="*50)
          `
        }
      }
    },
  {
    moduleTitle: "Advance Videos",
    isAdvancedModule: true, // 🚨 Put the flag here!
    videoIds:[
      "Q8vLb-kmFYs"
    ], 
    githubAssignments: {
        // Now you only need to put assignments here if they actually have code exercises!
        "Q8vLb-kmFYs": {
          title: "Iterator",
          rawUrl: "..."
        }
    }  
  }
  ],
  "python-beginners-batch-2": [
    {
    moduleTitle: "Module 1: Python Fundamentals",
    videoIds:[
      "a9nrrH5XkG0",
      "5G3VcAR2P_E",
      "rAtMuWP2xb4",
      "cWVEzNPGim8",
      "yK_VtRPE8-A",
      "lgG6aXB0Ftk",
      "IILdaThXVbE",
      "cuVzn9346-I",
      "doc-thinking-pattern",
      "4qwG1f3FL_M",
      "QQiKhBIv60U"
  ],
    githubAssignments: {
        // Video 1 gets an assignment
        "a9nrrH5XkG0": {
          title: "Day 01: Introduction and print function",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2001%3A%20Introduction%20and%20print%20function/Solution.py"
        },
        // Video 2 gets an assignment
        "5G3VcAR2P_E": {
          title: "Day 02: Operator and Built-in Functions",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-2/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-2/Solution.py"
        },
        "rAtMuWP2xb4": {
          title: "Day 03: Conditional Statement Basics",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-3/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-3/Solution.py"
        },
        "cWVEzNPGim8": {
          title: "Day 04: Conditional Statement | Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-4/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-4/Solution.py"
        },
        "yK_VtRPE8-A": {
          title: "Day 05: Looping (While Loop)",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2006%3A%20Looping/Solution.py"
        },
        "lgG6aXB0Ftk": {
          title: "Day 06: Jump Statements",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Assignment",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2007%3A%20Jump%20Statements/Solution.py"
        },
        "IILdaThXVbE": {
          title: "Day 07: For Loop",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-7/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-7/Solution.py"
        },
        "cuVzn9346-I": {
          title: "Day 08: Thinking Method",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Bonus%20Session/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Bonus%20Session/Solution.py"
        },
        "4qwG1f3FL_M": {
          title: "Day 12: Loop-Pattern",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-8/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-8/Solution.py"
        },
        "": {
          title: "Day 13: String Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Assignment2.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2012%3A%20String/Solutions2.py"
        }
        // Notice we left Video 1 ("OkK3E7ApZ4Q") out entirely. The Practice tab will hide itself automatically!
      },
    resources: {
        // Video 2 gets 1 PPTX
        "": [
          { title: "Module 1 Slides", url: "/slides.pptx", type: "PowerPoint" }
        ],
        // Standalone DOCX details
        "doc-thinking-pattern": {
          title: "Right Thinking Pattern for Coding",
          description: "Follow these steps to solve Python Programs.",
          url: "https://s3.ap-south-1.amazonaws.com/python-course.shivamnamdev.com/4_Step_Thinking_Method_CheatSheet.pdf",
          type: "Document"
        },
        // Video 4 gets 2 PDFs
        "": [
          { title: "Cheat Sheet 1", url: "/sheet1.pdf", type: "PDF" },
          { title: "Cheat Sheet 2", url: "/sheet2.pdf", type: "PDF" }
        ]
      }  
  },
  {
    moduleTitle: "Module 2: Data Structures",
    videoIds:[
      "vw3UmzifSPY",
      "xSKiJQSPs5Q",
      "9bvIiIq7WJc",
      "mquup0fAopA",
      "cCb1IJHW43w",
      "Rkbi7PdCoNw"
      // "daefaLgNkw0"  // 5. Dictionaries & Real-world Usage
    ],
    githubAssignments: {
        "vw3UmzifSPY": {
          title: "Day 9: String",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-9/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-9/Solution.py"
        },
        "xSKiJQSPs5Q": {
          title: "Day 10: Strings Hands On",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-10/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-10/Solution.py"
        },
      "9bvIiIq7WJc": {
          title: "Day 11: List Data Type",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-11/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-11/Solution.py"
        },
        "mquup0fAopA": {
          title: "Day 12: List Hands On Practice",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-12/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/Python-batch-3/refs/heads/main/Day-12/Solution.py"
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
  ],
  "git-beginner-batch-1" :[
  {
    moduleTitle: "Module 1: Why Git Exists",
    videoIds:[
      "LNmtD68zih0"
  ],
    githubAssignments: {
        // Video 1 gets an assignment
        "LNmtD68zih0": {
          title: "Git Day 01: Init, Add, Commit",
          labType: "git",
          instructionsUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_01/instructions.md",
          starterRepoUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_01/repo-seed.json",
          expectedStateUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_01/expected-state.json",
          validatorUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_01/validator.json",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_01/solution.md"
          }
      },
    resources: {
      }  
  },
  {
    moduleTitle: "Module 2: Core Git Workflow",
    videoIds:[
     "xKhjGmOxmSQ",
      "UmrdGzO3HLE"
    ],
    githubAssignments: {
        "xKhjGmOxmSQ": {
          title: "Git Day 02: diff, show, log",
          labType: "git",
          instructionsUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_02/instructions.md",
          starterRepoUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_02/reposeed.json",
          expectedStateUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_02/expected-seed.json",
          validatorUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_02/validator.json",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/git_practicals/refs/heads/main/Day_02/solutions.md"
        },
        "":{
          title: "Day 17: Dictionary",
          rawUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Assignment.docx",
          solutionUrl: "https://raw.githubusercontent.com/shivamnamdev/learn-python-step-by-step/refs/heads/main/Day%2016%3A%20Dictionary/Solutions.py"
        }
    },
    resources: {
        
        "xKhjGmOxmSQ": [
          { title: "Git Day 01 Cheatsheet", url: "https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/git_cheatsheet_part1.pdf", type: "PDF" }
        ]
      }    
  },
  {
    moduleTitle: "Module 3: Branches and Safe Deployment",
    videoIds:[
      "EGyjbM4rAVQ",
      "xCQdkzcI7Fs",
      "O1Es9VVaJFY", 
      "KSlo8Xfqlrs",
      "Tz8Ii_01Xj8",
      "7IvCY9PzWjk"
    ],
    githubAssignments: {
    }
  },
  {
    moduleTitle: "Module 4: Remote Repositories and Github",
    videoIds:[
      "12cB5HfjZOw",
      "YSoPLYPc1I4",
      "Z_q3lV9ADi4",
      "1hb12RrnTgo"
    ],
    githubAssignments: {
    }
  },
  {
    moduleTitle: "Module 5: Industry Workflow",
    videoIds:[
      "iU9ZGojVVgU",
      "FjndEmsNTEU",
      "RRbfKrZgEGc",
      "doc-Git-Cheatsheet"
    ], 
    githubAssignments: {
   
      },
    resources: {
        // Standalone DOCX details
        "doc-Git-Cheatsheet": {
          title: "Git Cheatsheet",
          description: "Git Complete Course Cheatsheet",
          url: "https://s3.ap-south-1.amazonaws.com/git-course-content.shivamnamdev.com/Git+Cheatsheet.pdf",
          type: "Document"
        }
      } 
    }
  ]
};
