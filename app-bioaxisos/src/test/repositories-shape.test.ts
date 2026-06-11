import { describe, expect, it } from "vitest";
import * as repos from "@/lib/db/repositories";

/**
 * Guards the data-access surface the server actions and pages depend on. These
 * are exported function references (no DB connection needed) — if a repository
 * is renamed or dropped, a consumer breaks and this fails first.
 */
describe("repository surface", () => {
  const expected = [
    "getPatientOwnership",
    "getPatientByUserId",
    "insertPrescription",
    "insertCheckIn",
    "listFlaggedCheckIns",
    "listPatientsForProvider",
    "listActivePrescriptions",
    "listCheckInsForPatient",
    "listRecentAuditEvents",
  ] as const;

  it("exposes every repository function used by actions/pages", () => {
    for (const name of expected) {
      expect(typeof (repos as Record<string, unknown>)[name]).toBe("function");
    }
  });
});
