import { useState } from "react";
import { signIn, signUp } from "../lib/auth";
import { CLINIC } from "../lib/clinic";

export function SignInScreen(props: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    if (mode === "signup") {
      const err = await signUp(email.trim(), password);
      setBusy(false);
      if (err) setError(err);
      else {
        setMode("signin");
        setNotice("Account created. If a confirmation email was sent, confirm it first — then sign in. The administrator assigns your role before you can work.");
      }
      return;
    }
    const err = await signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
    else props.onSignedIn();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={submit} className="section" style={{ width: "min(380px, 92vw)", padding: 0 }}>
        <div className="section-head">
          <div className="brand">
            <span className="brand-title">PI MASTER™</span>
            <span className="brand-sub">by RenuviaMD® Network — {CLINIC.name}</span>
          </div>
        </div>
        <div className="section-body">
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Email</label>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>Password</label>
            <input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="status warn">{error}</p>}
          {notice && <p className="status ok">{notice}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn ghost"
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setNotice("");
            }}
          >
            {mode === "signin" ? "New user? Create account" : "Have an account? Sign in"}
          </button>
          <p className="status" style={{ marginTop: 10 }}>
            New accounts have no access until the clinic administrator assigns a role. Authorized personnel only —
            activity is logged.
          </p>
        </div>
      </form>
    </div>
  );
}
