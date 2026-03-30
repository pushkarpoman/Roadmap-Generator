import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

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
    await ensureSchema();

    const rows = await sql`
      SELECT id, title, content, created_at
      FROM roadmaps
      WHERE id = ${Number(id)} AND user_id = ${user.id}
      LIMIT 1;
    `;

    if (!rows.length) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    const roadmap = rows[0];
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
