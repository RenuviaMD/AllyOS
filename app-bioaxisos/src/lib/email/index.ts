import { env } from "@/lib/env";
import { PLACEHOLDER, PORTAL_TEMPLATES, type PortalTemplateId } from "./templates";

/**
 * No-PHI email transport (spec §12).
 *
 * The public API accepts ONLY a recipient, a template id, and a portal path —
 * never a free-text body. Content lives behind portal auth; the email is just a
 * signed-out nudge with a link. This makes "no PHI in email" a property of the
 * type system, not a reviewer's vigilance.
 */

export interface PortalMessage {
  to: string;
  templateId: PortalTemplateId;
  /** Relative portal path the link should deep-link to, e.g. "/portal/messages". */
  portalPath: string;
}

export interface RenderedEmail {
  to: string;
  from: string;
  subject: string;
  text: string;
}

/** Defensive scan: a portal path must never carry query-encoded PHI. */
function assertSafePortalPath(portalPath: string): void {
  if (!portalPath.startsWith("/")) {
    throw new Error("portalPath must be a relative path starting with '/'");
  }
  // No query string / fragment — deep-link by stable resource id only, inside the portal.
  if (portalPath.includes("?") || portalPath.includes("#")) {
    throw new Error("portalPath must not contain a query string or fragment (no PHI in URLs)");
  }
}

export function renderPortalEmail(msg: PortalMessage): RenderedEmail {
  assertSafePortalPath(msg.portalPath);
  const template = PORTAL_TEMPLATES[msg.templateId];
  const portalUrl = `${env.APP_URL}${msg.portalPath}`;
  return {
    to: msg.to,
    from: env.EMAIL_FROM,
    subject: template.subject,
    text: template.body.split(PLACEHOLDER).join(portalUrl),
  };
}

/**
 * Send a portal email. Phase 0 wires rendering + the no-PHI guarantee; the
 * concrete provider call (Resend/SES/etc.) is connected in Phase 1 behind this
 * same signature, so callers never change.
 */
export async function sendPortalEmail(msg: PortalMessage): Promise<RenderedEmail> {
  const rendered = renderPortalEmail(msg);
  // Phase 1: POST rendered -> EMAIL provider using env.EMAIL_API_KEY.
  return rendered;
}
