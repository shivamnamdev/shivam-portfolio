import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound } from "@/lib/adminApi/envelope";
import { limitWrites } from "@/lib/adminApi/request";
import { enrolmentCsv, isExportFile, learnerCsv, summariseLearners } from "@/lib/adminApi/enrolments";
import { allEnrolments } from "@/lib/adminApi/enrolmentStore";
import { writeAudit } from "@/lib/adminApi/audit";

type Ctx = { params: Promise<{ file: string }> };

// A CSV of personal data, so: owner or admin key only, counted against the write limit, and every export is written to the audit log.
export async function GET(req: NextRequest, props: Ctx) {
  const params = await props.params;
  return handle(async () => {
    const actor = await authorize(req, "exports:run");
    if (!isExportFile(params.file)) throw notFound("export not found");
    await limitWrites(actor);
    const { rows, truncated } = await allEnrolments();
    const body = params.file === "enrolments.csv" ? enrolmentCsv(rows) : learnerCsv(summariseLearners(rows));
    await writeAudit({ actor, action: "export", resource: "export", resourceId: params.file, after: { rows: params.file === "enrolments.csv" ? rows.length : summariseLearners(rows).length, truncated } });
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${params.file}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(truncated ? { "X-Export-Truncated": "true" } : {}),
      },
    });
  });
}
