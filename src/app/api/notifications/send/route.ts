import { NextResponse } from "next/server";
import { findUserById } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { toEmail, subject, text, userId } = body as { toEmail?: string; subject: string; text: string; userId?: number };

    const from = process.env.FROM_EMAIL || process.env.SMTP_FROM || "no-reply@roadmap.local";

    let recipient = toEmail;
    if (!recipient && userId) {
      const user = await findUserById(userId);
      recipient = user?.email;
    }

    if (!recipient) {
      return NextResponse.json({ message: "No recipient" }, { status: 400 });
    }

    // if SMTP not configured, just log
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log("[notify] SMTP not configured, skipping send", { to: recipient, subject, text });
      return NextResponse.json({ sent: false, reason: "smtp not configured" }, { status: 200 });
    }

    // Lazy-load nodemailer to avoid importing heavy libs at module init
    const nodemailer = await import('nodemailer');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Boolean(process.env.SMTP_SECURE === "true"),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({ from, to: recipient, subject, text });
    return NextResponse.json({ sent: true }, { status: 200 });
  } catch (error) {
    console.error("Send notification failed", error);
    return NextResponse.json({ message: "Failed to send" }, { status: 500 });
  }
}
