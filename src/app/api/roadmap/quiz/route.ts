import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { generateQuiz } from "@/lib/roadmap-intelligence";
import type { QuizRequest } from "@/types/roadmap";

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<QuizRequest>;
    if (!body.stage) {
      return NextResponse.json({ message: "stage is required" }, { status: 400 });
    }

    const questions = generateQuiz(body.stage, body.count || 5);
    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Quiz generation failed", error);
    return NextResponse.json({ message: "Failed to generate quiz" }, { status: 500 });
  }
}
