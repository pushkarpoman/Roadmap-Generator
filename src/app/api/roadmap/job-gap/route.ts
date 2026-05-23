import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { analyzeJobGap } from "@/lib/roadmap-intelligence";
import type { JobGapRequest } from "@/types/roadmap";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<JobGapRequest>;
    if (!body.roadmap || !body.postingText?.trim()) {
      return NextResponse.json({ message: "roadmap and postingText are required" }, { status: 400 });
    }

    const result = analyzeJobGap(body.roadmap, body.postingText);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job gap analysis failed", error);
    return NextResponse.json({ message: "Failed to analyze job gap" }, { status: 500 });
  }
}
