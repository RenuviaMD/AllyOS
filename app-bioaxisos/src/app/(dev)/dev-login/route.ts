import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, type Role } from "@/lib/auth";
import { env, isBaaSigned } from "@/lib/env";

/**
 * Synthetic-mode session issuer so the RBAC guards and the workspace/portal are
 * exercisable end-to-end in the test environment. Available ONLY while the app
 * is in synthetic mode (BAA not signed); it auto-locks the moment BAA_SIGNED is
 * "true". It is NOT a real login and issues no PHI. Real auth is a Phase-1 seam.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (isBaaSigned()) {
    return NextResponse.json({ error: "disabled once BAA is signed" }, { status: 404 });
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
