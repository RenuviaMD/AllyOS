import { useEffect, useState } from "react";
import { listAppUsers, listClinics, updateAppUser, type AppUserRow, type ClinicRow } from "../lib/store";

const ALL_ROLES = ["staff", "physician", "pt", "admin"] as const;

/** Admin-only: assign roles and activate/deactivate accounts. New staff create
 * their own login on the sign-in screen and appear here with no roles. */
export function UsersPanel(props: { onClose: () => void; selfId: string; isPlatform: boolean }) {
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [status, setStatus] = useState("");

  function refresh() {
    listAppUsers()
      .then(setUsers)
      .catch((e) => setStatus(`Load failed: ${e instanceof Error ? e.message : e}`));
    if (props.isPlatform) listClinics().then(setClinics).catch(() => {});
  }
  useEffect(refresh, []);

  async function assignClinic(u: AppUserRow, clinicId: string) {
    const res = await updateAppUser(u.user_id, { clinic_id: clinicId || null });
    setStatus(res.ok ? `${u.email}: clinic assigned.` : `Update failed: ${res.error}`);
    refresh();
  }

  async function toggleRole(u: AppUserRow, role: string) {
    if (u.user_id === props.selfId && role === "admin" && u.roles.includes("admin")) {
      setStatus("You cannot remove your own admin role.");
      return;
    }
    const roles = u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role];
    const res = await updateAppUser(u.user_id, { roles });
    setStatus(res.ok ? `${u.email}: roles updated.` : `Update failed: ${res.error}`);
    refresh();
  }

  async function toggleActive(u: AppUserRow) {
    if (u.user_id === props.selfId) {
      setStatus("You cannot deactivate your own account.");
      return;
    }
    const res = await updateAppUser(u.user_id, { active: !u.active });
    setStatus(res.ok ? `${u.email}: ${u.active ? "deactivated" : "reactivated"}.` : `Update failed: ${res.error}`);
    refresh();
  }

  return (
    <div className="modal-back">
      <div className="modal" style={{ width: "min(760px, 95vw)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "var(--gold)" }}>Users & Roles</h2>
          <button className="btn ghost" style={{ marginLeft: "auto" }} onClick={props.onClose}>Close</button>
        </div>
        <p className="status">
          Everyone signs in on the same screen with their own account. New staff choose "Create account" there and
          appear below with no roles — they have no access until you assign one. Deactivating an account blocks all
          access immediately.
        </p>
        <table className="rom-table">
          <thead>
            <tr><th>Email</th><th>Clinic</th><th>Roles</th><th>Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id} style={{ opacity: u.active ? 1 : 0.5 }}>
                <td>
                  {u.email}
                  {u.user_id === props.selfId && <span className="status"> (you)</span>}
                  {u.roles.length === 0 && u.active && <div className="status warn">Awaiting role assignment</div>}
                </td>
                <td>
                  {props.isPlatform ? (
                    <select
                      value={u.clinic_id ?? ""}
                      onChange={(e) => assignClinic(u, e.target.value)}
                      style={{ background: "var(--hover)", color: "var(--text)", border: "1px solid #46627f", borderRadius: 4, padding: "4px 6px" }}
                    >
                      <option value="">— none —</option>
                      {clinics.map((cl) => (
                        <option key={cl.id} value={cl.id}>{cl.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="status">{u.clinic_id ?? "—"}</span>
                  )}
                  {!u.clinic_id && u.active && <div className="status warn">No clinic</div>}
                </td>
                <td>
                  <div className="checkgroup" style={{ gridTemplateColumns: "repeat(2, minmax(110px, 1fr))" }}>
                    {ALL_ROLES.map((r) => (
                      <label key={r} className={u.roles.includes(r) ? "checked" : ""}>
                        <input type="checkbox" checked={u.roles.includes(r)} onChange={() => toggleRole(u, r)} />
                        {r}
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  <button className="btn ghost" onClick={() => toggleActive(u)}>
                    {u.active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="status">{status}</p>
      </div>
    </div>
  );
}
