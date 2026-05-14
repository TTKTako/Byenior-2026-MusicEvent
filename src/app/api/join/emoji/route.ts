import { NextRequest, NextResponse } from "next/server";
import { emitJoinEvent } from "@/app/lib/join-emitter";

const ALLOWED_EMOJIS = new Set(["😢", "❤️", "💔", "👍", "🔥", "😂"]);

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emoji = (body as Record<string, unknown>)?.emoji;
  if (typeof emoji !== "string" || !ALLOWED_EMOJIS.has(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  emitJoinEvent({ type: "emoji", id: crypto.randomUUID(), payload: emoji });
  return NextResponse.json({ ok: true });
}
