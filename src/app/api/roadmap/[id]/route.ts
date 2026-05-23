import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { findRoadmapByIdForUser, updateRoadmapByIdForUser } from "@/lib/db";
import type { RoadmapContent } from "@/types/roadmap";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const roadmap = await findRoadmapByIdForUser({
      id: Number(id),
      userId: user.id,
    });

    if (!roadmap) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: roadmap.id,
      title: roadmap.title,
      content: roadmap.content,
      createdAt: roadmap.created_at,
    });
  } catch (error) {
    console.error("Fetch roadmap by id failed", error);
    return NextResponse.json({ message: "Failed to fetch roadmap" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const roadmapId = Number(id);
    if (!Number.isFinite(roadmapId) || roadmapId <= 0) {
      return NextResponse.json({ message: "Invalid roadmap id" }, { status: 400 });
    }

    const body = await request.json();
    const { title, content } = body as { title?: string; content?: unknown };

    if (!title || !content) {
      return NextResponse.json({ message: "title and content are required" }, { status: 400 });
    }

    const updated = await updateRoadmapByIdForUser({
      id: roadmapId,
      userId: user.id,
      title,
      content: content as RoadmapContent,
    });

    if (!updated) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      content: updated.content,
      createdAt: updated.created_at,
    });
  } catch (error) {
    console.error("Update roadmap failed", error);
    return NextResponse.json({ message: "Failed to update roadmap" }, { status: 500 });
  }
}
