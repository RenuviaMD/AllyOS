"use server";

import { getRequestContext, getServerSession } from "@/lib/auth";
import { requirePatientAccess } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import { evaluateCheckIn } from "@/lib/checkin/flagger";
import {
  getPatientByUserId,
  getPatientOwnership,
  insertCheckIn,
} from "@/lib/db/repositories";
import { submitCheckInSchema, type SubmitCheckInInput } from "@/lib/schemas";
import type { ActionResult } from "./prescriptions";

type CheckInResult = { id: string; flagged: boolean; reasons: string[] };

/**
 * Portal check-in: the signed-in patient submits about themselves. The patient
 * id is resolved from the session — never trusted from the client.
 */
export async function submitPortalCheckIn(input: {
  painScore?: number;
  freeText?: string;
}): Promise<ActionResult<CheckInResult>> {
  const session = await getServerSession();
  if (!session || session.role !== "patient") {
    return { ok: false, error: "Not permitted" };
  }
  const patient = await getPatientByUserId(session.userId);
  if (!patient) return { ok: false, error: "No patient record for this account" };
  return submitCheckIn({
    patientId: patient.id,
    painScore: input.painScore,
    freeText: input.freeText,
  });
}

/**
 * submitCheckIn (spec §10 + §5.4). Runs the flagger; a flagged check-in is
 * persisted as "flagged" so it surfaces in the MD inbox. PHI write audited.
 */
export async function submitCheckIn(
  input: SubmitCheckInInput,
): Promise<ActionResult<{ id: string; flagged: boolean; reasons: string[] }>> {
  const session = await getServerSession();

  try {
    const parsed = submitCheckInSchema.parse(input);

    const owner = await getPatientOwnership(parsed.patientId);
    if (!owner) return { ok: false, error: "Patient not found" };
    const actor = requirePatientAccess(session, owner);

    const flag = evaluateCheckIn({ painScore: parsed.painScore, freeText: parsed.freeText });

    const ctx = getRequestContext();
    const result = await withAudit(
      {
        action: "create",
        resourceType: "check_in",
        patientId: parsed.patientId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        phi: true,
        ...ctx,
        metadata: { flagged: flag.flagged, reasons: flag.reasons },
      },
      () =>
        insertCheckIn({
          patientId: parsed.patientId,
          painScore: parsed.painScore,
          freeText: parsed.freeText,
          severity: flag.flagged ? "flagged" : "routine",
          flagReasons: flag.reasons,
        }),
    );

    return { ok: true, data: { id: result.id, flagged: flag.flagged, reasons: flag.reasons } };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ok: false, error: "Not authenticated" };
    if (status === 403) return { ok: false, error: "Not permitted" };
    return { ok: false, error: "Could not submit check-in" };
  }
}
