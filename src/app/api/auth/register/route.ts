import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/db";
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

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await createUser({
      name,
      email,
      passwordHash: hashedPassword,
    });
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
