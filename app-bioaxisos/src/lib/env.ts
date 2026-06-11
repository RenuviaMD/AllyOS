import { z } from "zod";

/**
 * Single typed source of truth for environment configuration.
 * Validated with Zod so no untyped config leaks into the app (spec §7).
 * Build can skip validation (SKIP_ENV_VALIDATION=1) so CI can compile
 * without production secrets; runtime accessors still throw if a value
 * they need is missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_CA_CERT: z.string().optional(),
  EMAIL_FROM: z.string().default("BioaxisOS <no-reply@bioaxis.renuviamd.com>"),
  EMAIL_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return envSchema.partial().parse(process.env) as Env;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = load();

/** Assert a required-at-runtime value is present; throws a clear error otherwise. */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<Env[K]>;
}

/** True when a database connection is configured. DB-backed views check this. */
export function isDbConfigured(): boolean {
  return typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0;
}
