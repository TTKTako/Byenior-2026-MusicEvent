import { NextResponse } from "next/server";

async function deriveToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const expected = process.env.REMOTE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  if (!body.password || body.password !== expected) {
    // Uniform delay to resist timing-based probing
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await deriveToken(expected);
  const response = NextResponse.json({ ok: true });

  response.cookies.set("remote_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
