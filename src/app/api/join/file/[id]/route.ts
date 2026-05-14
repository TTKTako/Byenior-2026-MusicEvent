import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, extname } from "path";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

// Only allow safe filenames: UUID + extension, no path traversal
const SAFE_FILENAME = /^[0-9a-f\-]+\.[a-z]+$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SAFE_FILENAME.test(id)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  try {
    const data = await readFile(join(UPLOAD_DIR, id));
    const ext = extname(id).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
