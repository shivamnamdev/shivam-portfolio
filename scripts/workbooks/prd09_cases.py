# Test-case content for PRD 09 (Payment APIs). Consumed by build_workbook.py.
# Row: (suffix, scenario, preconditions, steps, expected, priority, scenario id, automated)
PERSONAS = [
 ("V1", "Caller without a session (no cookie, no key)", "NA"),
 ("B1", "Buyer: signed-in learner with no enrolments (rows are removed after each case)", "shivamnamdev.edu@gmail.com"),
 ("B2", "A second signed-in learner (not the buyer; on the QA100 list)", "mavish.ps8@gmail.com"),
 ("B3", "A signed-in learner who is NOT on the QA100 list", "financetrail.bazar@gmail.com"),
 ("CF", "QA fixture course (paid, INR 10 / USD 1)", "qa-checkout-sandbox"),
 ("CC", "A closed cohort from the catalog", "git-beginner-batch-1"),
 ("K", "Coupons: BIRTHDAY20 (20%), QA100 (100%, restricted list), FAKE_COUPON_123 (invalid)", "data/coupons.ts"),
]
LEGEND = "Real Razorpay TEST-mode orders; no popup. The signature is HMAC-SHA256 of order_id|payment_id with the test secret. Unpaid orders are harmless. Expected status codes are what a correct API should return; where the product differs the case is marked as a known failure in the Automated column."
N = "No"
SP = "tests/api/payment-apis.spec.ts"
SHEETS = [
("Create Order Access", "FR1", [
 ("ACC-001","No session and no key","V1","1. POST /api/create-order {courseId, currency}","401 {success:false, error:'401 Unauthorized: Invalid Request'}","P0","PA-01",SP),
 ("ACC-002","Wrong x-api-key","V1","1. POST with header x-api-key: not-the-key","401","P0","PA-01",SP),
 ("ACC-003","Signed-in learner gets an order","B1","1. POST with a valid course","200, success:true, order.status 'created', amount_paid 0, id starts with order_","P0","PA-02",SP),
 ("ACC-004","A userId in the body is ignored","B1","1. POST with extra field userId: someone else","order.notes.userId is the session user","P0","PA-03",SP),
 ("ACC-005","GET is not allowed","B1","1. GET /api/create-order","405","P2","PA-04",SP),
 ("ACC-006","Unreadable body","B1","1. POST the text '{not json'","400 (client error), not 500","P2","PA-04",SP),
]),
("Create Order Validation", "FR2", [
 ("VAL-001","Unknown course","B1","1. POST courseId 'course-that-does-not-exist'","400 'Course not found'","P0","PA-05",SP),
 ("VAL-002","Missing courseId","B1","1. POST with no courseId","400 'Course not found'","P1","PA-05",SP),
 ("VAL-003","Closed cohort","B1; CC","1. POST the closed course id","400 'Enrollment is closed for this course'","P0","PA-06",SP),
 ("VAL-004","Unknown currency","B1","1. POST currency 'EUR', undefined, 123","Order is created in INR at the INR price","P1","PA-07",SP),
 ("VAL-005","Lower-case currency","B1","1. POST currency 'usd'","Treated as INR (strict match); documented","P2","PA-07",SP),
 ("VAL-006","Invalid coupon","B1","1. POST couponCode FAKE_COUPON_123","400 'Invalid coupon code'","P0","PA-08",SP),
 ("VAL-007","Restricted coupon for the wrong account","B3","1. POST couponCode QA100","403","P0","PA-08",SP),
 ("VAL-008","Coupon code case","B1","1. POST couponCode 'birthday20'","Accepted (20% off, 800 paise)","P1","PA-08",SP),
 ("VAL-009","Client-sent price is ignored","B1","1. POST with amount, price and finalAmount = 1","order.amount is the server price (1000)","P0","PA-09",SP),
]),
("Create Order Amount and Content", "FR3", [
 ("AMT-001","INR amount in paise","B1","1. POST INR","order.amount 1000, currency INR","P0","PA-10",SP),
 ("AMT-002","USD amount in cents","B1","1. POST USD","order.amount 100, currency USD","P0","PA-10",SP),
 ("AMT-003","20% coupon","B1","1. POST INR with BIRTHDAY20","order.amount 800","P0","PA-11",SP),
 ("AMT-004","Floor at one unit (SCP-51)","B1","1. POST USD with BIRTHDAY20 (0.80) and INR with QA100 (0)","Both orders are 100: a paid order is never below one unit","P1","PA-11",SP),
 ("AMT-005","Order notes","B1","1. POST with BIRTHDAY20","notes = {userId, courseId, courseSlug, couponCode}","P0","PA-12",SP),
 ("AMT-006","Receipt format","B1","1. Create an order","receipt 'rcpt_' plus digits, at most 40 characters","P2","PA-12",SP),
 ("AMT-007","New order is unpaid","B1","1. Create an order","status 'created', amount_paid 0","P1","PA-12",SP),
 ("AMT-008","Every order is new","B1","1. Create two orders","Different ids","P1","PA-12",SP),
]),
("Verify Payment Access and Signature", "FR4", [
 ("SIG-001","Visitor","V1","1. POST /api/verify-payment","401","P0","PA-13",SP),
 ("SIG-002","Missing fields","B1","1. POST with one or two of the three fields","400 'Invalid payment signature'","P0","PA-14",SP),
 ("SIG-003","Wrong signature","B1; an order","1. POST with signature 'deadbeef'","400; no enrolment","P0","PA-14",SP),
 ("SIG-004","Signature made with another secret","B1; an order","1. Sign with a different secret","400; no enrolment","P0","PA-14",SP),
 ("SIG-005","Signature for another payment id","B1; an order","1. Change razorpay_payment_id only","400; no enrolment","P0","PA-14",SP),
 ("SIG-006","Upper-case signature","B1; an order","1. Send the correct signature in upper case","400 (comparison is case-sensitive)","P2","PA-14",SP),
 ("SIG-007","Empty body","B1","1. POST {}","400","P1","PA-14",SP),
 ("SIG-008","Correct signature for an order that does not exist","B1","1. Sign order_doesNotExist01 and POST","A client error (4xx), not a server error","P1","PA-15","tests/api/payment-apis.spec.ts (known failure: returns 500)"),
]),
("Verify Payment Binding and Enrolment", "FR5", [
 ("BND-001","Valid payment enrols once","B1; a signed order","1. POST the verification twice, with extra body fields courseSlug/courseId set to another course","200 both times; one row for the course on the ORDER","P0","PA-16",SP),
 ("BND-002","Repeat verification adds nothing","BND-001","1. Count enrolment rows and activity entries","One row, one 'New Paid Enrollment' entry","P0","PA-16",SP),
 ("BND-003","Another account cannot claim the order","B1 order; B2","1. B2 posts a valid verification of B1's order","403; no row for either","P0","PA-17",SP),
 ("BND-004","Order without buyer and course notes","B1; an order made directly at Razorpay","1. POST its verification","400; no row","P0","PA-17",SP),
 ("BND-005","Activity entry","BND-001","1. Read admin_activity_log","'New Paid Enrollment: QA Checkout Sandbox' once","P1","PA-18",SP),
 ("BND-006","Course comes from the order","BND-001","1. Compare the row with the order notes","Course is the fixture, not the body value","P0","PA-16",SP),
 ("BND-007","Coupon recorded","B1; order with BIRTHDAY20","1. Verify, read the row","coupon_used = BIRTHDAY20","P1","PA-18",SP),
]),
("Robustness", "FR6", [
 ("RBT-001","Parallel verification of one order","B1; a signed order","1. POST the verification three times at once","All 200; exactly one row (known failure: check-then-insert race, SCP-44)","P0","PA-19","tests/api/payment-apis.spec.ts (known failure)"),
 ("RBT-002","Razorpay keys missing","Server without keys","1. POST create-order","500 'Missing Keys'","P2","PA-20",N+" (needs a server without keys)"),
 ("RBT-003","Welcome e-mail count","BND-001","1. Check the buyer inbox","Exactly one welcome e-mail per new enrolment, none for the repeat","P1","PA-21",N+" (needs mailbox access; owner checks manually)"),
]),
]
