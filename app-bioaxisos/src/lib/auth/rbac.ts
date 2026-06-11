import type { Role, Session } from "./session";

/**
 * RBAC guards (spec §9): every server action checks session role AND, for PHI,
 * row-level patient ownership. These are pure functions so they are unit-tested
 * exhaustively and reused by server actions, route handlers, and middleware.
 */

export class AuthzError extends Error {
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AuthzError";
  }
}

export class AuthnError extends Error {
  readonly status = 401;
  constructor(message = "Not authenticated") {
    super(message);
    this.name = "AuthnError";
  }
}

/** Require an authenticated session. */
export function requireSession(session: Session | null): Session {
  if (!session) throw new AuthnError();
  return session;
}

/** Require the session to hold one of the allowed roles. */
export function requireRole(session: Session | null, ...roles: Role[]): Session {
  const s = requireSession(session);
  if (!roles.includes(s.role)) {
    throw new AuthzError(`Requires role: ${roles.join(" or ")}`);
  }
  return s;
}

/** Minimal shape needed to decide ownership of a PHI row. */
export interface OwnedPatient {
  userId: string; // the patient's own portal account
  ownerProviderId: string; // the provider who owns the chart
}

/**
 * Row-level ownership for a patient record:
 *  - admin            -> always allowed
 *  - provider         -> only if they own the chart
 *  - patient          -> only their own record
 */
export function canAccessPatient(session: Session, patient: OwnedPatient): boolean {
  switch (session.role) {
    case "admin":
      return true;
    case "provider":
      return patient.ownerProviderId === session.userId;
    case "patient":
      return patient.userId === session.userId;
    default:
      return false;
  }
}

/** Throwing variant for use at the top of server actions touching PHI. */
export function requirePatientAccess(session: Session | null, patient: OwnedPatient): Session {
  const s = requireSession(session);
  if (!canAccessPatient(s, patient)) {
    throw new AuthzError("Not permitted to access this patient record");
  }
  return s;
}
