import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { checkIns, patients, prescriptions, users } from "./schema";

/**
 * Seed SYNTHETIC test data only. Never real PHI — the dev cluster is not a
 * HIPAA-covered environment until a BAA + production controls are in place.
 * Run: pnpm db:seed  (DATABASE_URL must be set).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required to seed");
  const sql = postgres(url, { max: 1, ssl: "require" });
  const db = drizzle(sql);

  const [provider] = await db
    .insert(users)
    .values({ email: "dr.demo@example.test", role: "provider", fullName: "Dr. Demo Provider" })
    .returning();
  const [patientUser] = await db
    .insert(users)
    .values({ email: "patient.demo@example.test", role: "patient", fullName: "Demo Patient" })
    .returning();

  const [patient] = await db
    .insert(patients)
    .values({ userId: patientUser!.id, ownerProviderId: provider!.id, mrn: "DEMO-0001" })
    .returning();

  await db.insert(checkIns).values([
    { patientId: patient!.id, painScore: "3", freeText: "Feeling fine.", severity: "routine", flagReasons: [] },
    {
      patientId: patient!.id,
      painScore: "8",
      freeText: "Noticed a new lump near the injection site.",
      severity: "flagged",
      flagReasons: ["pain_ge_7", "new_mass"],
    },
  ]);

  await db.insert(prescriptions).values({
    patientId: patient!.id,
    providerId: provider!.id,
    status: "active",
    items: [{ slug: "bpc-157", kind: "individual", dose: "250 mcg SC daily", route: "SC" }],
    complianceConfirmed: {
      consentSigned: true,
      patientEducationDelivered: true,
      sourcePharmacyVerified: true,
      classGatingItemConfirmed: true,
    },
  });

  await sql.end();
  // eslint-disable-next-line no-console
  console.log("Seeded synthetic demo data (provider, patient, 2 check-ins, 1 prescription).");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
