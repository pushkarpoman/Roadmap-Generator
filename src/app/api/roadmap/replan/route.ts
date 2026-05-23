import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { applyWeeklyReplan, computeReadiness, updateStreak } from "@/lib/roadmap-intelligence";
import type { RoadmapContent } from "@/types/roadmap";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { roadmap?: RoadmapContent };
    if (!body.roadmap) {
      return NextResponse.json({ message: "roadmap is required" }, { status: 400 });
    }

    const streak = updateStreak(body.roadmap.intelligence?.streak);
    const replanned = applyWeeklyReplan({
      ...body.roadmap,
      intelligence: {
        ...body.roadmap.intelligence,
        streak,
      },
    });

    const readiness = computeReadiness(replanned);

    return NextResponse.json({
      roadmap: {
        ...replanned,
        intelligence: {
          ...replanned.intelligence,
          readiness,
        },
      },
    });
  } catch (error) {
    console.error("Weekly replan failed", error);
    return NextResponse.json({ message: "Failed to replan roadmap" }, { status: 500 });
  }
}
