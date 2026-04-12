import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db";
import { setAuthCookie, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 400 });
    }

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
