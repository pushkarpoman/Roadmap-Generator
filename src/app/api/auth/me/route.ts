import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export async function GET() {
  try {
    const tokenUser = await getRequestUser();
    if (!tokenUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await findUserById(tokenUser.id);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get current user failed", error);
    return NextResponse.json({ message: "Unable to validate user" }, { status: 500 });
  }
}
