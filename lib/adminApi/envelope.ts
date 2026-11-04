// lib/adminApi/envelope.ts
// One answer shape for every admin route: { success: true, data } or { success: false, error: { code, message, fields? } }.
// Messages are short and fixed; no stack traces, file paths or database text ever reach the client.
import { NextResponse } from "next/server";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: FieldErrors) {
    super(message);
  }
}

export const badRequest = (message: string, fields?: FieldErrors) => new ApiError(400, "validation_failed", message, fields);
export const notFound = (what = "Not found") => new ApiError(404, "not_found", what);
export const conflict = (message: string) => new ApiError(409, "conflict", message);
export const unprocessable = (message: string) => new ApiError(422, "rule_violation", message);

export const ok = <T>(data: T, status = 200, headers?: Record<string, string>) =>
  NextResponse.json({ success: true, data }, { status, headers });

export const failResponse = (status: number, code: string, message: string, fields?: FieldErrors, headers?: Record<string, string>) =>
  NextResponse.json({ success: false, error: { code, message, ...(fields ? { fields } : {}) } }, { status, headers });

// Wraps a route body: turns ApiError into its answer and anything else into a plain 500 (details only in the server log).
export async function handle(run: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiError) return failResponse(err.status, err.code, err.message, err.fields);
    console.error("admin api error:", err);
    return failResponse(500, "internal_error", "Something went wrong");
  }
}
