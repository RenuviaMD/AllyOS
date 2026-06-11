"use server";

import { getRequestContext, getServerSession } from "@/lib/auth";
import { requirePatientAccess, requireRole } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import {
  getPrescriptionOwnership,
  getRefillOwnership,
  insertRefill,
  updateRefillDecision,
} from "@/lib/db/repositories";
import type { ActionResult } from "./prescriptions";

/** Patient requests a refill on one of their active prescriptions (spec §10). */
export async function requestRefill(prescriptionId: string): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession();
  try {
    const owner = await getPrescriptionOwnership(prescriptionId);
    if (!owner) return { ok: false, error: "Prescription not found" };
    const actor = requirePatientAccess(session, owner);

    const ctx = getRequestContext();
    const result = await withAudit(
      {
        action: "create",
        resourceType: "rx_refill",
        patientId: owner.patientId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        phi: true,
        ...ctx,
      },
      () => insertRefill({ prescriptionId, patientId: owner.patientId }),
    );
    return { ok: true, data: result };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ok: false, error: "Not authenticated" };
    if (status === 403) return { ok: false, error: "Not permitted" };
    return { ok: false, error: "Could not request refill" };
  }
}

/** Provider/admin approves or denies a refill (spec §10 approveRefill). */
export async function decideRefill(
  refillId: string,
  decision: "approved" | "denied",
): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession();
  try {
    requireRole(session, "provider", "admin");
    const owner = await getRefillOwnership(refillId);
    if (!owner) return { ok: false, error: "Refill not found" };
    const actor = requirePatientAccess(session, owner);

    const ctx = getRequestContext();
    await withAudit(
      {
        action: "update",
        resourceType: "rx_refill",
        resourceId: refillId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        phi: true,
        ...ctx,
        metadata: { decision },
      },
      () => updateRefillDecision(refillId, decision, actor.userId),
    );
    return { ok: true, data: { id: refillId } };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ok: false, error: "Not authenticated" };
    if (status === 403) return { ok: false, error: "Not permitted" };
    return { ok: false, error: "Could not update refill" };
  }
}
