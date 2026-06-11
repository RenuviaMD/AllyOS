import "dotenv/config";
import type { Config } from "drizzle-kit";

/**
 * DigitalOcean Managed Postgres. DO requires TLS; the connection string
 * should include `?sslmode=require`. Migrations live in ./drizzle.
 */
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/bioaxisos",
  },
  strict: true,
  verbose: true,
} satisfies Config;
