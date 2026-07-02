import { describe, expect, it } from "vitest";
import { buildAttorneyPackageHtml, buildLedger, extractBody, groupPatients, sortDocs } from "../lib/attorney";
import type { BillingSettings } from "../lib/billing";

const settings: BillingSettings = { ein: "", billingNpi: "", renderingNpi: "", fees: { "99204": "300", "97110": "55" } };

function meta(id: string, mode: string, dos: string, first: string, last: string, dob = "1980-01-01", accident = "2026-06-01") {
  return { id, mode, dos, form: { patient: { firstName: first, lastName: last, dob }, accident: { accidentDate: accident } } as never };
}

describe("groupPatients", () => {
  it("groups by name + DOB + accident date and tracks the treatment period", () => {
    const groups = groupPatients([
      meta("r1", "initial", "2026-06-02", "Ana", "Lopez"),
      meta("r2", "ptdaily", "2026-06-05", "Ana", "Lopez"),
      meta("r3", "initial", "2026-06-02", "Ana", "Lopez", "1980-01-01", "2026-05-01"), // different accident → separate case
      meta("r4", "initial", "2026-06-03", "Ben", "Diaz"),
    ]);
    expect(groups).toHaveLength(3);
    const ana = groups.find((g) => g.name === "Ana Lopez" && g.accidentDate === "2026-06-01")!;
    expect(ana.reportIds).toEqual(["r1", "r2"]);
    expect(ana.firstDos).toBe("2026-06-02");
    expect(ana.lastDos).toBe("2026-06-05");
  });

  it("skips rows with no patient name", () => {
    expect(groupPatients([{ id: "x", mode: "initial", dos: "2026-06-01", form: null }])).toEqual([]);
  });
});

describe("sortDocs", () => {
  it("orders initial → follow-ups → final → PT dailies → PT weeklies, by date within type", () => {
    const order = sortDocs([
      { mode: "ptdaily", dos: "2026-06-03" },
      { mode: "final", dos: "2026-07-01" },
      { mode: "followup", dos: "2026-06-20" },
      { mode: "followup", dos: "2026-06-10" },
      { mode: "initial", dos: "2026-06-02" },
      { mode: "ptprogress", dos: "2026-06-07" },
    ]).map((d) => `${d.mode}:${d.dos}`);
    expect(order).toEqual([
      "initial:2026-06-02",
      "followup:2026-06-10",
      "followup:2026-06-20",
      "final:2026-07-01",
      "ptdaily:2026-06-03",
      "ptprogress:2026-06-07",
    ]);
  });
});

describe("extractBody", () => {
  it("pulls body content and preserves the document's styles", () => {
    const html = '<!doctype html><html><head><style>.x{color:red}</style></head><body><h1>NOTE</h1></body></html>';
    const out = extractBody(html);
    expect(out).toContain("<h1>NOTE</h1>");
    expect(out).toContain(".x{color:red}");
    expect(out).not.toContain("<head>");
  });
});

describe("buildLedger", () => {
  it("prices coded services from the fee schedule and totals only priced lines", () => {
    const { rows, total } = buildLedger(
      [
        { id: "r1", mode: "initial", dos: "2026-06-02", html: "", cpt: ["99204"] },
        { id: "r2", mode: "ptdaily", dos: "2026-06-05", html: "", cpt: ["97110", "97140"] },
      ],
      settings,
    );
    expect(rows).toHaveLength(3);
    expect(total).toBe("355.00");
    expect(rows.find((r) => r.cpt === "97140")?.charge).toBe("");
  });
});

describe("buildAttorneyPackageHtml", () => {
  it("contains cover letter, TOC tabs, all documents, ledger, and custodian certification", () => {
    const html = buildAttorneyPackageHtml({
      patient: { name: "Ana Lopez", dob: "1980-01-01", accidentDate: "2026-06-01" },
      attorney: { name: "John Smith, Esq.", firm: "Smith Law", address: "1 Main St, Miami FL" },
      docs: [
        { id: "r1abcdef", mode: "initial", dos: "2026-06-02", html: "<html><body><h1>INITIAL</h1></body></html>", cpt: ["99204"] },
        { id: "r2abcdef", mode: "ptdaily", dos: "2026-06-05", html: "<html><body><h1>PTNOTE</h1></body></html>", cpt: ["97110"] },
      ],
      settings,
      generatedBy: "drfalcon@renuviamd.com",
    });
    expect(html).toContain("RE:</strong> Ana Lopez");
    expect(html).toContain("Smith Law");
    expect(html).toContain("TABLE OF CONTENTS");
    expect(html).toContain("TAB 1");
    expect(html).toContain("<h1>INITIAL</h1>");
    expect(html).toContain("<h1>PTNOTE</h1>");
    expect(html).toContain("ITEMIZED BILLING LEDGER");
    expect(html).toContain("$355.00");
    expect(html).toContain("CERTIFICATION OF RECORDS CUSTODIAN");
    expect(html).toContain("authorization on file");
  });
});
