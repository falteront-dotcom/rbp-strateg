import { db, sqlite } from "@/db/index";
import { countries } from "@/db/schema";
import { top20Countries } from "./top20-countries";
import { extendedCountries } from "./extended-countries";
import { additionalCountries } from "./additional-countries";
import { sql } from "drizzle-orm";

export async function seedCountries(): Promise<number> {
  const allData = [...top20Countries, ...extendedCountries, ...additionalCountries];

  // Drop existing data and re-insert in a transaction
  sqlite.exec("BEGIN");
  try {
    db.delete(countries).run();
    db.insert(countries).values(allData).run();
    sqlite.exec("COMMIT");
  } catch (err) {
    sqlite.exec("ROLLBACK");
    throw err;
  }

  const count = db
    .select({ count: sql<number>`count(*)` })
    .from(countries)
    .get();

  const total = count?.count ?? 0;
  console.log(`✅ Seeded ${total} countries into database`);
  return total;
}

// Direct execution when run as script
if (typeof require !== "undefined" && require.main === module) {
  seedCountries()
    .then((n) => {
      console.log(`Done. ${n} countries in DB.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
