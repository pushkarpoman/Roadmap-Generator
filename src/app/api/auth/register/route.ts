import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { setAuthCookie, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body as { name?: string; email?: string; password?: string };

    if (!name || !email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }

    await ensureSchema();

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1;`;
    if (existing.length) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const inserted = await sql`
      INSERT INTO users (name, email, password_hash)
      VALUES (${name.trim()}, ${email.toLowerCase()}, ${hashedPassword})
      RETURNING id, name, email;
    `;

    const user = inserted[0];
    const token = signToken({ id: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register failed", error);
    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}
