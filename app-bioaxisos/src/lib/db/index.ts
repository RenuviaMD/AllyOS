import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, requireEnv } from "@/lib/env";
import * as schema from "./schema";

/**
 * Lazy singleton Postgres client for DigitalOcean Managed Postgres.
 * Created on first access so that `next build` (which never queries) does not
 * require DATABASE_URL. DO mandates TLS; we enable it and verify against the
 * DO CA cert when provided.
 */
let _sql: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function client() {
  if (!_sql) {
    const url = requireEnv("DATABASE_URL");
    _sql = postgres(url, {
      max: 5, // serverless-friendly; rely on DO PgBouncer for real pooling
      ssl: env.DATABASE_CA_CERT
        ? { ca: env.DATABASE_CA_CERT, rejectUnauthorized: true }
        : "require",
      prepare: false, // required when going through PgBouncer in transaction mode
    });
  }
  return _sql;
}

export function getDb() {
  if (!_db) {
    _db = drizzle(client(), { schema });
  }
  return _db;
}

export { schema };
