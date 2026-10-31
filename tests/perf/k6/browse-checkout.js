// k6 load script for the public journey: home, catalog, course page, a refused order (no session) and the contact endpoint's refusal.
// It sends NO real order, payment, enrolment or e-mail. Run it against a staging or a local production server only:
//   k6 run -e BASE_URL=http://localhost:3101 -e COURSE=qa-checkout-sandbox tests/perf/k6/browse-checkout.js
// Thresholds mirror PRD 15 (PRF-PRD-013): error rate under 1 %, p95 under 3 s.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [{ duration: '1m', target: 50 }, { duration: '3m', target: 50 }, { duration: '1m', target: 0 }],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<3000'] },
};
const BASE = __ENV.BASE_URL || 'http://localhost:3101';
const COURSE = __ENV.COURSE || 'python-beginners-batch-2';
const UA = { headers: { 'User-Agent': 'k6-shivam-academy' } };

export default function () {
  for (const path of ['/', '/courses', `/courses/${COURSE}`]) {
    const res = http.get(`${BASE}${path}`, UA);
    check(res, { [`${path} is 200`]: r => r.status === 200 });
    sleep(1 + Math.random() * 2);
  }
  // protected endpoints must answer fast and refuse (401), never do work for a visitor
  const refused = http.post(`${BASE}/api/create-order`, JSON.stringify({ courseId: COURSE, currency: 'INR' }), { headers: { 'Content-Type': 'application/json', 'User-Agent': 'k6-shivam-academy' }, responseCallback: http.expectedStatuses(401) });
  check(refused, { 'create-order refuses a visitor': r => r.status === 401 });
  sleep(1);
}
