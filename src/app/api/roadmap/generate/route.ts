import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import type { RoadmapContent } from "@/types/roadmap";

function buildPrompt(role: string) {
  return `Generate a comprehensive career roadmap for a ${role}.

Return ONLY valid JSON in this exact format:
{
  "title": "${role} Roadmap",
  "stages": [
    {
      "id": 1,
      "name": "Stage Name",
      "duration": "Timeframe",
      "description": "Detailed description",
      "skills": ["skill1", "skill2", "skill3"],
      "resources": ["resource1", "resource2"]
    }
  ]
}

Include 6-8 progressive stages from beginner to advanced. Keep each stage practical and actionable.`;
}

function normalizeRoadmap(raw: unknown, role: string): RoadmapContent {
  const data = raw as Partial<RoadmapContent>;
  const title = typeof data.title === "string" && data.title.trim() ? data.title : `${role} Roadmap`;
  const stages = Array.isArray(data.stages)
    ? data.stages.map((stage, index) => {
        const item = stage as Record<string, unknown>;
        return {
          id: Number(item.id) || index + 1,
          name: typeof item.name === "string" ? item.name : `Stage ${index + 1}`,
          duration: typeof item.duration === "string" ? item.duration : "Flexible",
          description: typeof item.description === "string" ? item.description : "",
          skills: Array.isArray(item.skills) ? item.skills.map(String) : [],
          resources: Array.isArray(item.resources) ? item.resources.map(String) : [],
        };
      })
    : [];

  return { title, stages };
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const role = typeof body?.role === "string" ? body.role.trim() : "";
    if (!role) {
      return NextResponse.json({ message: "role is required" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ message: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const geminiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(role) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      cache: "no-store",
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API failure", errText);
      return NextResponse.json({ message: "Failed to generate roadmap" }, { status: 502 });
    }

    const data = (await geminiResponse.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return NextResponse.json({ message: "Invalid response format from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const roadmap = normalizeRoadmap(parsed, role);

    if (!roadmap.stages.length) {
      return NextResponse.json({ message: "Generated roadmap has no stages" }, { status: 500 });
    }

    return NextResponse.json(roadmap);
  } catch (error) {
    console.error("Generate roadmap failed", error);
    return NextResponse.json({ message: "Failed to generate roadmap" }, { status: 500 });
  }
}
