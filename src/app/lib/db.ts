import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DEFAULT_STATE, type ScreenState } from "./screen-state";

const DB_PATH = path.join(process.cwd(), "data", "screen.db");

let _db: ReturnType<typeof Database> | null = null;

function getDb(): ReturnType<typeof Database> {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.exec(`
      CREATE TABLE IF NOT EXISTS screen_state (
        id   INTEGER PRIMARY KEY CHECK (id = 1),
        state      TEXT    NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    _db.prepare(
      `INSERT OR IGNORE INTO screen_state (id, state, updated_at) VALUES (1, ?, ?)`
    ).run(JSON.stringify(DEFAULT_STATE), Date.now());
  }
  return _db;
}

export function readStateFromDb(): ScreenState {
  const db = getDb();
  const row = db
    .prepare("SELECT state FROM screen_state WHERE id = 1")
    .get() as { state: string } | undefined;
  if (!row) return DEFAULT_STATE;
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(row.state) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function writeStateToDb(state: ScreenState): void {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO screen_state (id, state, updated_at) VALUES (1, ?, ?)`
  ).run(JSON.stringify(state), Date.now());
}
