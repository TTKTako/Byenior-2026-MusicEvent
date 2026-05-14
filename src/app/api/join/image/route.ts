import { NextRequest, NextResponse } from "next/server";
import { emitJoinEvent, canSendImage, registerImage } from "@/app/lib/join-emitter";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);
const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  // ── URL submission ──────────────────────────────────────────────
  if (contentType.includes("application/json")) {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const url = (body as Record<string, unknown>)?.url;
    if (typeof url !== "string") {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Bad protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!canSendImage()) {
      return NextResponse.json(
        { error: "Too many images on screen. Please wait a moment." },
        { status: 429 }
      );
    }
    registerImage();
    emitJoinEvent({ type: "image", id: crypto.randomUUID(), payload: url });
    return NextResponse.json({ ok: true });
  }

  // ── File upload ─────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPEG, PNG, GIF, WebP, or AVIF." },
      { status: 400 }
    );
  }

  const ext = extname(file.name) || ".bin";
  const id = `${crypto.randomUUID()}${ext}`;
  const filePath = join(UPLOAD_DIR, id);

  await mkdir(UPLOAD_DIR, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  if (!canSendImage()) {
    return NextResponse.json(
      { error: "Too many images on screen. Please wait a moment." },
      { status: 429 }
    );
  }
  registerImage();

  emitJoinEvent({
    type: "image",
    id: crypto.randomUUID(),
    payload: `/api/join/file/${id}`,
  });

  return NextResponse.json({ ok: true });
}
