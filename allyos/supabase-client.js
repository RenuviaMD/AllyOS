/* ============================================================
   AllyOS Cloud — Supabase sync layer (PHI-FREE)
   Project: allyos-wellness (separate from the AHCA 'allyos' project).
   Additive to the on-device localStorage store: the app works fully
   offline; the cloud adds auth, the clinic registry, and de-identified
   audit sync to the MD cockpit. Row Level Security guards every table —
   the publishable key below is public-safe by design.
   NEVER send PHI here: audit rows are de-identified (no patient name/DOB/MRN).
   ============================================================ */
(function () {
  var URL = "https://wkffjrwgittuikgzhdmx.supabase.co";
  var KEY = "sb_publishable_tT_jRgtBIl4P7STUGltbbg_GNslFxgj";
  var CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";

  var Cloud = {
    configured: false,      // true once supabase-js is loaded and a client exists
    ready: null,            // promise that resolves when load attempt settles
    _sb: null,
    _authCbs: [],
  };

  // ---- app <-> db field mapping for audit_encounters (de-identified ONLY) ----
  function toDb(r, clinicId) {
    return {
      id: String(r.id), clinic_id: clinicId, line: r.line || "iv", ym: r.ym || null,
      enc_date: r.date || null, protocol: r.protocol || null, gfe: r.gfe || null,
      consent: !!r.consent, mon_count: r.monCount || 0, pre_vit: !!r.preVit, post_vit: !!r.postVit,
      aftercare: !!r.aftercare, override: r.override || null, ae: !!r.ae, suspended: !!r.suspended,
      suspend_reason: r.suspendReason || null, risk_flags: r.riskFlags || [], risk: r.risk || null,
      outcome: r.outcome || null, provider: r.provider || null, audited: !!r.audited,
      audit_pass: (r.auditPass === undefined ? null : r.auditPass), audit_note: r.auditNote || null,
    };
  }
  function fromDb(d) {
    return {
      id: d.id, line: d.line, ym: d.ym, date: d.enc_date, protocol: d.protocol, gfe: d.gfe,
      consent: d.consent, monCount: d.mon_count, preVit: d.pre_vit, postVit: d.post_vit,
      aftercare: d.aftercare, override: d.override, ae: d.ae, suspended: d.suspended,
      suspendReason: d.suspend_reason, riskFlags: d.risk_flags || [], risk: d.risk,
      outcome: d.outcome, provider: d.provider, audited: d.audited, auditPass: d.audit_pass,
      auditNote: d.audit_note, clinic_id: d.clinic_id,
    };
  }

  // ---- lazy load supabase-js ----
  function load() {
    return new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) return resolve(true);
      var s = document.createElement("script");
      s.src = CDN; s.async = true;
      s.onload = function () { resolve(!!(window.supabase && window.supabase.createClient)); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  Cloud.ready = load().then(function (ok) {
    if (!ok) { Cloud.configured = false; return false; }
    try {
      Cloud._sb = window.supabase.createClient(URL, KEY, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "allyos_cloud_auth" },
      });
      Cloud.configured = true;
      Cloud._sb.auth.onAuthStateChange(function (_e, session) {
        Cloud._authCbs.forEach(function (cb) { try { cb(session && session.user); } catch (e) {} });
      });
    } catch (e) { Cloud.configured = false; }
    return Cloud.configured;
  });

  function guard() { return Cloud.configured && Cloud._sb; }

  // ---- auth ----
  Cloud.onAuth = function (cb) { Cloud._authCbs.push(cb); };
  Cloud.session = function () {
    if (!guard()) return Promise.resolve(null);
    return Cloud._sb.auth.getSession().then(function (r) { return r.data && r.data.session; });
  };
  Cloud.user = function () {
    if (!guard()) return Promise.resolve(null);
    return Cloud._sb.auth.getUser().then(function (r) { return r.data && r.data.user; }).catch(function () { return null; });
  };
  Cloud.signInWithPassword = function (email, password) {
    if (!guard()) return Promise.resolve({ error: "cloud not available" });
    return Cloud._sb.auth.signInWithPassword({ email: email, password: password });
  };
  Cloud.signInWithOtp = function (email) { // magic link
    if (!guard()) return Promise.resolve({ error: "cloud not available" });
    return Cloud._sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: location.origin + "/allyos/dashboard.html" } });
  };
  Cloud.signOut = function () { if (!guard()) return Promise.resolve(); return Cloud._sb.auth.signOut(); };

  // ---- data (all RLS-scoped to the signed-in user) ----
  Cloud.listClinics = function () {
    if (!guard()) return Promise.resolve([]);
    return Cloud._sb.from("clinics").select("*").then(function (r) { return (r && r.data) || []; });
  };
  Cloud.pushAudit = function (clinicId, rows) {
    if (!guard() || !clinicId || !rows || !rows.length) return Promise.resolve({ pushed: 0 });
    var payload = rows.map(function (r) { return toDb(r, clinicId); });
    return Cloud._sb.from("audit_encounters").upsert(payload, { onConflict: "clinic_id,id" })
      .then(function (r) { return { pushed: r.error ? 0 : payload.length, error: r.error }; });
  };
  Cloud.pullAudit = function (clinicId, ym) {
    if (!guard() || !clinicId) return Promise.resolve([]);
    var q = Cloud._sb.from("audit_encounters").select("*").eq("clinic_id", clinicId);
    if (ym) q = q.eq("ym", ym);
    return q.then(function (r) { return ((r && r.data) || []).map(fromDb); });
  };
  // cockpit: per-clinic de-identified rollups for a given month
  Cloud.clinicSummaries = function (ym) {
    if (!guard()) return Promise.resolve([]);
    return Cloud.listClinics().then(function (clinics) {
      return Promise.all(clinics.map(function (c) {
        return Cloud.pullAudit(c.id, ym).then(function (rows) {
          return {
            clinic: c, encounters: rows.length,
            mandatory: rows.filter(function (x) { return (x.risk || 0) >= 5 || x.ae || x.suspended; }).length,
            audited: rows.filter(function (x) { return x.audited; }).length,
            corrections: rows.filter(function (x) { return x.audited && x.auditPass === false; }).length,
          };
        });
      }));
    });
  };

  // ---- clinic care-model config (server-authoritative; owner writes, clinic reads) ----
  function clinicToCfg(c) {
    if (!c) return null;
    var lines = c.lines || [];
    return {
      id: c.id, name: c.name, city: c.city_state || "",
      falconIsMd: (c.md_arrangement === "renuviamd" || !!c.md_of_record),
      rnIvModel: !!c.rn_iv_model,
      lines: { iv: lines.indexOf("iv") >= 0, peptides: lines.indexOf("peptides") >= 0, bhrt: lines.indexOf("bhrt") >= 0 },
      status: c.status,
    };
  }
  // the signed-in user's clinic (RLS returns only theirs), mapped to the app config shape
  Cloud.myClinic = function () {
    if (!guard()) return Promise.resolve(null);
    return Cloud.listClinics().then(function (cs) { return clinicToCfg((cs && cs[0]) || null); }).catch(function () { return null; });
  };
  // owner-only write (RLS: only app_admin may UPDATE clinics — the RN/clinic cannot)
  Cloud.saveClinicConfig = function (clinicId, cfg) {
    if (!guard() || !clinicId) return Promise.resolve({ ok: false, error: "cloud not available" });
    var lines = [];
    if (cfg.lines) ["iv", "peptides", "bhrt"].forEach(function (k) { if (cfg.lines[k]) lines.push(k); });
    var patch = {
      md_arrangement: cfg.falconIsMd ? "renuviamd" : "own", md_of_record: !!cfg.falconIsMd,
      rn_iv_model: !!cfg.rnIvModel, lines: lines,
    };
    if (cfg.name) patch.name = cfg.name;
    if (cfg.city) patch.city_state = cfg.city;
    return Cloud._sb.from("clinics").update(patch).eq("id", clinicId)
      .then(function (r) { return { ok: !r.error, error: r.error }; });
  };

  // ---- de-identified GFE request/result sync (remote MD-of-record loop; PHI-free) ----
  // push a de-identified GFE request (nurse device -> cloud). NEVER include name/DOB/MRN.
  Cloud.pushGfeRequest = function (clinicId, r) {
    if (!guard() || !clinicId || !r || !r.enc) return Promise.resolve({ ok: false });
    var row = {
      clinic_id: clinicId, enc: r.enc, plan: r.plan || null, age: (r.age != null ? r.age : null),
      sex: r.sex || null, screen: r.screen || {},
      status: r.status || "requested", determination: r.determination || null,
      signer: r.signer || null, signed_at: r.signed_at || null,
    };
    return Cloud._sb.from("gfe_requests").upsert(row, { onConflict: "clinic_id,enc" })
      .then(function (x) { return { ok: !x.error, error: x.error }; });
  };
  // pull a clinic's GFE requests (RLS-scoped). Optional status filter.
  Cloud.pullGfeRequests = function (clinicId, status) {
    if (!guard() || !clinicId) return Promise.resolve([]);
    var q = Cloud._sb.from("gfe_requests").select("*").eq("clinic_id", clinicId);
    if (status) q = q.eq("status", status);
    return q.order("created_at", { ascending: true }).then(function (x) { return (x && x.data) || []; });
  };
  // the MD signs a request (RLS rejects non-MD). determination: eligible|defer|no.
  Cloud.signGfeRequest = function (clinicId, enc, determination, signer) {
    if (!guard() || !clinicId || !enc) return Promise.resolve({ ok: false });
    var status = determination === "eligible" ? "signed" : (determination === "defer" ? "deferred" : "declined");
    return Cloud._sb.from("gfe_requests")
      .update({ status: status, determination: determination, signer: signer || null, signed_at: new Date().toISOString() })
      .eq("clinic_id", clinicId).eq("enc", enc)
      .then(function (x) { return { ok: !x.error, error: x.error }; });
  };

  // ---- field incidents (Cockpit Debugging Agent loop; PHI-FREE — metadata only) ----
  // a clinic reports an incident; it lands in the MD cockpit's triage queue. NEVER PHI.
  // Fail-soft: if the incidents table isn't provisioned yet, this resolves {ok:false}.
  Cloud.pushIncident = function (clinicId, r) {
    if (!guard() || !clinicId || !r || !r.incident_summary) return Promise.resolve({ ok: false });
    var t = r.triage || {};
    var row = {
      clinic_id: clinicId, environment: r.environment || null, workflow: r.workflow || null,
      incident_summary: String(r.incident_summary).slice(0, 4000),
      expected_behavior: r.expected_behavior || null, actual_behavior: r.actual_behavior || null,
      safety_concern: r.safety_concern || t.safety_concern || "unknown",
      sev: r.sev || t.sev || null, failure_class: r.failure_class || t.failure_class || null,
      module: r.module || t.module || null, triage: t, diagnostic: r.diagnostic || {},
      reporter_role: r.reporter_role || null, status: "open",
    };
    return Cloud._sb.from("incidents").insert(row)
      .then(function (x) { return { ok: !x.error, error: x.error }; })
      .catch(function (e) { return { ok: false, error: e }; });
  };
  // cockpit: pull a clinic's incidents (RLS-scoped). Optional status filter.
  Cloud.pullIncidents = function (clinicId, status) {
    if (!guard() || !clinicId) return Promise.resolve([]);
    var q = Cloud._sb.from("incidents").select("*").eq("clinic_id", clinicId);
    if (status) q = q.eq("status", status);
    return q.order("created_at", { ascending: false }).then(function (x) { return (x && x.data) || []; })
      .catch(function () { return []; });
  };
  // MD/owner triage: set status (+ optional severity/disposition). RLS rejects non-MD.
  Cloud.setIncidentStatus = function (id, patch) {
    if (!guard() || !id) return Promise.resolve({ ok: false });
    var p = { status: patch.status, updated_at: new Date().toISOString() };
    if (patch.sev) p.sev = patch.sev;
    if (patch.disposition != null) p.disposition = patch.disposition;
    if (patch.reviewer) { p.reviewer = patch.reviewer; p.reviewed_at = new Date().toISOString(); }
    return Cloud._sb.from("incidents").update(p).eq("id", id)
      .then(function (x) { return { ok: !x.error, error: x.error }; })
      .catch(function (e) { return { ok: false, error: e }; });
  };

  // ---- real session profile (replaces demo accounts): who am I, what clinic, what lines ----
  Cloud.profile = function () {
    if (!guard()) return Promise.resolve(null);
    return Cloud.user().then(function (u) {
      if (!u) return null;
      var isAdmin = false, membership = null;
      return Cloud._sb.from("app_admins").select("user_id").eq("user_id", u.id).maybeSingle()
        .then(function (a) { isAdmin = !!(a && a.data); })
        .then(function () {
          return Cloud._sb.from("clinic_members").select("clinic_id, role, is_md, clinics(name, lines)").eq("user_id", u.id);
        })
        .then(function (m) {
          membership = (m && m.data && m.data[0]) || null;
          var clinic = membership && membership.clinics ? membership.clinics : null;
          var lines = clinic && clinic.lines ? clinic.lines : [];
          var metaName = (u.user_metadata && u.user_metadata.name) || "";
          var localPart = (u.email || "").split("@")[0].replace(/^dr[._-]?/i, "").replace(/[._-]/g, " ").trim();
          var nameFromEmail = metaName || localPart.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || "Provider";
          return {
            userId: u.id, email: u.email, name: nameFromEmail,
            role: membership ? membership.role : (isAdmin ? "admin" : "provider"),
            clinic: clinic ? clinic.name : (isAdmin ? "RenuviaMD — Medical Director" : ""),
            clinicId: membership ? membership.clinic_id : null,
            mdOfRecord: membership ? !!membership.is_md : false,
            mdAudit: isAdmin,
            lines: { iv: lines.indexOf("iv") >= 0, peptides: lines.indexOf("peptides") >= 0, bhrt: lines.indexOf("bhrt") >= 0 },
            cloud: true,
          };
        });
    }).catch(function () { return null; });
  };

  window.AllyOSCloud = Cloud;
})();
