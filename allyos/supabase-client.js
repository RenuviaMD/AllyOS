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

  window.AllyOSCloud = Cloud;
})();
