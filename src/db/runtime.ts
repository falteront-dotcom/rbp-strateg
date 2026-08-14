import Database from "better-sqlite3";
import path from "node:path";

/** Absolute path shared by API/runtime SQLite users. */
export const DB_PATH = path.resolve(process.cwd(), "sqlite.db");

/** Open a read-only SQLite connection for API reads. */
export function openReadonlyDatabase(): Database.Database {
  const db = new Database(DB_PATH, { readonly: true });
  db.pragma("foreign_keys = ON");
  return db;
}

/** Open a read/write SQLite connection with the application's standard pragmas. */
export function openDatabase(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
