import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./session";

/**
 * Server-side session accessor for App Router (server components, actions,
 * route handlers). Returns null when unauthenticated.
 */
export async function getServerSession(): Promise<Session | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Best-effort request context for audit records (IP + UA). */
export function getRequestContext(): { ip?: string; userAgent?: string } {
  const h = headers();
  const ip =
    h.get("x-nf-client-connection-ip") ?? // Netlify
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    undefined;
  return { ip, userAgent: h.get("user-agent") ?? undefined };
}

export * from "./session";
export * from "./rbac";
