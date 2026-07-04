import { describe, expect, it } from "vitest";
import { appendPhrase, DEFAULT_PHRASES, listPhrases } from "../lib/phrases";

describe("physician phrase library (U4)", () => {
  it("ships EMR-register defaults for HPI and procedure notes", () => {
    expect(DEFAULT_PHRASES.hpi.length).toBeGreaterThan(4);
    expect(DEFAULT_PHRASES.procedure.length).toBeGreaterThan(1);
    // EMR register — abbreviations, not prose
    expect(DEFAULT_PHRASES.hpi.join(" ")).toMatch(/c\/o/);
    expect(DEFAULT_PHRASES.hpi.join(" ")).toMatch(/MVC|LOC/);
    expect(DEFAULT_PHRASES.procedure.join(" ")).toMatch(/TPI/);
    // never long-form phrases the EMR standard bans
    expect(DEFAULT_PHRASES.hpi.join(" ")).not.toMatch(/no known allergies/i);
  });

  it("lists defaults when no custom phrases are stored (node env: no localStorage)", () => {
    expect(listPhrases("hpi")).toEqual(DEFAULT_PHRASES.hpi);
    expect(listPhrases("procedure")).toEqual(DEFAULT_PHRASES.procedure);
  });

  it("appendPhrase builds one statement per line and starts clean", () => {
    expect(appendPhrase("", "denies LOC")).toBe("denies LOC");
    expect(appendPhrase("c/o neck pain\n", "denies LOC")).toBe("c/o neck pain\ndenies LOC");
  });
});
