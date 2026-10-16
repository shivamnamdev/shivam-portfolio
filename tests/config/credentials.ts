// tests/config/credentials.ts
// Test-account credentials come from the environment (local .env / GitHub Secrets) — never commit them.
export const CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL ?? "",
  password: process.env.TEST_USER_PASSWORD ?? "",
};
