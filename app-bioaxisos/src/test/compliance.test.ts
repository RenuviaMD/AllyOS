import { describe, expect, it } from "vitest";
import { isBaaSigned } from "@/lib/env";

describe("BAA compliance gate", () => {
  it("defaults to synthetic-only (false) when BAA_SIGNED is unset", () => {
    // The test env does not set BAA_SIGNED, so the app must be in synthetic mode.
    expect(isBaaSigned()).toBe(false);
  });
});
