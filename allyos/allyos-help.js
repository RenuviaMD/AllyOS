/* AllyOS — Get Help widget + PHI-FREE diagnostic snapshot.
 *
 * Drop <script src="allyos-help.js"></script> on any page. It injects a floating
 * "Get help" button + modal. The diagnostic it sends is DE-IDENTIFIED by design:
 * it reports device/browser/app health and STATE METADATA ONLY (key sizes +
 * safe derived counts) — never localStorage values, which on the chairside hold
 * patient names. So the MD can see "is it just them?" without any PHI.
 *
 * Scope: app/technical support only (PHI-free). Clinical/patient contact is a
 * separate channel (Ally + the emergency cards + your MD-of-record line) — not
 * this button. Support requests POST to the Netlify form "allyos-support"
 * (registered by a hidden static form on dashboard.html). No PHI leaves the device.
 */
(function () {
  var ERRORS = [];
  window.addEventListener('error', function (e) { push('error', e.message); });
  window.addEventListener('unhandledrejection', function (e) { push('promise', (e.reason && e.reason.message) || e.reason); });
  function push(t, m) { ERRORS.push(t + ': ' + String(m || '').slice(0, 140)); if (ERRORS.length > 8) ERRORS.shift(); }

  function ses() { return (window.AllyOSAuth && AllyOSAuth.session()) || {}; }

  function storageWritable() { try { localStorage.setItem('_allyos_t', '1'); localStorage.removeItem('_allyos_t'); return true; } catch (e) { return false; } }

  // STATE METADATA ONLY — key + KB + safe derived counts. Never values (those hold PHI).
  function storageHealth() {
    var out = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('allyos') < 0 && k.indexOf('renuviamd') < 0) continue;
        var v = localStorage.getItem(k) || '';
        var info = { key: k, kb: Math.round(v.length / 1024 * 10) / 10 };
        try {
          var p = JSON.parse(v);
          if (k === 'allyos_chairside_v1') { info.chairs = (p.chairs || []).filter(Boolean).length; info.queue = (p.q || []).length; info.ally = (p.ally || []).length; }
          else if (k === 'allyos_audit_v1' && Array.isArray(p)) info.encounters = p.length;
          else if (Array.isArray(p)) info.items = p.length;
          else if (p && typeof p === 'object') info.keys = Object.keys(p).length;
        } catch (e) { info.parse = 'corrupt/not-json'; }
        out.push(info);
      }
    } catch (e) { return [{ error: 'localStorage blocked (private mode?)' }]; }
    return out;
  }

  function snapshot() {
    var s = ses();
    return {
      app: 'AllyOS',
      page: location.pathname.split('/').pop() || '(root)',
      built: document.lastModified,
      ts: new Date().toISOString(),
      clinic: s.clinic || '', role: s.role || '', mdOfRecord: !!s.mdOfRecord,
      browser: navigator.userAgent,
      platform: navigator.platform || '',
      language: navigator.language || '',
      online: navigator.onLine,
      screen: screen.width + '×' + screen.height,
      viewport: window.innerWidth + '×' + window.innerHeight,
      storage_writable: storageWritable(),
      state: storageHealth(),
      recent_errors: ERRORS.slice(-5)
    };
  }

  function css() {
    var c = document.createElement('style');
    c.textContent =
      '#allyhelp-btn{position:fixed;left:16px;bottom:16px;z-index:9998;background:#10202f;color:#eaf1f6;border:1px solid #2ee6d6;border-radius:999px;padding:10px 16px;font:600 13px/-apple-system,Segoe UI,Arial,sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.35)}' +
      '#allyhelp-btn:hover{background:#15293a}' +
      '#allyhelp-ov{position:fixed;inset:0;background:#04080fcc;display:none;align-items:center;justify-content:center;padding:18px;z-index:9999;font-family:-apple-system,Segoe UI,Arial,sans-serif}' +
      '#allyhelp-ov.show{display:flex}' +
      '#allyhelp-modal{background:#0b1622;border:1px solid #243446;border-radius:16px;max-width:460px;width:100%;padding:20px;color:#eaf1f6;max-height:90vh;overflow:auto}' +
      '#allyhelp-modal h3{font-size:1.1rem;margin:0 0 2px}#allyhelp-modal .x{float:right;background:none;border:none;color:#90a3b6;font-size:1.3rem;cursor:pointer}' +
      '#allyhelp-modal .sub{color:#90a3b6;font-size:.82rem;margin-bottom:10px}' +
      '#allyhelp-modal textarea{width:100%;background:#0e1f29;border:1px solid #243446;border-radius:9px;padding:10px;color:#eaf1f6;font-family:inherit;font-size:.9rem;min-height:80px}' +
      '#allyhelp-modal .btn{display:block;width:100%;border:none;border-radius:999px;padding:12px;margin-top:9px;cursor:pointer;font-weight:600;font-size:.92rem;text-decoration:none;text-align:center}' +
      '#allyhelp-modal .btn.go{background:linear-gradient(120deg,#2ee6d6,#19b9c9);color:#04121a}' +
      '#allyhelp-modal .btn.ghost{background:transparent;border:1px solid #243446;color:#eaf1f6}' +
      '#allyhelp-modal details{margin-top:10px;border:1px dashed #243446;border-radius:9px}' +
      '#allyhelp-modal summary{cursor:pointer;padding:9px 12px;font-size:.8rem;color:#2ee6d6}' +
      '#allyhelp-modal pre{margin:0;padding:0 12px 12px;font-size:.7rem;color:#9fc;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto}' +
      '#allyhelp-modal .ok{color:#46e08f;font-size:.86rem;text-align:center;padding:8px 0}' +
      '#allyhelp-banner{position:fixed;left:0;right:0;top:0;z-index:9997;background:#2a1f08;color:#f0d08a;border-bottom:1px solid #5a4a22;padding:9px 16px;font:600 13px/-apple-system,Segoe UI,Arial,sans-serif;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}' +
      '#allyhelp-banner a{color:#2ee6d6}#allyhelp-banner button{background:none;border:none;color:#90a3b6;font-size:1.1rem;cursor:pointer}';
    document.head.appendChild(c);
  }

  function esc(x) { return ('' + (x == null ? '' : x)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function open() {
    var snap = snapshot();
    var snapStr = JSON.stringify(snap, null, 2);
    var m = document.getElementById('allyhelp-modal');
    m.innerHTML =
      '<button class="x" onclick="AllyHelp.close()">×</button><h3>🆘 Get help</h3>' +
      '<div class="sub">Tell your Medical Director what\'s happening. We attach a <b>PHI-free</b> device/app diagnostic — no patient names or data.</div>' +
      '<textarea id="allyhelp-msg" placeholder="e.g. Chair 2 timer froze and won\'t discharge — describe by chair/protocol, no patient names"></textarea>' +
      '<button class="btn go" onclick="AllyHelp.send()">Send to your Medical Director</button>' +
      '<button class="btn ghost" onclick="AllyHelp.copy()">⧉ Copy diagnostic</button>' +
      '<details><summary>What we send (PHI-free) — review</summary><pre id="allyhelp-snap">' + esc(snapStr) + '</pre></details>' +
      '<div id="allyhelp-result"></div>';
    document.getElementById('allyhelp-ov').classList.add('show');
  }
  function close() { document.getElementById('allyhelp-ov').classList.remove('show'); }

  function send() {
    var snap = snapshot();
    var msg = (document.getElementById('allyhelp-msg').value || '').trim();
    if (!msg) { document.getElementById('allyhelp-msg').focus(); return; }
    var r = document.getElementById('allyhelp-result');
    if (r) r.innerHTML = '<div class="ok" style="color:#90a3b6">🔍 Checking your device…</div>';
    // run the debugger agent for an instant triage, then forward the diagnosed issue to the MD
    fetch('/.netlify/functions/debug', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diagnostic: snap, message: msg }) })
      .then(function (x) { return x.json(); })
      .then(function (d) { var t = d && d.triage; showTriage(t); post(snap, msg, t); pushCloud(snap, msg, t); })
      .catch(function () { post(snap, msg, null); pushCloud(snap, msg, null); });
  }
  // also land the incident in the MD cockpit's triage queue (PHI-free; fail-soft if no table/cloud)
  function pushCloud(snap, msg, t) {
    try {
      var s = ses();
      if (!window.AllyOSCloud || !s.clinicId) return;
      AllyOSCloud.ready.then(function (ok) {
        if (!ok) return;
        AllyOSCloud.pushIncident(s.clinicId, {
          environment: snap.page, workflow: snap.page, incident_summary: msg,
          reporter_role: s.role || '', diagnostic: snap, triage: t || {},
        });
      });
    } catch (e) {}
  }
  function showTriage(t) {
    var r = document.getElementById('allyhelp-result'); if (!r) return;
    if (!t) { r.innerHTML = '<div class="ok">✓ Sent to your Medical Director.</div>'; return; }
    var unsafe = t.sev === 'SEV-1' || t.sev === 'SEV-2' || t.safety_concern === 'yes';
    var safetyBanner = unsafe
      ? '<div style="background:#3a1414;border:1px solid #6a2020;color:#f7c9c2;border-radius:9px;padding:11px 12px;margin-top:8px;font-size:.86rem">' +
        '<b style="color:#f0a59d">⛔ ' + esc(t.sev || 'Safety') + ' — hold this recommendation.</b><br>' +
        'Do not proceed on the AI suggestion. Contact your Medical Director before continuing this patient.</div>'
      : '';
    var sevTag = t.sev ? '<span style="color:#90a3b6"> · ' + esc(t.sev) + (t.failure_class && t.failure_class !== 'UNKNOWN' ? ' · ' + esc(t.failure_class) : '') + '</span>' : '';
    r.innerHTML = safetyBanner +
      '<div style="background:#0e1f29;border:1px solid #243446;border-radius:9px;padding:10px;margin-top:8px;font-size:.84rem">' +
      '<b>Quick check:</b> ' + esc(t.likely_cause || '—') + ' <span style="color:#90a3b6">(' + esc(t.scope || '') + (t.confidence ? ', ' + esc(t.confidence) : '') + ')</span>' + sevTag +
      (t.clinic_fix ? '<br><b>' + (unsafe ? 'Do' : 'Try') + ':</b> ' + esc(t.clinic_fix) : '') + '</div>' +
      '<div class="ok">✓ Also sent to your Medical Director.</div>';
  }
  function post(snap, msg, t) {
    var s = ses();
    var body = new URLSearchParams({
      'form-name': 'allyos-support',
      clinic: s.clinic || '', role: s.role || '', name: (window.AllyOSAuth && AllyOSAuth.greeting && AllyOSAuth.greeting()) || '',
      page: snap.page, browser: snap.browser, message: msg, diagnostic: JSON.stringify(snap), triage: t ? JSON.stringify(t) : ''
    }).toString();
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body }).catch(function () {});
  }

  function copy() {
    var t = document.getElementById('allyhelp-snap').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {
      var r = document.createRange(); r.selectNode(document.getElementById('allyhelp-snap')); getSelection().removeAllRanges(); getSelection().addRange(r); try { document.execCommand('copy'); } catch (e) {}
    });
    var r = document.getElementById('allyhelp-result'); if (r) r.innerHTML = '<div class="ok">Diagnostic copied — paste it into your chat with the MD.</div>';
  }

  // at-app-open health check (client-side, deterministic, runs every load)
  function preflight() {
    var issues = [];
    if (!storageWritable()) issues.push("Private/incognito mode — your work won't be saved. Reopen AllyOS in a normal window.");
    if (!navigator.onLine) issues.push("No internet — Ally/sync are off (the station still works offline).");
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i); if (k.indexOf('allyos') !== 0) continue;
        try { JSON.parse(localStorage.getItem(k)); } catch (e) { issues.push("Saved data looks corrupt (" + k + ") — Restore from a backup on the Dashboard."); }
      }
    } catch (e) {}
    if (issues.length) banner(issues);
  }
  function banner(issues) {
    if (document.getElementById('allyhelp-banner')) return;
    var b = document.createElement('div'); b.id = 'allyhelp-banner';
    b.innerHTML = '<span>⚠ ' + esc(issues[0]) + (issues.length > 1 ? ' (+' + (issues.length - 1) + ' more)' : '') + '</span>' +
      '<a href="#" onclick="AllyHelp.open();return false">Get help</a><button title="Dismiss" onclick="this.parentNode.remove()">×</button>';
    document.body.insertBefore(b, document.body.firstChild);
  }

  function init() {
    css();
    var btn = document.createElement('button'); btn.id = 'allyhelp-btn'; btn.textContent = '🆘 Get help'; btn.onclick = open;
    var ov = document.createElement('div'); ov.id = 'allyhelp-ov'; ov.innerHTML = '<div id="allyhelp-modal"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(btn); document.body.appendChild(ov);
    try { preflight(); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.AllyHelp = { open: open, close: close, send: send, copy: copy, snapshot: snapshot };
})();
