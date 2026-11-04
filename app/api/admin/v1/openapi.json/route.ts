import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle } from "@/lib/adminApi/envelope";
import { buildOpenApi } from "@/lib/adminApi/openapi";

// The spec itself (plain OpenAPI JSON, not the envelope). Admin session or an API key only.
export async function GET(req: NextRequest) {
  return handle(async () => {
    await authorize(req, "openapi:read");
    return NextResponse.json(buildOpenApi());
  });
}
