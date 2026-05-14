import { NextRequest, NextResponse } from "next/server";
import { emitJoinEvent, canSendText, registerText } from "@/app/lib/join-emitter";

const MAX_TEXT_LENGTH = 100;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body as Record<string, unknown>)?.text;
  if (typeof text !== "string") {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }

  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (!trimmed) {
    return NextResponse.json({ error: "Empty text" }, { status: 400 });
  }

  if (!canSendText()) {
    return NextResponse.json(
      { error: "Too many messages on screen. Please wait a moment." },
      { status: 429 }
    );
  }

  registerText();
  const direction: "ltr" | "rtl" = Math.random() > 0.5 ? "ltr" : "rtl";
  emitJoinEvent({
    type: "text",
    id: crypto.randomUUID(),
    payload: trimmed,
    direction,
  });

  return NextResponse.json({ ok: true });
}
