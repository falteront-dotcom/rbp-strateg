import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { openDatabase } from "./runtime";

// Shared DB path + pragmas (journal_mode = WAL, foreign_keys = ON) live in
// ./runtime so every SQLite user resolves the same absolute path.
const sqlite = openDatabase();

export const db = drizzle(sqlite, { schema });
export { sqlite };