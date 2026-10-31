# Test-case content for PRD 15 (Performance). Consumed by build_workbook.py.
PERSONAS = [
 ("V1", "Visitor (no session)", "NA"),
 ("L1", "Learner on the dashboard (mavish) and on the learning page (bazar)", "mavish.ps8@gmail.com / financetrail.bazar@gmail.com"),
 ("A1", "Admin (portal and user directory)", "shivamnamdev.corp@gmail.com"),
 ("ENV", "Environment: the dev server (next dev compiles on demand). Scale all time budgets with PERF_SCALE (about 0.4 against a production build); PERF_PRODUCTION=1 also enforces the script-size limit", "PERF_SCALE, PERF_PRODUCTION"),
]
LEGEND = "Every case measures first (the numbers are written to the report as 'perf' annotations) and then checks a budget. Pages are visited once to warm them up and measured on the second visit. Numbers on the dev server are inflated; use a production build for sign-off. Concurrency cases use up to 50 parallel requests, not a full load test."
SP = "tests/perf/perf-budgets.spec.ts"
SHEETS = [
("Page Load", "FR1-FR3", [
 ("PGE-001","Home page","V1","1. Open / twice; read navigation timing and LCP","TTFB < 1.5 s, load < 6 s, LCP < 4 s, fewer than 120 requests","P1","PF-01",SP),
 ("PGE-002","Catalog","V1","1. Same on /courses","Same budgets","P1","PF-01",SP),
 ("PGE-003","Contact","V1","1. Same on /contact","Same budgets","P2","PF-01",SP),
 ("PGE-004","Course page","V1; QA fixture","1. Same on the course page","load < 7 s, LCP < 4.5 s, JavaScript < 6 MB","P0","PF-01",SP),
 ("PGE-005","Dashboard","L1","1. Sign in, open /learning","First course card visible in < 6 s","P0","PF-02",SP),
 ("PGE-006","Learning page","L1","1. Open a course with the video and GitHub calls answered locally","Lesson list visible in < 15 s","P0","PF-02",SP),
 ("PGE-007","Admin portal","A1","1. Open /admin","First table row visible in < 12 s","P1","PF-02",SP),
]),
("Interaction Latency", "FR4", [
 ("UIX-001","Currency toggle","L1; QA fixture","1. Click International; measure click to second painted frame","< 250 ms","P1","PF-03",SP),
 ("UIX-002","Admin tab switch","A1","1. Click Enrollments; measure click to paint","< 400 ms","P2","PF-03",SP),
]),
("API Latency", "FR5", [
 ("API-001","AI tutor","V1","1. POST 8 times","All 200; p95 < 3 s (the mock waits 1.2 s)","P2","PF-04",SP),
 ("API-002","User directory","A1","1. GET 5 times; read size","p95 < 5 s; under 600 bytes per user","P1","PF-04",SP),
 ("API-003","XP sync","L1","1. POST 8 times","p95 < 3 s","P1","PF-04",SP),
 ("API-004","Certificate","L1","1. POST 5 times","p95 < 3 s; file < 100 KB","P2","PF-04",SP),
 ("API-005","Create order","L1; Razorpay test keys","1. POST 5 times","p95 < 5 s","P0","PF-04",SP),
]),
("Concurrency and Size", "FR6-FR7", [
 ("LOD-001","Many visitors","V1","1. 30 simultaneous GET /courses","No 5xx; p95 < 8 s","P1","PF-05",SP),
 ("LOD-002","Parallel XP sync","L1","1. 20 simultaneous POST /api/xp/sync","All 200; same points returned afterwards; p95 < 10 s","P1","PF-05",SP),
 ("LOD-003","Burst of refusals","V1","1. 50 simultaneous invalid send-email requests","All 400; p95 < 5 s","P2","PF-05",SP),
 ("PAY-001","Payload size","V1","1. Open /; read the HTML and script sizes","HTML < 300 KB; on a production build no script > 3 MB","P2","PF-06",SP),
 ("LOD-004","Admin directory with many users","A1; 1000+ users","1. Open /admin","Portal usable; directory request < 10 s","P1","PF-07","No (needs a QA Clerk instance with 1000+ users)"),
 ("LOD-005","Sustained load","Staging environment","1. 100 virtual users for 10 minutes on browse and checkout","Error rate < 1 %, p95 < 3 s","P1","PF-07","No (script ready in tests/perf/k6/browse-checkout.js; needs k6 and a staging environment)"),
]),
("Production Build", "FR8-FR12", [
 ("PRD-001","Static assets are cached for a year","Production build","1. Request a /_next/static JavaScript file","Cache-Control public, max-age=31536000, immutable","P1","PF-08","tests/perf/perf-production.spec.ts"),
 ("PRD-002","Compression","Production build","1. Request / with Accept-Encoding gzip, br","content-encoding gzip or br","P1","PF-08","tests/perf/perf-production.spec.ts"),
 ("PRD-003","Public pages can be cached","Production build","1. Read Cache-Control of /, /courses, /privacy, /terms, /refund, /about","Not private or no-store (known failure: every page is dynamic, SCP-80)","P1","PF-09","tests/perf/perf-production.spec.ts (known failure)"),
 ("PRD-004","API answers with personal data are not cached","A1; production build","1. Read Cache-Control of /api/get-all-users","no-store (known failure: header missing, SCP-81)","P2","PF-09","tests/perf/perf-production.spec.ts (known failure)"),
 ("PRD-005","First-load JavaScript per page","Production build","1. Sum the transferred JavaScript on /, /courses and the course page","Under 600 KB, 600 KB and 800 KB","P1","PF-10","tests/perf/perf-production.spec.ts"),
 ("PRD-006","Image size","Production build","1. Find the largest image on / and the course page","Under 300 KB","P2","PF-10","tests/perf/perf-production.spec.ts"),
 ("PRD-007","Time to first byte","Production build","1. Read TTFB of /, /courses, /privacy on a warm page","Under 600 ms","P1","PF-10","tests/perf/perf-production.spec.ts"),
 ("PRD-008","Layout stability","Production build","1. Read cumulative layout shift on /, /courses and the course page","Under 0.1","P1","PF-10","tests/perf/perf-production.spec.ts"),
 ("PRD-009","No failing requests on public pages","Production build","1. Open five public pages and list failed or 4xx/5xx requests (Clerk, YouTube, Razorpay left out; the Clerk dev-instance 401 on the first document is ignored)","None","P1","PF-10","tests/perf/perf-production.spec.ts"),
 ("PRD-010","Slow phone: largest content","Production build; CPU 4x slower; slow 4G","1. Open / and the course page on a 390 px phone","LCP under 4 s","P0","PF-11","tests/perf/perf-production.spec.ts"),
 ("PRD-011","Slow phone: learning page","Production build; same throttling; L1","1. Open the learning page","Lesson list within 20 s (SCP-33, SCP-34)","P1","PF-11","tests/perf/perf-production.spec.ts"),
 ("PRD-012","Pages are prerendered","Production build","1. Read x-nextjs-prerender / x-nextjs-cache on /","Present (known failure: every page is dynamic, SCP-80)","P1","PF-09","tests/perf/perf-production.spec.ts (known failure)"),
 ("PRD-013","k6 browse-and-checkout load","Staging or local production server; k6 installed","1. k6 run -e BASE_URL=... tests/perf/k6/browse-checkout.js (50 users, 5 minutes)","Error rate under 1 %, p95 under 3 s; no real order, payment or e-mail is sent","P1","PF-07","No (k6 is not installed here; script is ready in tests/perf/k6)"),
 ("AUT-001","Sign-in time","L1; production build","1. Ticket sign-in from a blank page to the account button","Under 8 s","P1","PF-12","tests/perf/perf-production.spec.ts"),
 ("AUT-002","Dashboard after sign-in","L1; production build","1. Open /learning and wait for the first course card","Under 4 s (SCP-77)","P1","PF-12","tests/perf/perf-production.spec.ts"),
]),
]
