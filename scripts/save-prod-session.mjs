// Saves a signed-in browser session of the production site to .tmp/prod-session.json (git-ignored) for the phone checks in tests/prod (SCP-119).
// Run: PROD_URL=https://www.shivamnamdev.com node scripts/save-prod-session.mjs
// A browser window opens; sign in yourself (Google included). When your dashboard shows, the session is saved and the window closes.
// The file holds your login cookies: keep it private, never commit it, delete it when done.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const base = (process.env.PROD_URL ?? "").replace(/\/$/, "");
if (!base.startsWith("https://")) { console.error("Set PROD_URL to the https address of the live site."); process.exit(1); }
fs.mkdirSync(".tmp", { recursive: true });

// Google refuses sign-in in a browser it sees as automated, so prefer the real Chrome with the automation flag off.
let browser;
try { browser = await chromium.launch({ headless: false, channel: "chrome", args: ["--disable-blink-features=AutomationControlled"], ignoreDefaultArgs: ["--enable-automation"] }); }
catch { console.log("Google Chrome not found, using the bundled Chromium (Google may refuse the sign-in)."); browser = await chromium.launch({ headless: false }); }
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`${base}/learning`);
console.log("Sign in in the window that opened. Waiting up to 5 minutes for your dashboard...");
// The site redirects shivamnamdev.com to www.shivamnamdev.com: accept either host.
const bare = (h) => h.replace(/^www\./, "");
await page.waitForURL((u) => bare(u.hostname) === bare(new URL(base).hostname) && u.pathname.startsWith("/learning"), { timeout: 300000 });
await page.getByText(/Total XP|Active Access|My Courses/i).first().waitFor({ timeout: 60000 }).catch(() => {});
await context.storageState({ path: ".tmp/prod-session.json" });
await browser.close();
console.log("Saved .tmp/prod-session.json");
