import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { createReminder, listRemindersByUserId, deleteReminder } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser();
    const reminders = await listRemindersByUserId(user?.id);
    return NextResponse.json({ reminders }, { status: 200 });
  } catch (error) {
    console.error("List reminders failed", error);
    return NextResponse.json({ message: "Failed to list reminders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { kind, schedule, payload } = body;
    if (!kind || !schedule) return NextResponse.json({ message: "kind and schedule are required" }, { status: 400 });
    const reminder = await createReminder({ userId: user.id, kind, schedule, payload, enabled: true });
    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error("Create reminder failed", error);
    return NextResponse.json({ message: "Failed to create reminder" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ message: "id is required" }, { status: 400 });
    await deleteReminder(Number(id), user.id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete reminder failed", error);
    return NextResponse.json({ message: "Failed to delete reminder" }, { status: 500 });
  }
}
