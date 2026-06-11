import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, type Role } from "@/lib/auth/session";

/**
 * Edge gate for authenticated areas. Coarse-grained only — it confirms a valid
 * session exists and routes by role. Fine-grained authorization (row-level
 * patient ownership) is enforced in server actions via the RBAC guards (spec §9).
 */
const PROTECTED: Array<{ prefix: string; roles: readonly Role[] }> = [
  { prefix: "/workspace", roles: ["provider", "admin"] },
  { prefix: "/portal", roles: ["patient", "provider", "admin"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = PROTECTED.find((p) => pathname.startsWith(p.prefix));
  if (!match) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (!match.roles.includes(session.role)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*", "/portal/:path*"],
};
