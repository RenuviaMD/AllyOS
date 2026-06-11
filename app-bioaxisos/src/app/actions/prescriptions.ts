"use server";

import { getRequestContext, getServerSession } from "@/lib/auth";
import { requirePatientAccess, requireRole } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import { getPatientOwnership, insertPrescription } from "@/lib/db/repositories";
import { getFormularyCard } from "@/lib/formulary";
import { createPrescriptionSchema, type CreatePrescriptionInput } from "@/lib/schemas";

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * createPrescription (spec §10). Provider/admin only, row-level ownership
 * enforced, every formulary slug verified against the catalog, PHI write
 * audited. Returns a typed result rather than throwing to the client.
 */
export async function createPrescription(
  input: CreatePrescriptionInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getServerSession();

  try {
    requireRole(session, "provider", "admin");
    const parsed = createPrescriptionSchema.parse(input);

    // Every prescribed item must reference a real formulary card.
    for (const item of parsed.items) {
      const card = getFormularyCard(item.slug);
      if (!card || card.kind !== item.kind) {
        return { ok: false, error: `Unknown formulary item: ${item.slug}` };
      }
    }

    const owner = await getPatientOwnership(parsed.patientId);
    if (!owner) return { ok: false, error: "Patient not found" };
    const provider = requirePatientAccess(session, owner);

    const ctx = getRequestContext();
    const result = await withAudit(
      {
        action: "create",
        resourceType: "prescription",
        patientId: parsed.patientId,
        actorUserId: provider.userId,
        actorRole: provider.role,
        phi: true,
        ...ctx,
        metadata: { itemCount: parsed.items.length },
      },
      () =>
        insertPrescription({
          patientId: parsed.patientId,
          providerId: provider.userId,
          items: parsed.items,
          complianceConfirmed: parsed.complianceConfirmed,
          notes: parsed.notes,
        }),
    );

    return { ok: true, data: result };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ok: false, error: "Not authenticated" };
    if (status === 403) return { ok: false, error: "Not permitted" };
    return { ok: false, error: "Could not create prescription" };
  }
}
