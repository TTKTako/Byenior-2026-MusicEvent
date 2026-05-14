import { readStateFromDb, writeStateToDb } from "@/app/lib/db";
import { emitState } from "@/app/lib/sse-emitter";
import { DEFAULT_STATE, type ScreenState } from "@/app/lib/screen-state";

export async function GET() {
  const state = readStateFromDb();
  return Response.json(state);
}

export async function POST(request: Request) {
  let body: Partial<ScreenState>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = readStateFromDb();
  const next: ScreenState = { ...DEFAULT_STATE, ...current, ...body };
  writeStateToDb(next);
  emitState(next);

  return Response.json(next);
}
