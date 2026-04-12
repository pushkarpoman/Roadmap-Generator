import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { createRoadmap } from "@/lib/db";
import type { RoadmapContent } from "@/types/roadmap";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body as { title?: string; content?: unknown };

    if (!title || !content) {
      return NextResponse.json({ message: "title and content are required" }, { status: 400 });
    }

    const roadmap = await createRoadmap({
      userId: user.id,
      title,
      content: content as RoadmapContent,
    });
    return NextResponse.json(
      {
        id: roadmap.id,
        title: roadmap.title,
        content: roadmap.content,
        createdAt: roadmap.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save roadmap failed", error);
    return NextResponse.json({ message: "Failed to save roadmap" }, { status: 500 });
  }
}
