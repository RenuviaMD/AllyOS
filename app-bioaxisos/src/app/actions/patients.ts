"use server";

import { getRequestContext, getServerSession } from "@/lib/auth";
import { requireRole } from "@/lib/auth/rbac";
import { withAudit } from "@/lib/audit";
import { insertPatientWithUser } from "@/lib/db/repositories";
import { createPatientSchema, type CreatePatientInput } from "@/lib/schemas";
import type { ActionResult } from "./prescriptions";

/**
 * createPatient (spec §10): provider/admin creates a portal account + a chart
 * they own. Audited PHI write. MRN auto-generated when not supplied.
 */
export async function createPatient(
  input: CreatePatientInput,
): Promise<ActionResult<{ patientId: string; userId: string }>> {
  const session = await getServerSession();
  try {
    const provider = requireRole(session, "provider", "admin");
    const parsed = createPatientSchema.parse(input);
    const mrn = parsed.mrn ?? `P-${Date.now().toString(36).toUpperCase()}`;

    const ctx = getRequestContext();
    const result = await withAudit(
      {
        action: "create",
        resourceType: "patient",
        actorUserId: provider.userId,
        actorRole: provider.role,
        phi: true,
        ...ctx,
        metadata: { mrn },
      },
      () =>
        insertPatientWithUser({
          email: parsed.email,
          fullName: parsed.fullName,
          mrn,
          ownerProviderId: provider.userId,
        }),
    );
    return { ok: true, data: result };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return { ok: false, error: "Not authenticated" };
    if (status === 403) return { ok: false, error: "Not permitted" };
    const message = (err as { message?: string }).message ?? "";
    if (message.includes("unique") || message.includes("duplicate")) {
      return { ok: false, error: "That email or MRN already exists" };
    }
    return { ok: false, error: "Could not create patient" };
  }
}
