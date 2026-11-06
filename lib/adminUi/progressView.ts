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
export const learnerLine = (p: { name: string; email: string | null; userId: string }): string => `${p.name || "Unknown student"} (${p.email ?? p.userId})`;
export const submittedText = (iso: string | null): string => (iso ? iso.slice(0, 16).replace("T", " ") + " UTC" : "—");
