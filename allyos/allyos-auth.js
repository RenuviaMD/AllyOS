/* AllyOS — auth & role layer (dark UI login + page guards).
 *
 * IMPORTANT — security boundary:
 *   The DEMO backend below stores the session in localStorage. That is NOT a
 *   security boundary — anyone can edit localStorage. It exists to drive the
 *   role-routing / UX while the real backend is wired. REAL enforcement (an RN
 *   genuinely cannot authorize) requires SERVER-SIDE auth. Swap the AUTH adapter
 *   to Supabase (see SUPABASE section at the bottom) to make it real.
 *
 * Roles (scope of practice):
 *   provider  = MD / DO / NP / PA  -> GFE, authorize protocols, sign, full station, build
 *   nurse     = RN / LPN           -> execute only (assign, run, document)
 *   admin     = clinic admin / MD  -> inventory/SKU/price, users, audit
 *
 * Clinic-level flag mdOfRecord: when RenuviaMD is the Medical Director of record,
 * gates ENFORCE; otherwise advisory. Drives the nursing-station MD-of-record mode.
 */
window.AllyOSAuth = (function () {
  var KEY = 'allyos_session';

  var ROLES = {
    provider: { label: 'Provider (MD/DO/NP/PA)', can: ['gfe', 'authorize', 'execute', 'build', 'view_inventory', 'view_admin'] },
    nurse:    { label: 'Nurse (RN/LPN)',         can: ['execute'] },
    admin:    { label: 'Admin / Medical Director',can: ['execute', 'manage_inventory', 'manage_users', 'view_admin', 'audit'] }
  };

  // ---- DEMO backend (replace with Supabase for real enforcement) ----
  var DEMO_USERS = [
    { email: 'md@clinic.test',    password: 'demo', name: 'Falcon', credential: 'MD', role: 'provider' },
    { email: 'np@clinic.test',    password: 'demo', name: 'Rivera', credential: 'NP', role: 'provider' },
    { email: 'rn@clinic.test',    password: 'demo', name: 'Chen',   credential: 'RN', role: 'nurse' },
    { email: 'admin@clinic.test', password: 'demo', name: 'Office', credential: '',   role: 'admin' }
  ];
  // Clinic context (in Supabase this is a row in `clinics`). md_of_record = is RenuviaMD the MD here?
  var CLINIC = { id: 'demo-clinic', name: 'Demo Wellness Clinic', md_of_record: false };

  function session() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function setSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function signOut() { localStorage.removeItem(KEY); location.href = 'login.html'; }

  function signIn(email, password) {
    email = (email || '').trim().toLowerCase();
    // DEMO match. (Supabase: await supabase.auth.signInWithPassword(...) then load the profile row.)
    var u = DEMO_USERS.filter(function (x) { return x.email === email && x.password === password; })[0];
    if (!u) return { error: 'Invalid email or password. Demo accounts: md@ / np@ / rn@ / admin@clinic.test — password "demo".' };
    var s = {
      userId: email, email: email, name: u.name, credential: u.credential, role: u.role,
      clinicId: CLINIC.id, clinic: CLINIC.name, mdOfRecord: CLINIC.md_of_record, demo: true
    };
    setSession(s);
    return { session: s };
  }

  // ---- DEMO / sandbox session (no signup) — clearly fake, never a real chart ----
  function startDemo() {
    var s = { userId: 'demo', email: 'demo', name: 'Demo', credential: 'Provider', role: 'provider',
      clinicId: 'demo-sandbox', clinic: 'Demo Sandbox', mdOfRecord: false, demo: true, sandbox: true };
    setSession(s); return s;
  }

  function can(perm) { var s = session(); if (!s) return false; var r = ROLES[s.role]; return !!(r && r.can.indexOf(perm) >= 0); }
  function hasRole(roles) { var s = session(); return !!(s && roles.indexOf(s.role) >= 0); }

  // greeting: MD/DO -> "Dr. <last>", others -> first/last as given
  function greeting() { var s = session(); if (!s) return ''; return (s.credential === 'MD' || s.credential === 'DO') ? ('Dr. ' + s.name) : s.name; }

  // guard a page: call at top of each protected page with the roles allowed.
  function guard(roles) {
    var s = session();
    // no-signup demo: ?demo=1 on any guarded page starts a sandbox session
    if (!s && /[?&]demo=1/i.test(location.search)) { s = startDemo(); }
    var page = location.pathname.split('/').pop() || '';
    if (!s) { location.href = 'login.html?next=' + encodeURIComponent(page); return false; }
    if (roles && roles.indexOf(s.role) < 0) {
      document.documentElement.innerHTML =
        '<body style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#0b1620;color:#e9f3f2;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;padding:24px">' +
        '<div><h2 style="margin-bottom:8px">Access restricted</h2>' +
        '<p style="color:#8aa3ad">This screen is for: ' + roles.map(function (r) { return ROLES[r] ? ROLES[r].label : r; }).join(', ') +
        '.<br>You are signed in as <b>' + esc(greeting()) + '</b> (' + esc((ROLES[s.role] || {}).label || s.role) + ').</p>' +
        '<p style="margin-top:14px"><a style="color:#28c2b8" href="login.html">Switch user</a></p></div></body>';
      return false;
    }
    return true;
  }

  function esc(x) { return ('' + (x == null ? '' : x)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  return { ROLES: ROLES, session: session, signIn: signIn, signOut: signOut, can: can, hasRole: hasRole, guard: guard, greeting: greeting, startDemo: startDemo };

  /* =====================================================================
   * SUPABASE swap (makes the role boundary REAL — server-enforced)
   * ---------------------------------------------------------------------
   * 1) Add: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   * 2) const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
   * 3) Schema:
   *      create table clinics ( id uuid primary key default gen_random_uuid(),
   *                             name text, md_of_record boolean default false );
   *      create table profiles ( id uuid primary key references auth.users(id),
   *                             clinic_id uuid references clinics(id),
   *                             name text, credential text,
   *                             role text check (role in ('provider','nurse','admin')) );
   *      -- RLS: each row visible to its clinic; role checked in policies so a
   *      -- nurse-token literally cannot write GFE clearance / authorization rows.
   * 4) signIn():  const {data,error}=await sb.auth.signInWithPassword({email,password});
   *               then load profile+clinic, build the same session object.
   * 5) guard():   read sb.auth.getSession(); the SERVER (RLS) is the real gate —
   *               the client guard is only UX routing.
   * ===================================================================== */
})();
