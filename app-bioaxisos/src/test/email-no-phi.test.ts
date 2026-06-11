import { describe, expect, it } from "vitest";
import { renderPortalEmail } from "@/lib/email";
import { PLACEHOLDER, PORTAL_TEMPLATES } from "@/lib/email/templates";

/**
 * Spec §12: email is transport, never content. These tests assert PHI cannot
 * enter an email body — structurally (the API has no body field) and by content
 * (templates carry only a portal link).
 */

describe("portal templates", () => {
  it("every template contains exactly the portal link placeholder and no other", () => {
    for (const [id, t] of Object.entries(PORTAL_TEMPLATES)) {
      const occurrences = t.body.split(PLACEHOLDER).length - 1;
      expect(occurrences, `${id} should reference the portal link once`).toBe(1);
      // No template literal slots for names/results/doses, etc.
      expect(/\{\{(?!portalUrl\}\})/.test(t.body), `${id} has an unexpected placeholder`).toBe(
        false,
      );
    }
  });
});

describe("renderPortalEmail", () => {
  it("renders only subject + link, substituting APP_URL + path", () => {
    const out = renderPortalEmail({
      to: "patient@example.com",
      templateId: "results_ready",
      portalPath: "/portal/results",
    });
    expect(out.text).toContain("/portal/results");
    expect(out.text).not.toContain(PLACEHOLDER);
    expect(out.subject).toBe(PORTAL_TEMPLATES.results_ready.subject);
  });

  it("rejects a portalPath carrying a query string (no PHI in URLs)", () => {
    expect(() =>
      renderPortalEmail({
        to: "p@example.com",
        templateId: "results_ready",
        portalPath: "/portal/results?name=Jane&dx=cancer",
      }),
    ).toThrow();
  });

  it("rejects a non-relative portalPath", () => {
    expect(() =>
      renderPortalEmail({
        to: "p@example.com",
        templateId: "new_message",
        portalPath: "https://evil.example/phish",
      }),
    ).toThrow();
  });
});
