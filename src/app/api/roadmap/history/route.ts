import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { listRoadmapsByUserId } from "@/lib/db";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const roadmaps = (await listRoadmapsByUserId(user.id)).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
    }));

    return NextResponse.json(roadmaps);
  } catch (error) {
    console.error("Fetch roadmap history failed", error);
    return NextResponse.json({ message: "Failed to fetch history" }, { status: 500 });
  }
}
