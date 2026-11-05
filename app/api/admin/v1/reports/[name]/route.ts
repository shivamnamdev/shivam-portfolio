import { NextRequest } from "next/server";
import { authorize } from "@/lib/adminApi/guard";
import { handle, notFound, ok } from "@/lib/adminApi/envelope";
import { isReport, reportDays } from "@/lib/adminApi/enrolments";
import { couponUsageReport, enrolmentsPerCohort, signupsPerDay } from "@/lib/adminApi/enrolmentStore";

type Ctx = { params: { name: string } };

// Counts only: no name, e-mail or id of a person is in any report.
export async function GET(req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    await authorize(req, "reports:read");
    if (!isReport(params.name)) throw notFound("report not found");
    const now = new Date();
    const out = params.name === "enrolments-per-cohort" ? await enrolmentsPerCohort()
      : params.name === "signups-per-day" ? await signupsPerDay(reportDays(new URL(req.url).searchParams.get("days")), now)
      : await couponUsageReport(now);
    return ok({ report: params.name, generatedAt: now.toISOString(), ...out });
  });
}
