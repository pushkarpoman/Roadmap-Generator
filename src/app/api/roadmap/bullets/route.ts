import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { generateAtsBullets } from "@/lib/roadmap-intelligence";
import type { BulletRequest } from "@/types/roadmap";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<BulletRequest>;
    if (!body.roadmap || !Array.isArray(body.completedStageIds)) {
      return NextResponse.json({ message: "roadmap and completedStageIds are required" }, { status: 400 });
    }

    const bullets = generateAtsBullets(body.roadmap, body.completedStageIds);
    return NextResponse.json({ bullets });
  } catch (error) {
    console.error("Bullet generation failed", error);
    return NextResponse.json({ message: "Failed to generate bullets" }, { status: 500 });
  }
}
