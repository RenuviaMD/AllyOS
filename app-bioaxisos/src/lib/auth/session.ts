import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "@/lib/env";

/**
 * Session layer. Phase 0 ships a signed-cookie session (jose/HS256) behind a
 * small surface so the RBAC guards and the app are usable end-to-end for review.
 *
 * Phase 1 swaps the issuer for a full IdP/Auth.js flow WITHOUT changing the
 * Session shape or the guards that consume it.
 */

export type Role = "patient" | "provider" | "admin";

export interface Session {
  userId: string;
  role: Role;
  email: string;
}

export const SESSION_COOKIE = "bx_session";
const ISSUER = "bioaxisos";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h clinical shift

function key(): Uint8Array {
  return new TextEncoder().encode(requireEnv("AUTH_SECRET"));
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ role: session.role, email: session.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER });
    if (typeof payload.sub !== "string") return null;
    const role = payload.role;
    const email = payload.email;
    if (role !== "patient" && role !== "provider" && role !== "admin") return null;
    if (typeof email !== "string") return null;
    return { userId: payload.sub, role, email };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
