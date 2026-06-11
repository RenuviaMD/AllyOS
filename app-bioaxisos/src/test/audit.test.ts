import { afterEach, describe, expect, it } from "vitest";
import { type AuditEntry, type AuditSink, recordAudit, setAuditSink, withAudit } from "@/lib/audit";

function memorySink() {
  const entries: AuditEntry[] = [];
  const sink: AuditSink = {
    async write(e) {
      entries.push(e);
    },
  };
  return { sink, entries };
}

let restore: AuditSink | undefined;
afterEach(() => {
  if (restore) setAuditSink(restore);
});

describe("recordAudit", () => {
  it("writes an entry to the active sink", async () => {
    const { sink, entries } = memorySink();
    restore = setAuditSink(sink);
    await recordAudit({ action: "read", resourceType: "patient", patientId: "p1", phi: true });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ action: "read", phi: true, patientId: "p1" });
  });
});

describe("withAudit", () => {
  it("runs the op and logs on success", async () => {
    const { sink, entries } = memorySink();
    restore = setAuditSink(sink);
    const result = await withAudit(
      { action: "update", resourceType: "patient", patientId: "p1", phi: true },
      async () => "done",
    );
    expect(result).toBe("done");
    expect(entries).toHaveLength(1);
  });

  it("does NOT log when the op throws", async () => {
    const { sink, entries } = memorySink();
    restore = setAuditSink(sink);
    await expect(
      withAudit({ action: "delete", resourceType: "patient", phi: true }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(entries).toHaveLength(0);
  });
});
