import { activeClinicId, setActiveClinicId, supabase } from "./store";
import type { Role } from "./types";

export interface AuthState {
  userId: string;
  email: string;
  /** roles granted in app_users; 'admin' unlocks every view; 'platform' = cross-clinic */
  roles: string[];
  clinicId: string | null;
  isPlatform: boolean;
}

export async function fetchAuthState(): Promise<AuthState | null> {
  const { data } = await supabase().auth.getSession();
  const session = data.session;
  if (!session) return null;
  // Don't let a slow/failed profile lookup wedge the app on "Loading…" — the
  // session is valid, so fall back to a no-role state (they can still sign in
  // fresh) rather than hanging or throwing to the caller.
  type UserRow = { roles?: string[]; active?: boolean; clinic_id?: string | null };
  let row: UserRow | null = null;
  try {
    const res = await supabase()
      .from("app_users")
      .select("roles, active, clinic_id")
      .eq("user_id", session.user.id)
      .maybeSingle();
    row = (res.data as unknown as UserRow) ?? null;
  } catch {
    row = null;
  }
  const roles = row && row.active ? (row.roles as string[]) : [];
  const clinicId = (row?.clinic_id as string | null) ?? null;
  const isPlatform = roles.includes("platform");
  // Non-platform users are always pinned to their own clinic
  if (!isPlatform && clinicId && activeClinicId() !== clinicId) setActiveClinicId(clinicId);
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    roles,
    clinicId,
    isPlatform,
  };
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

/** Self-service account creation; the account has NO role (no access) until the admin assigns one. */
export async function signUp(email: string, password: string): Promise<string | null> {
  const { error } = await supabase().auth.signUp({ email, password });
  return error ? error.message : null;
}

export async function signOut(): Promise<void> {
  // Clear the local draft so a signed-out shared workstation retains no PHI
  try {
    localStorage.removeItem("pimaster-draft");
  } catch {
    // ignore
  }
  await supabase().auth.signOut();
}

export async function changePassword(newPassword: string): Promise<string | null> {
  const { error } = await supabase().auth.updateUser({ password: newPassword });
  return error ? error.message : null;
}

export function onAuthChange(cb: () => void): () => void {
  const { data } = supabase().auth.onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}

/** Views this account may open. Admin sees everything. */
export function allowedViews(roles: string[]): Role[] {
  if (roles.includes("admin")) return ["staff", "physician", "pt"];
  return (["staff", "physician", "pt"] as Role[]).filter((r) => roles.includes(r));
}
