import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

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

    await ensureSchema();
    const inserted = await sql`
      INSERT INTO roadmaps (user_id, title, content)
      VALUES (${user.id}, ${title.trim()}, ${JSON.stringify(content)}::jsonb)
      RETURNING id, title, content, created_at;
    `;

    const roadmap = inserted[0];
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
