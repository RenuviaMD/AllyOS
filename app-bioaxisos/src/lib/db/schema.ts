import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Phase 0 schema. Three tables establish the security foundation:
 *  - users     : identity + role (RBAC subject)
 *  - patients  : PHI-bearing rows with an owning provider (row-level ownership, spec §9)
 *  - audit_log : append-only record of every PHI read/write (spec: audit everything)
 *
 * Authorization is enforced in the application layer (server actions check
 * session role + row ownership) per spec §9; Postgres row-level-security can be
 * layered on in a later phase as defense-in-depth.
 */

export const userRole = pgEnum("user_role", ["patient", "provider", "admin"]);

export const auditAction = pgEnum("audit_action", [
  "read",
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "export",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: userRole("role").notNull().default("patient"),
  fullName: text("full_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The portal account this patient logs in with.
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // The provider who owns this chart — basis for row-level ownership checks.
    ownerProviderId: uuid("owner_provider_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    mrn: text("mrn").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("patients_owner_idx").on(t.ownerProviderId),
    userIdx: index("patients_user_idx").on(t.userId),
  }),
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id"),
    actorRole: userRole("actor_role"),
    action: auditAction("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    // Set when the touched resource is a specific patient's PHI.
    patientId: uuid("patient_id"),
    phi: boolean("phi").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actorIdx: index("audit_actor_idx").on(t.actorUserId),
    patientIdx: index("audit_patient_idx").on(t.patientId),
    createdIdx: index("audit_created_idx").on(t.createdAt),
  }),
);

/**
 * Prescriptions — a provider commits a protocol (one or more formulary items)
 * to a patient. Items are stored as JSONB referencing formulary slugs + the
 * dose chosen in the designer; the formulary itself stays file-backed.
 */
export const prescriptionStatus = pgEnum("prescription_status", [
  "draft",
  "active",
  "completed",
  "discontinued",
]);

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: prescriptionStatus("status").notNull().default("draft"),
    // [{ slug, kind, dose, route, ... }] — validated by Zod at the action layer.
    items: jsonb("items").notNull(),
    // Snapshot of the compliance-gate checklist confirmed at prescribe time.
    complianceConfirmed: jsonb("compliance_confirmed").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientIdx: index("rx_patient_idx").on(t.patientId),
    providerIdx: index("rx_provider_idx").on(t.providerId),
  }),
);

/** Patient check-ins. Submissions run through the flagger (spec §5.4). */
export const checkInSeverity = pgEnum("check_in_severity", ["routine", "flagged"]);

export const checkIns = pgTable(
  "check_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    painScore: text("pain_score"), // 0-10, stored as text to preserve "not reported"
    freeText: text("free_text"),
    severity: checkInSeverity("severity").notNull().default("routine"),
    flagReasons: jsonb("flag_reasons"), // string[] of triggered rule ids
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    patientIdx: index("checkin_patient_idx").on(t.patientId),
    severityIdx: index("checkin_severity_idx").on(t.severity),
  }),
);

export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type CheckIn = typeof checkIns.$inferSelect;
