# Test-case content for PRD 12 (Email API). Consumed by build_workbook.py.
PERSONAS = [
 ("V1", "Any caller: /api/send-email is a public route (the contact form is open to visitors)", "NA"),
 ("OWN", "Recipient of every real contact message: the owner's Gmail account (GMAIL_USER)", "owner inbox"),
]
LEGEND = "A valid request sends a REAL e-mail through the owner's Gmail account. Automated cases only use requests that cannot send (honeypot, invalid address, wrong method, unreadable body). The single real send is opt-in (E2E_SEND_REAL_EMAIL=1, subject prefix [QA-AUTOMATION]). Local note: GMAIL_USER and GMAIL_APP_PASSWORD are empty in .env.local, so a real send answers 500 'Server Configuration Error' locally (ticket SCP-35 describes the same symptom on the contact page)."
SP = "tests/api/email-api.spec.ts"
SHEETS = [
("Send Email API", "FR1-FR6", [
 ("ACC-001","Visitor can call it","V1","1. POST /api/send-email with the honeypot field filled","200 {success:true, message:'Email sent successfully!'}; nothing sent","P0","EA-01",SP),
 ("HNY-001","Honeypot","V1","1. POST with website = 'https://spam.example'","200 and no e-mail (bots are told it worked)","P1","EA-02",SP),
 ("VAL-001","Missing or blank address","V1","1. POST email undefined, '', '   '","400 'Please provide a valid email address.'","P0","EA-03",SP),
 ("VAL-002","Malformed address","V1","1. POST 'not-an-email', 'a@b', '@example.com', 'a b@example.com', a number, null","400 same message","P0","EA-03",SP),
 ("VAL-003","Header injection through the address","V1","1. POST an address containing CR/LF and a Bcc: or Subject: line","400; nothing sent","P0","EA-04",SP),
 ("VAL-004","Very long address","V1","1. POST a 300-character local part","400, not 500","P2","EA-03",SP),
 ("VAL-005","Unreadable body","V1","1. POST '{not json'","4xx, not 5xx","P2","EA-05",SP),
 ("VAL-006","GET","V1","1. GET /api/send-email","405","P2","EA-05",SP),
 ("ABU-001","Rate limit","V1","1. POST 30 refused requests quickly","Some answer 429 (known failure: no rate limit exists, so a script can send unlimited mail through the owner's Gmail)","P1","EA-06",SP+" (known failure)"),
 ("REAL-001","One real contact message","V1; Gmail configured","1. Run with E2E_SEND_REAL_EMAIL=1","200 {success:true}; the owner receives exactly ONE e-mail with subject '[QA-AUTOMATION] contact form'","P1","EA-07",SP+" (opt-in)"),
 ("CNT-001","Message content is escaped","V1; Gmail configured","1. Send name '<b>x</b>' and message '<script>alert(1)</script>' 2. Open the e-mail","Shown as text, nothing executes","P1","EA-08","No (needs mailbox access; owner checks manually)"),
 ("CNT-002","Subject line","V1; Gmail configured","1. Send a subject with a line break and one of 300 characters 2. Open the e-mail","Line breaks removed; cut to 200 characters; empty subject becomes 'New Website Inquiry'","P2","EA-08","No (needs mailbox access; owner checks manually)"),
 ("CNT-003","Reply-To and sender","V1; Gmail configured","1. Send a message 2. Reply to it","The reply goes to the visitor's address; sender is Shivam Academy","P2","EA-08","No (needs mailbox access; owner checks manually)"),
]),
]
