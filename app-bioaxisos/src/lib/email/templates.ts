/**
 * Portal email templates. Spec §12: email is TRANSPORT, the portal is CONTENT.
 *
 * Every template is a static string whose ONLY dynamic value is {{portalUrl}}.
 * There is deliberately no slot for a patient name, result, dose, appointment
 * detail, or any other free text — so PHI structurally cannot enter an email body.
 */

export type PortalTemplateId =
  | "new_message"
  | "results_ready"
  | "appointment_reminder"
  | "refill_update"
  | "intake_invite";

interface Template {
  subject: string;
  body: string; // contains exactly one placeholder: {{portalUrl}}
}

export const PORTAL_TEMPLATES: Record<PortalTemplateId, Template> = {
  new_message: {
    subject: "You have a new secure message",
    body: "You have a new message in your BioaxisOS portal. Sign in to read it:\n{{portalUrl}}",
  },
  results_ready: {
    subject: "New information is available in your portal",
    body: "New information is available in your BioaxisOS portal. Sign in to view it:\n{{portalUrl}}",
  },
  appointment_reminder: {
    subject: "Appointment reminder",
    body: "You have an upcoming appointment. View the details in your portal:\n{{portalUrl}}",
  },
  refill_update: {
    subject: "An update on your request",
    body: "There is an update on a request in your portal. Sign in to view it:\n{{portalUrl}}",
  },
  intake_invite: {
    subject: "Complete your intake",
    body: "Please complete your intake in the BioaxisOS portal:\n{{portalUrl}}",
  },
};

export const PLACEHOLDER = "{{portalUrl}}";
