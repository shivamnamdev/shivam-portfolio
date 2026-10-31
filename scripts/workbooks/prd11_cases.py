# Test-case content for PRD 11 (Clerk, webhook and user-lookup APIs). Consumed by build_workbook.py.
PERSONAS = [
 ("V1", "Caller without a session", "NA"),
 ("A1", "Admin (the only caller allowed on the user routes)", "shivamnamdev.corp@gmail.com"),
 ("L1", "Signed-in learner (negative access)", "mavish.ps8@gmail.com"),
 ("WH", "Webhook caller: signs the body with CLERK_WEBHOOK_SECRET using svix, exactly as Clerk does", "svix"),
 ("ID", "Clerk ids resolved by e-mail at run time (edu, mavish, bazar, corp)", "Clerk API"),
]
LEGEND = "Webhook cases only use events that cannot send an e-mail (a user.created without an address logs the signup and sends nothing). Signup log rows tagged QA-WEBHOOK are removed after each case. Expected codes describe a correct API; known failures are marked."
SP = "tests/api/clerk-apis.spec.ts"
SHEETS = [
("Clerk Webhook", "FR1-FR5", [
 ("WHK-001","No svix headers","V1","1. POST /api/webhooks/clerk with no svix headers","400; no log row","P0","CA-01",SP),
 ("WHK-002","Forged signature","V1","1. POST with svix-signature 'v1,Zm9yZ2Vk'","400; no log row","P0","CA-01",SP),
 ("WHK-003","Old message","WH","1. Sign a message dated 20 minutes ago and POST","400 (older than five minutes)","P0","CA-02",SP),
 ("WHK-004","Wrong secret","WH","1. Sign with another secret and POST","400","P0","CA-01",SP),
 ("WHK-005","Body changed after signing","WH","1. Sign one body, send another","400","P0","CA-01",SP),
 ("WHK-006","Signed user.created","WH","1. Send user.created with no e-mail address","200 {success:true}; one 'signup' activity row 'New Account Created: …' with e-mail 'No email'","P0","CA-03",SP),
 ("WHK-007","Other event type","WH","1. Send a signed user.updated","200; no log row","P1","CA-04",SP),
 ("WHK-008","Same message delivered twice","WH","1. POST the same signed message twice (a Clerk retry)","One log row (known failure: two rows; a retry would also send two welcome e-mails)","P1","CA-05",SP+" (known failure)"),
 ("WHK-009","user.created without email_addresses","WH","1. Send user.created with no email_addresses field","A 2xx or 4xx answer, not 500 (known failure: 500, Clerk would retry for days)","P1","CA-06",SP+" (known failure)"),
 ("WHK-010","GET","V1","1. GET /api/webhooks/clerk","405","P2","CA-01",SP),
 ("WHK-011","Welcome and admin e-mails on a real signup","A new Clerk user","1. Sign up a new user 2. Check both inboxes","One welcome e-mail to the new user, one 'NEW USER SIGNUP' e-mail to the owner","P1","CA-07","No (needs a real signup and mailbox access; owner checks manually)"),
]),
("User Directory API", "FR6", [
 ("USR-001","Visitor","V1","1. GET /api/get-all-users","401","P0","CA-08",SP),
 ("USR-002","Learner","L1","1. GET /api/get-all-users","403; no e-mail addresses in the body","P0","CA-08",SP),
 ("USR-003","Admin gets the directory","A1","1. GET /api/get-all-users","200 {success:true, users[]}; each user has exactly id, name, email, joinedAt, image","P0","CA-09",SP),
 ("USR-004","The four personas are listed","A1","1. Find each persona by e-mail","Present; ids equal the Clerk ids","P1","CA-09",SP),
 ("USR-005","Newest first, not cacheable","A1","1. Read joinedAt order and Cache-Control","Descending; no public caching","P1","CA-10",SP),
 ("USR-006","Other methods","A1","1. POST /api/get-all-users","405","P2","CA-08",SP),
]),
("User Lookup API", "FR7", [
 ("LKP-001","Visitor","V1","1. POST /api/get-clerk-users","401","P0","CA-11",SP),
 ("LKP-002","Learner","L1","1. POST with a valid id","403; no e-mail in the body","P0","CA-11",SP),
 ("LKP-003","Empty input","A1","1. POST {}, [], 'user_x', null as userIds","200 {success:true, users:{}}","P1","CA-12",SP),
 ("LKP-004","Known ids","A1","1. POST two persona ids","200; map keyed by id with exactly name, email, image","P0","CA-12",SP),
 ("LKP-005","Unknown ids","A1","1. POST an unknown id","200; empty map","P1","CA-12",SP),
 ("LKP-006","Mixed ids","A1","1. POST two known and one unknown","Only the known ones are returned","P1","CA-12",SP),
 ("LKP-007","Ids that are not text","A1","1. POST [123, {a:1}]","4xx or 200, not 500","P2","CA-13",SP),
 ("LKP-008","Very long list","A1","1. POST 600 ids","4xx or 200, not 500","P2","CA-13",SP),
 ("LKP-009","GET","A1","1. GET /api/get-clerk-users","405","P2","CA-11",SP),
]),
]
