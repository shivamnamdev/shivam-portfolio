import { NextRequest } from "next/server";
import { handle } from "@/lib/adminApi/envelope";
import { discardDoc } from "@/lib/adminApi/curriculum";
import { curriculumWrite } from "@/lib/adminApi/curriculumStore";

export async function POST(req: NextRequest, props: { params: Promise<{ cohort: string }> }) {
  const params = await props.params;
  return handle(() => curriculumWrite(req, params.cohort, (doc) => discardDoc(doc), { action: "discard" }));
}
