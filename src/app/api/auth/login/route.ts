import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { setAuthCookie, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    await ensureSchema();
    const rows = await sql`
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1;
    `;

    if (!rows.length) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
    }

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
    }

    const token = signToken({ id: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
