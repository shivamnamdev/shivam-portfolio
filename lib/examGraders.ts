// lib/examGraders.ts
// Server-only. The exam graders are Python scripts that run next to the learner's code inside the sandbox in
// lib/runExam.ts. They must never be imported from a client file: that would ship the answers to every browser.
// A grader reads the learner's printed text (sys.stdout.getvalue()) and the learner's definitions (globals()),
// sets the global `score` (0-100) and prints EXAM_SCORE:<n> for the report.

export const EXAM_GRADERS: Record<string, string> = {
  "python-beginners": `
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
          `,
};
