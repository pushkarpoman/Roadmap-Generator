import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ensureSchema();
    const rows = await sql`
      SELECT id, title, content, created_at
      FROM roadmaps
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC;
    `;

    const roadmaps = rows.map((row) => ({
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
