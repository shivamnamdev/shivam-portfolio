# Test-case content for PRD 13 (AI tutor, certificate and learning-support APIs). Consumed by build_workbook.py.
PERSONAS = [
 ("V1", "Caller without a session", "NA"),
 ("L1", "Signed-in learner with a stats row (its time and points are restored after each case)", "mavish.ps8@gmail.com"),
 ("CF", "QA fixture course used for temporary progress rows", "qa-checkout-sandbox"),
]
LEGEND = "The AI tutor is a mock today (no model is called). Certificates are built in memory, nothing is stored. track-time and xp/sync write the stats row of L1, which is restored after every case. Expected codes describe a correct API; known failures are marked."
SP = "tests/api/learning-apis.spec.ts"
SHEETS = [
("AI Tutor API", "FR1-FR3", [
 ("TUT-001","Visitor can call it","V1","1. POST /api/ai-tutor {labType:'python', code, output}","200 {success:true, message} (the route is public)","P1","AI-01",SP),
 ("TUT-002","Hints by error","V1","1. POST outputs with SyntaxError, NameError and an empty code","Syntax hint, 'not been defined' hint, 'editor is empty' hint","P1","AI-02",SP),
 ("TUT-003","Git lab hints","V1","1. POST labType 'git' with last command 'nothing to commit', 'not supported', and no history","Staged-changes hint, simulator hint, status/add/commit hint","P1","AI-02",SP),
 ("TUT-004","Empty body","V1","1. POST {}","200 with the default Test Mode message","P2","AI-03",SP),
 ("TUT-005","Unreadable body","V1","1. POST '{not json'","4xx, not 5xx","P2","AI-03",SP),
 ("TUT-006","Very large code field","V1","1. POST 200,000 lines of code","200, 400 or 413 (controlled)","P2","AI-03",SP),
 ("TUT-007","Sign-in required","V1","1. POST without a session","401/403 (known failure: it is public; once a real model is used any visitor spends the owner's tokens)","P1","AI-01",SP+" (known failure)"),
]),
("Certificate API", "FR4-FR6", [
 ("CRT-001","Visitor","V1","1. POST /api/generate-certificate","Refused (401/403/redirect)","P0","AI-04",SP),
 ("CRT-002","Missing data","L1","1. POST {}, name only, title only, blanks","400 'Missing data'","P1","AI-05",SP),
 ("CRT-003","Valid request","L1","1. POST studentName and courseTitle","200, content-type application/pdf, body starts with %PDF-","P0","AI-05",SP),
 ("CRT-004","Unusual names","L1","1. POST accented, 300-character, markup and Japanese names","No 5xx (known failure: a Japanese name gives 500, the standard font cannot draw it)","P1","AI-06",SP+" (known failure)"),
 ("CRT-005","Only for finishers","L1","1. POST a name and title for a course the caller has not finished","Refused (known failure: any signed-in user can generate a certificate for any name; the page itself builds PDFs in the browser and does not call this route)","P0","AI-07",SP+" (known failure)"),
]),
("Time and XP APIs", "FR7-FR9", [
 ("TRK-001","Visitor","V1","1. POST /api/track-time and /api/xp/sync","401 both","P0","AI-08",SP),
 ("TRK-002","Seconds validation","L1","1. POST 0, -1, 61, 1.5, '60', null, undefined, 1e9","400 'Invalid seconds'","P1","AI-09",SP),
 ("TRK-003","Valid ping","L1","1. POST seconds 60","200; newTotal = old total + 60; the stats row equals it","P1","AI-09",SP),
 ("TRK-004","Time cannot be inflated","L1","1. POST ten 60-second pings at once","Fewer than ten accepted (known failure: all ten, so engagement time can be pushed up by a script)","P1","AI-10",SP+" (known failure)"),
 ("XP-001","XP needs a session","V1","1. POST /api/xp/sync","401","P0","AI-08",SP),
 ("XP-002","XP is computed from progress","L1; 2 video rows and 1 assignment row","1. POST /api/xp/sync twice","points = 10 x videos + 50 x assignments; the second call changes nothing","P0","AI-11",SP),
 ("XP-003","Caller cannot set XP","L1","1. POST with points 999999 and another userId","Body ignored; points come from progress","P0","AI-11",SP),
]),
]
