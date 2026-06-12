import { useState } from "react";
import { signIn } from "../lib/auth";
import { CLINIC } from "../lib/clinic";

export function SignInScreen(props: { onSignedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
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
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="status warn">{error}</p>}
          <button className="btn" type="submit" disabled={busy} style={{ width: "100%" }}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="status" style={{ marginTop: 10 }}>
            Access is provisioned by the clinic administrator. Authorized personnel only — activity is logged.
          </p>
        </div>
      </form>
    </div>
  );
}
