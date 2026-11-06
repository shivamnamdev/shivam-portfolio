import { NextRequest } from "next/server";
import { handle } from "@/lib/adminApi/envelope";
import { discardDoc } from "@/lib/adminApi/curriculum";
import { curriculumWrite } from "@/lib/adminApi/curriculumStore";

export async function POST(req: NextRequest, { params }: { params: { cohort: string } }) {
  return handle(() => curriculumWrite(req, params.cohort, (doc) => discardDoc(doc), { action: "discard" }));
}
