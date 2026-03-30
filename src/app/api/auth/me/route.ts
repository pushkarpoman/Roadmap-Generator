import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { ensureSchema, sql } from "@/lib/db";

export async function GET() {
  try {
    const tokenUser = await getRequestUser();
    if (!tokenUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await ensureSchema();
    const rows = await sql`
      SELECT id, name, email
      FROM users
      WHERE id = ${tokenUser.id}
      LIMIT 1;
    `;

    if (!rows.length) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = rows[0];
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get current user failed", error);
    return NextResponse.json({ message: "Unable to validate user" }, { status: 500 });
  }
}
