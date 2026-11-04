import { NextRequest } from "next/server";
import { handle } from "@/lib/adminApi/envelope";
import { publishDoc } from "@/lib/adminApi/curriculum";
import { curriculumWrite } from "@/lib/adminApi/curriculumStore";

export async function POST(req: NextRequest, { params }: { params: { cohort: string } }) {
  return handle(() => curriculumWrite(req, params.cohort, (doc) => publishDoc(doc), { action: "publish", status: "published" }));
}
