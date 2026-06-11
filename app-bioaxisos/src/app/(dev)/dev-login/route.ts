import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, type Role } from "@/lib/auth";
import { env } from "@/lib/env";

/**
 * DEV-ONLY session issuer so the RBAC guards and (later) the workspace/portal
 * are exercisable end-to-end during review. Disabled outside development.
 *
 * Phase 1 replaces this with the real authentication flow. It is NOT a
 * production login and issues no PHI.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 404 });
  }
  const params = req.nextUrl.searchParams;
  const role = (params.get("role") ?? "provider") as Role;
  if (!["patient", "provider", "admin"].includes(role)) {
    return NextResponse.json({ error: "invalid role" }, { status: 400 });
  }
  const userId = params.get("userId") ?? "00000000-0000-0000-0000-000000000001";
  const email = params.get("email") ?? `${role}@dev.local`;

  const token = await signSession({ userId, role, email });
  const res = NextResponse.json({ ok: true, role, userId, email });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV !== "development",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
