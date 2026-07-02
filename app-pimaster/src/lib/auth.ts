import { supabase } from "./store";
import type { Role } from "./types";

export interface AuthState {
  userId: string;
  email: string;
  /** roles granted in app_users; 'admin' unlocks every view */
  roles: string[];
}

export async function fetchAuthState(): Promise<AuthState | null> {
  const { data } = await supabase().auth.getSession();
  const session = data.session;
  if (!session) return null;
  const { data: row } = await supabase()
    .from("app_users")
    .select("roles, active")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    roles: row && row.active ? (row.roles as string[]) : [],
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
