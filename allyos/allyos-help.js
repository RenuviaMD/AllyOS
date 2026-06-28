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
      '#allyhelp-modal .ok{color:#46e08f;font-size:.86rem;text-align:center;padding:8px 0}';
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
      '<textarea id="allyhelp-msg" placeholder="e.g. Chair 2 timer froze and won\'t discharge"></textarea>' +
      '<button class="btn go" onclick="AllyHelp.send()">Send to your Medical Director</button>' +
      '<button class="btn ghost" onclick="AllyHelp.copy()">⧉ Copy diagnostic</button>' +
      '<details><summary>What we send (PHI-free) — review</summary><pre id="allyhelp-snap">' + esc(snapStr) + '</pre></details>' +
      '<div id="allyhelp-result"></div>';
    document.getElementById('allyhelp-ov').classList.add('show');
  }
  function close() { document.getElementById('allyhelp-ov').classList.remove('show'); }

  function send() {
    var s = ses(), snap = snapshot();
    var msg = (document.getElementById('allyhelp-msg').value || '').trim();
    if (!msg) { document.getElementById('allyhelp-msg').focus(); return; }
    var body = new URLSearchParams({
      'form-name': 'allyos-support',
      clinic: s.clinic || '', role: s.role || '', name: (window.AllyOSAuth && AllyOSAuth.greeting && AllyOSAuth.greeting()) || '',
      page: snap.page, browser: snap.browser, message: msg, diagnostic: JSON.stringify(snap)
    }).toString();
    fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
      .then(done).catch(done);
  }
  function done() { var r = document.getElementById('allyhelp-result'); if (r) r.innerHTML = '<div class="ok">✓ Sent — your Medical Director got your request + the diagnostic.</div>'; }

  function copy() {
    var t = document.getElementById('allyhelp-snap').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {
      var r = document.createRange(); r.selectNode(document.getElementById('allyhelp-snap')); getSelection().removeAllRanges(); getSelection().addRange(r); try { document.execCommand('copy'); } catch (e) {}
    });
    var r = document.getElementById('allyhelp-result'); if (r) r.innerHTML = '<div class="ok">Diagnostic copied — paste it into your chat with the MD.</div>';
  }

  function init() {
    css();
    var btn = document.createElement('button'); btn.id = 'allyhelp-btn'; btn.textContent = '🆘 Get help'; btn.onclick = open;
    var ov = document.createElement('div'); ov.id = 'allyhelp-ov'; ov.innerHTML = '<div id="allyhelp-modal"></div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(btn); document.body.appendChild(ov);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.AllyHelp = { open: open, close: close, send: send, copy: copy, snapshot: snapshot };
})();
