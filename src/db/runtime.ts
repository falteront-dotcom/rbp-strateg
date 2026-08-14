import Database from "better-sqlite3";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

/** Absolute path shared by API/runtime SQLite users. */
export const DB_PATH = path.resolve(process.cwd(), "sqlite.db");

/** Request header that carries the admin bearer token. */
export const ADMIN_TOKEN_HEADER = "x-admin-token";

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

/** Length-checked constant-time string comparison to avoid timing leaks. */
function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * True only when the request carries a token equal to the server-side
 * `RBP_ADMIN_TOKEN`. A missing/empty configured token means NO request is
 * authorized, so admin DB mutations are impossible until a token is configured.
 * The token is read solely from the server environment and is never exposed via
 * `NEXT_PUBLIC_*`.
 */
export function isAuthorizedAdminRequest(request: Request): boolean {
  const configured = process.env.RBP_ADMIN_TOKEN;
  if (typeof configured !== "string" || configured.length === 0) return false;
  const supplied = request.headers.get(ADMIN_TOKEN_HEADER);
  if (typeof supplied !== "string" || supplied.length === 0) return false;
  return constantTimeEqual(supplied, configured);
}
