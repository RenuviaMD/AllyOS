import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import {
  auditLog,
  checkIns,
  patients,
  prescriptions,
  rxRefills,
  type AuditLogRow,
  type CheckIn,
  type Patient,
  type Prescription,
  type RxRefill,
} from "./schema";
import type { OwnedPatient } from "@/lib/auth/rbac";

/**
 * Data-access seam. Server actions call these instead of touching Drizzle
 * directly, so authorization/audit logic stays separate from persistence and
 * the queries live in one place. Requires a live DATABASE_URL at runtime.
 */

export async function getPatientOwnership(patientId: string): Promise<OwnedPatient | null> {
  const rows = await getDb()
    .select({ userId: patients.userId, ownerProviderId: patients.ownerProviderId })
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  return rows[0] ?? null;
}

export interface InsertPrescription {
  patientId: string;
  providerId: string;
  items: unknown;
  complianceConfirmed: unknown;
  notes?: string;
}

export async function insertPrescription(input: InsertPrescription): Promise<{ id: string }> {
  const rows = await getDb()
    .insert(prescriptions)
    .values({
      patientId: input.patientId,
      providerId: input.providerId,
      status: "active",
      items: input.items,
      complianceConfirmed: input.complianceConfirmed,
      notes: input.notes,
    })
    .returning({ id: prescriptions.id });
  return rows[0]!;
}

export interface InsertCheckIn {
  patientId: string;
  painScore?: number;
  freeText?: string;
  severity: "routine" | "flagged";
  flagReasons: string[];
}

export async function insertCheckIn(input: InsertCheckIn): Promise<{ id: string }> {
  const rows = await getDb()
    .insert(checkIns)
    .values({
      patientId: input.patientId,
      painScore: input.painScore?.toString(),
      freeText: input.freeText,
      severity: input.severity,
      flagReasons: input.flagReasons,
    })
    .returning({ id: checkIns.id });
  return rows[0]!;
}

/** Flagged check-ins for the MD inbox, newest first. */
export async function listFlaggedCheckIns(limit = 50): Promise<CheckIn[]> {
  return getDb()
    .select()
    .from(checkIns)
    .where(eq(checkIns.severity, "flagged"))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);
}

/** Patient roster scoped to a provider (admins should call listAllPatients). */
export async function listPatientsForProvider(providerId: string): Promise<Patient[]> {
  return getDb()
    .select()
    .from(patients)
    .where(eq(patients.ownerProviderId, providerId))
    .orderBy(desc(patients.createdAt));
}

/** Resolve the patient record for a portal account. */
export async function getPatientByUserId(userId: string): Promise<Patient | null> {
  const rows = await getDb().select().from(patients).where(eq(patients.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Resolve a patient record by its id (chart detail). */
export async function getPatientById(patientId: string): Promise<Patient | null> {
  const rows = await getDb().select().from(patients).where(eq(patients.id, patientId)).limit(1);
  return rows[0] ?? null;
}

/** Active protocols for one patient (portal read-back). */
export async function listActivePrescriptions(patientId: string): Promise<Prescription[]> {
  return getDb()
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.patientId, patientId), eq(prescriptions.status, "active")))
    .orderBy(desc(prescriptions.createdAt));
}

/** Recent check-ins for one patient (chart timeline). */
export async function listCheckInsForPatient(patientId: string, limit = 30): Promise<CheckIn[]> {
  return getDb()
    .select()
    .from(checkIns)
    .where(eq(checkIns.patientId, patientId))
    .orderBy(desc(checkIns.createdAt))
    .limit(limit);
}

/** Recent audit events (admin viewer). Reads metadata only — never PHI content. */
export async function listRecentAuditEvents(limit = 100): Promise<AuditLogRow[]> {
  return getDb().select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit);
}

/** Ownership context for a prescription (its patient's account + owning provider). */
export async function getPrescriptionOwnership(
  prescriptionId: string,
): Promise<(OwnedPatient & { patientId: string }) | null> {
  const rows = await getDb()
    .select({
      patientId: prescriptions.patientId,
      userId: patients.userId,
      ownerProviderId: patients.ownerProviderId,
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.id))
    .where(eq(prescriptions.id, prescriptionId))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertRefill(input: {
  prescriptionId: string;
  patientId: string;
}): Promise<{ id: string }> {
  const rows = await getDb()
    .insert(rxRefills)
    .values({ prescriptionId: input.prescriptionId, patientId: input.patientId })
    .returning({ id: rxRefills.id });
  return rows[0]!;
}

/** Refill queue for a provider's own patients, newest first. */
export async function listRefillsForProvider(providerId: string): Promise<RxRefill[]> {
  const rows = await getDb()
    .select({ refill: rxRefills })
    .from(rxRefills)
    .innerJoin(patients, eq(rxRefills.patientId, patients.id))
    .where(eq(patients.ownerProviderId, providerId))
    .orderBy(desc(rxRefills.requestedAt));
  return rows.map((r) => r.refill);
}

/** Ownership context for a refill (for the approve/deny guard). */
export async function getRefillOwnership(
  refillId: string,
): Promise<(OwnedPatient & { status: string }) | null> {
  const rows = await getDb()
    .select({
      userId: patients.userId,
      ownerProviderId: patients.ownerProviderId,
      status: rxRefills.status,
    })
    .from(rxRefills)
    .innerJoin(patients, eq(rxRefills.patientId, patients.id))
    .where(eq(rxRefills.id, refillId))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateRefillDecision(
  refillId: string,
  status: "approved" | "denied",
  decidedBy: string,
): Promise<void> {
  await getDb()
    .update(rxRefills)
    .set({ status, decidedBy, decidedAt: new Date() })
    .where(eq(rxRefills.id, refillId));
}
