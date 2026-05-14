import { NextRequest, NextResponse } from "next/server";

async function deriveToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(request: NextRequest) {
  const password = process.env.REMOTE_PASSWORD;

  // Fail closed: if the env var is missing, block access entirely
  if (!password) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("remote_token")?.value;
  const expected = await deriveToken(password);

  if (token !== expected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/remote/:path*"],
};
