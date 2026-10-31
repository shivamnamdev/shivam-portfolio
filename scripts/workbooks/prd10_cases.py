# Test-case content for PRD 10 (Enrollment APIs). Consumed by build_workbook.py.
PERSONAS = [
 ("V1", "Caller without a session", "NA"),
 ("L1", "Signed-in learner on the QA100 list, no enrolments (rows removed after each case)", "shivamnamdev.edu@gmail.com"),
 ("L2", "Signed-in learner NOT on the QA100 list", "financetrail.bazar@gmail.com"),
 ("A1", "Admin (the only caller allowed on /api/admin/enroll)", "shivamnamdev.corp@gmail.com"),
 ("CF", "QA fixture course (paid INR 10 / USD 1; free with QA100)", "qa-checkout-sandbox"),
 ("CC", "Closed cohort", "git-beginner-batch-1"),
 ("ID1", "Clerk id of L1", "user_3HqZ9LJ5SwgMYOdM4cnvqCPxPo4"),
]
LEGEND = "Calls go straight to the routes with a real Clerk session. Every enrolment, coupon record and activity entry is removed after each case. Expected codes describe a correct API; where the product differs the case is marked a known failure."
SP = "tests/api/enrollment-apis.spec.ts"
SHEETS = [
("Free Enrollment API", "FR1-FR4", [
 ("FRE-001","Visitor","V1","1. POST /api/enroll-free with QA100","401 'Unauthorized'","P0","EA-01",SP),
 ("FRE-002","Unknown course","L1","1. POST courseId 'nope'","400 'Course not found'","P0","EA-02",SP),
 ("FRE-003","Closed cohort","L1; CC","1. POST the closed course id","400 'Enrollment is closed for this course'","P0","EA-02",SP),
 ("FRE-004","No coupon","L1","1. POST {courseId} only","400 'Payment required.'; no row","P0","EA-03",SP),
 ("FRE-005","Invalid coupon","L1","1. POST FAKE_COUPON_123","400 'Invalid coupon code'","P0","EA-04",SP),
 ("FRE-006","Restricted coupon, wrong account","L2","1. POST QA100","403; no row","P0","EA-04",SP),
 ("FRE-007","Coupon that does not make it free","L1","1. POST BIRTHDAY20 in INR and in USD","400 'Payment required.'; no row","P0","EA-03",SP),
 ("FRE-008","QA100 enrols","L1","1. POST QA100","200 {success:true, message:'Enrolled for free successfully!'}; one row with coupon_used QA100","P0","EA-05",SP),
 ("FRE-009","Course comes from courseId","L1","1. POST with courseSlug/slug set to another course","Row is for the fixture only","P0","EA-05",SP),
 ("FRE-010","Activity entry","L1","1. After FRE-008 read admin_activity_log","'New Free Enrollment (Coupon: QA100): qa-checkout-sandbox' once","P1","EA-06",SP),
 ("FRE-011","Second call","FRE-008","1. POST again","200 'You are already enrolled in this course.'; still one row, one entry","P0","EA-07",SP),
 ("FRE-012","USD","L1","1. POST currency USD with QA100","200; one row","P1","EA-05",SP),
 ("FRE-013","Lower-case coupon","L1","1. POST 'qa100'","200; one row","P2","EA-05",SP),
 ("FRE-014","Public coupon larger than the price","L1","1. POST EXISTINGSTUDENT_BATCH03 on the fixture","200; coupon recorded (a public code makes a cheap course free; business rule to confirm)","P1","EA-08",SP),
 ("FRE-015","Parallel calls","L1","1. POST QA100 five times at once","All 200; exactly one row (known failure: SCP-44)","P0","EA-09",SP+" (known failure)"),
 ("FRE-016","GET","L1","1. GET /api/enroll-free","405","P2","EA-02",SP),
]),
("Manual Enrollment API", "FR5-FR8", [
 ("ADM-001","Visitor","V1","1. POST /api/admin/enroll","401; no row","P0","EA-10",SP),
 ("ADM-002","Learner","L1","1. POST a valid body as a learner","403; no row","P0","EA-10",SP),
 ("ADM-003","Missing, blank id","A1","1. POST userId undefined, '', '   '","400 'Please enter a valid Clerk User ID.'","P0","EA-11",SP),
 ("ADM-004","Non-text id","A1","1. POST userId 12345, null, an object","400 same message","P1","EA-11",SP),
 ("ADM-005","Unknown course","A1","1. POST courseSlug 'nope' with an unknown id","400 'Course not found.' (checked before the user)","P0","EA-12",SP),
 ("ADM-006","Unknown Clerk user","A1","1. POST an unknown id","404 'No Clerk user found with that ID.'","P0","EA-12",SP),
 ("ADM-007","Valid grant","A1; ID1","1. POST ID1 and the fixture","200 {success, enrollment{user_id, course_slug, user_email, enrolled_at}}; one row; activity 'Backdoor access granted to qa-checkout-sandbox'","P0","EA-13",SP),
 ("ADM-008","Repeat","ADM-007","1. POST again","409 'Student is already enrolled!'; one row","P0","EA-14",SP),
 ("ADM-009","Id with spaces; coupon ignored","A1","1. POST '  ID1  ' with couponCode QA100","Works; coupon_used stays empty","P1","EA-13",SP),
 ("ADM-010","GET","A1","1. GET /api/admin/enroll","405","P2","EA-10",SP),
 ("ADM-011","Parallel grants","A1; ID1","1. POST the same grant five times at once","One row (known failure: SCP-44)","P0","EA-15",SP+" (known failure)"),
 ("ADM-012","Grant to the admin","A1","1. POST the admin's own id","200; one row","P2","EA-13",SP),
]),
]
