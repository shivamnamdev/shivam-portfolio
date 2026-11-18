// lib/adminUi/progressView.ts
// Pure helpers behind the Student progress, Code submissions and Engagement screens: how counts, percentages, sizes and times are written.
// The numbers themselves are the server's (lib/adminApi/progress.ts); these only format them. A unit test pins every wording.
import { timeAgo } from "./client";

export type ProgressItem = {
  userId: string; name: string; email: string | null; cohortSlug: string; videosDone: number; totalVideos: number | null; assignmentsDone: number;
  totalAssignments: number | null; percent: number | null; lastActivityAt: string | null;
};
export type SubmissionItem = { id: string; userId: string; name: string; email: string | null; cohortSlug: string; lessonId: string; lessonTitle: string; completedAt: string | null; codeLength: number };
export type EngagementItem = { userId: string; name: string; email: string | null; totalTimeSeconds: number; currentStreak: number; lastActiveDate: string | null };

// "2 / 3", and "2 / —" when the course's lessons are not known.
export const countText = (done: number, total: number | null): string => `${done} / ${total === null ? "—" : total}`;
export const percentText = (p: number | null): string => (p === null ? "—" : `${p}%`);
// The bar never shows more than 100 or less than 0, and nothing for an unknown percent.
export const barPercent = (p: number | null): number => (p === null ? 0 : Math.max(0, Math.min(100, p)));
export const lastActivityText = (iso: string | null, now: Date): string => (iso ? timeAgo(iso, now) : "No activity yet");

// "12h 45m", "5m", "0m" (hours and minutes only, as the classic page showed it).
export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
export const streakText = (days: number): string => `${days} ${days === 1 ? "day" : "days"}`;

export function codeSizeText(chars: number): string {
  if (chars <= 0) return "empty";
  if (chars < 1000) return `${chars} character${chars === 1 ? "" : "s"}`;
  return `${(chars / 1000).toFixed(1)}k characters`;
}
export type DirectoryItem = { id: string; name: string; email: string | null; joinedAt: string | null; enrolments: number; status: "enrolled" | "lead" };
// "Enrolled in 2 cohorts", "Enrolled in 1 cohort", "Lead (not enrolled yet)".
export const statusText = (d: Pick<DirectoryItem, "status" | "enrolments">): string => (d.status === "lead" ? "Lead (not enrolled yet)" : `Enrolled in ${d.enrolments} cohort${d.enrolments === 1 ? "" : "s"}`);
export const joinedText = (iso: string | null): string => (iso ? iso.slice(0, 10) : "—");
export const learnerLine = (p: { name: string; email: string | null; userId: string }): string => `${p.name || "Unknown student"} (${p.email ?? p.userId})`;
export const submittedText = (iso: string | null): string => (iso ? iso.slice(0, 16).replace("T", " ") + " UTC" : "—");

// ---- exam attempts (SCP-115 part C) ----
export type ExamAttemptItem = {
  id: string; userId: string; name: string; email: string | null; cohortSlug: string; attemptNo: number; score: number; passed: boolean;
  createdAt: string; codeLength: number; mailLearner: string; mailOwner: string;
};
export type ExamAttemptNote = { q: number; label: string; passed: boolean; note: string };
// "Passed" or "Not passed" for one attempt (this attempt's score against the passing score).
export const attemptResultText = (a: Pick<ExamAttemptItem, "passed">): string => (a.passed ? "Passed" : "Not passed");
// How the e-mail status reads: "Sent", "Failed", "Skipped" or "Pending".
export const mailStatusText = (s: string): string => ({ sent: "Sent", failed: "Failed", skipped: "Skipped", pending: "Pending" } as Record<string, string>)[s] ?? "Pending";
// The mail column: both e-mails in one short line.
export const mailText = (a: Pick<ExamAttemptItem, "mailLearner" | "mailOwner">): string => `Learner: ${mailStatusText(a.mailLearner)} · You: ${mailStatusText(a.mailOwner)}`;
