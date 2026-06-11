import { describe, expect, it } from "vitest";
import {
  AuthnError,
  AuthzError,
  canAccessPatient,
  requirePatientAccess,
  requireRole,
} from "@/lib/auth/rbac";
import type { Session } from "@/lib/auth/session";

const provider: Session = { userId: "prov-1", role: "provider", email: "p@dev" };
const otherProvider: Session = { userId: "prov-2", role: "provider", email: "q@dev" };
const patient: Session = { userId: "user-1", role: "patient", email: "a@dev" };
const admin: Session = { userId: "adm-1", role: "admin", email: "x@dev" };

const chart = { userId: "user-1", ownerProviderId: "prov-1" };

describe("requireRole", () => {
  it("allows a matching role", () => {
    expect(requireRole(provider, "provider", "admin")).toBe(provider);
  });
  it("rejects a non-matching role", () => {
    expect(() => requireRole(patient, "provider", "admin")).toThrow(AuthzError);
  });
  it("rejects an absent session", () => {
    expect(() => requireRole(null, "provider")).toThrow(AuthnError);
  });
});

describe("canAccessPatient (row-level ownership)", () => {
  it("admin can access any chart", () => {
    expect(canAccessPatient(admin, chart)).toBe(true);
  });
  it("owning provider can access", () => {
    expect(canAccessPatient(provider, chart)).toBe(true);
  });
  it("non-owning provider cannot access", () => {
    expect(canAccessPatient(otherProvider, chart)).toBe(false);
  });
  it("patient can access only their own chart", () => {
    expect(canAccessPatient(patient, chart)).toBe(true);
    expect(canAccessPatient({ ...patient, userId: "user-9" }, chart)).toBe(false);
  });
});

describe("requirePatientAccess", () => {
  it("throws AuthzError when ownership fails", () => {
    expect(() => requirePatientAccess(otherProvider, chart)).toThrow(AuthzError);
  });
  it("returns the session when allowed", () => {
    expect(requirePatientAccess(provider, chart)).toBe(provider);
  });
});
