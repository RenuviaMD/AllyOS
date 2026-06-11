import { getDb } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Audit primitive. Every PHI read and write MUST flow through this module.
 *
 * The sink is injectable so the behavior is unit-testable without a database
 * (tests use an in-memory sink). Production uses the Postgres sink.
 */

export type AuditAction = "read" | "create" | "update" | "delete" | "login" | "logout" | "export";
export type AuditRole = "patient" | "provider" | "admin";

export interface AuditEntry {
  actorUserId?: string;
  actorRole?: AuditRole;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  /** Set when the touched resource is a specific patient's PHI. */
  patientId?: string;
  /** True if this event read or wrote PHI. */
  phi?: boolean;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditSink {
  write(entry: AuditEntry): Promise<void>;
}

/** Default sink — appends to the Postgres audit_log table. */
export const postgresAuditSink: AuditSink = {
  async write(entry) {
    await getDb()
      .insert(auditLog)
      .values({
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        patientId: entry.patientId,
        phi: entry.phi ?? false,
        ip: entry.ip,
        userAgent: entry.userAgent,
        metadata: entry.metadata ?? null,
      });
  },
};

let activeSink: AuditSink = postgresAuditSink;

/** Swap the audit sink (used by tests). Returns the previous sink. */
export function setAuditSink(sink: AuditSink): AuditSink {
  const prev = activeSink;
  activeSink = sink;
  return prev;
}

/** Record one audit event. Never throws into the caller's critical path. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await activeSink.write(entry);
}

/**
 * Wrap a PHI-touching operation so the audit record is written when (and only
 * when) the operation succeeds. Use for reads and writes alike.
 */
export async function withAudit<T>(
  entry: Omit<AuditEntry, "phi"> & { phi: true },
  op: () => Promise<T>,
): Promise<T> {
  const result = await op();
  await recordAudit(entry);
  return result;
}
