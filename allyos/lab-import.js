/* AllyOS Lab Import — PHI-free, client-side lab-value extractor with confirm-before-use.
 *
 * Nothing is transmitted. The report text is parsed entirely in the browser and discarded;
 * only the numeric values you CONFIRM are written into the form. A lab report's layout is
 * fuzzy, so extraction NEVER auto-fills — it proposes values you verify/edit first.
 *
 * Usage:
 *   AllyOSLabImport.mount(containerEl, targets, onApply)
 *     targets = [{ id:'tt', label:'Total T', pats:[/regex/, ...], exclude:/regex/ }]
 *     onApply(appliedMap) optional callback after fields are filled.
 */
window.AllyOSLabImport = (function () {
  (function injectCSS(){
    if (document.getElementById('li-css')) return;
    var s = document.createElement('style'); s.id = 'li-css';
    s.textContent =
      '.li-drop{border:1px dashed var(--line2,#2a4a6a);border-radius:11px;padding:12px 14px;background:#0a142266}' +
      '.li-drop.li-over{border-color:var(--teal,#19b9c9);background:#0e2e2b22}' +
      '.li-hint{font-size:11.5px;color:var(--dim,#7d8b91);line-height:1.5;margin-bottom:8px}' +
      '.li-ta{width:100%;background:#0a1422;border:1px solid var(--line2,#2a4a6a);border-radius:9px;color:var(--ink,#e9f3f2);font:inherit;font-size:12px;padding:9px 11px;resize:vertical}' +
      '.li-row{display:flex;align-items:center;gap:12px;margin-top:8px;flex-wrap:wrap}' +
      '.li-note{font-size:11px;color:var(--amber,#e0b062)}' +
      '.li-btn{background:linear-gradient(120deg,var(--teal,#19b9c9),#19b9c9);color:#04121a;border:none;border-radius:9px;padding:9px 14px;font-weight:800;font-size:12.5px;cursor:pointer}' +
      '.li-grid{margin-top:10px}.li-confirm{font-size:11.5px;color:var(--muted,#8aa3ad);margin-bottom:8px}' +
      '.li-empty{font-size:11.5px;color:var(--amber,#e0b062)}' +
      '.li-item{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12.5px}' +
      '.li-item>span{flex:1;color:var(--ink,#e9f3f2)}' +
      '.li-val{width:100px;background:#0a1422;border:1px solid var(--line2,#2a4a6a);border-radius:8px;color:var(--ink,#e9f3f2);font:inherit;font-size:12.5px;padding:6px 9px}' +
      '.li-fill{margin-top:10px}';
    (document.head || document.documentElement).appendChild(s);
  })();
  function extractNumber(line) {
    // strip reference ranges (46.0-224.0 / 46 - 224 / 250 to 1100) and alnum tokens (T4, B12, CO2, LC/MS)
    var s = (' ' + line + ' ')
      .replace(/\d+(?:\.\d+)?\s*(?:[-–]|to)\s*\d+(?:\.\d+)?/gi, ' ')
      .replace(/\b[A-Za-z]{1,5}\d+[A-Za-z]?\b/g, ' ')
      .replace(/\b(?:LC|MS|ULTRASENSITIVE|IU|mIU|ng|dL|dl|mg|pg|mL|ml|nmol|mmol|U|L|H|A|g)\b/g, ' ');
    var m = s.match(/(-?\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }
  function findValue(lines, pats, exclude) {
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (exclude && exclude.test(ln)) continue;
      if (!pats.some(function (p) { return p.test(ln); })) continue;
      var v = extractNumber(ln);
      if (v == null && lines[i + 1] && /^\s*[<>]?\s*-?\d/.test(lines[i + 1])) v = extractNumber(lines[i + 1]);
      if (v != null) return v;
    }
    return null;
  }
  function parse(text, targets) {
    var lines = (text || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    var out = {};
    targets.forEach(function (t) {
      var v = findValue(lines, t.pats, t.exclude);
      if (v != null) out[t.id] = v;
    });
    return out;
  }
  function esc(x){return (''+(x==null?'':x)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  // ---- self-hosted PDF text extraction (pdf.js, lazy-loaded on first PDF drop; runs in-browser) ----
  function ensurePdfjs(){
    return new Promise(function(resolve, reject){
      if (window.pdfjsLib) { return resolve(window.pdfjsLib); }
      var sc = document.createElement('script'); sc.src = 'vendor/pdf.min.js';
      sc.onload = function(){ if (window.pdfjsLib){ window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; resolve(window.pdfjsLib); } else reject(new Error('pdf.js not available')); };
      sc.onerror = function(){ reject(new Error('could not load vendor/pdf.min.js')); };
      (document.head || document.documentElement).appendChild(sc);
    });
  }
  function itemsToLines(items){
    var rows = {};
    items.forEach(function(it){ if(!it.str||!it.transform) return; var y = Math.round(it.transform[5]); (rows[y] = rows[y] || []).push({ x: it.transform[4], s: it.str }); });
    return Object.keys(rows).map(Number).sort(function(a,b){ return b - a; })
      .map(function(y){ return rows[y].sort(function(a,b){ return a.x - b.x; }).map(function(o){ return o.s; }).join(' ').replace(/\s+/g,' ').trim(); })
      .filter(Boolean);
  }
  function pdfToText(buf){
    return ensurePdfjs().then(function(pdfjsLib){
      return pdfjsLib.getDocument({ data: buf }).promise.then(function(pdf){
        var chain = Promise.resolve(), out = [];
        for (var i = 1; i <= pdf.numPages; i++) (function(n){
          chain = chain.then(function(){ return pdf.getPage(n).then(function(pg){ return pg.getTextContent().then(function(tc){ out.push(itemsToLines(tc.items).join('\n')); }); }); });
        })(i);
        return chain.then(function(){ return out.join('\n'); });
      });
    });
  }

  function mount(container, targets, onApply) {
    container.innerHTML =
      '<div class="li-drop" tabindex="0">' +
        '<div class="li-hint">⬇ <b>Drag your lab PDF</b> (or a .txt), or <b>paste the report text</b> below. ' +
        'The PDF is read <b>on this device</b> (pdf.js) — nothing is uploaded — and you confirm every value before it fills the form.</div>' +
        '<textarea class="li-ta" rows="4" placeholder="Paste the lab result text (open the report → Select All → Copy → paste here)…"></textarea>' +
        '<div class="li-row"><button type="button" class="li-btn li-extract">Extract values →</button>' +
        '<span class="li-note"></span></div>' +
        '<div class="li-grid"></div>' +
      '</div>';
    var drop = container.querySelector('.li-drop');
    var ta = container.querySelector('.li-ta');
    var grid = container.querySelector('.li-grid');
    var note = container.querySelector('.li-note');

    function showGrid(found) {
      var keys = Object.keys(found);
      if (!keys.length) { grid.innerHTML = '<div class="li-empty">No values recognized. Paste the text form of the report (not a PDF), or type the values directly into the fields below.</div>'; return; }
      grid.innerHTML = '<div class="li-confirm">Confirm the extracted values (edit any that are wrong), then fill:</div>' +
        keys.map(function (id) {
          var t = targets.filter(function (x) { return x.id === id; })[0] || {};
          return '<label class="li-item"><input type="checkbox" checked data-id="' + esc(id) + '"> <span>' + esc(t.label || id) + '</span>' +
            '<input type="number" step="any" class="li-val" data-id="' + esc(id) + '" value="' + esc(found[id]) + '"></label>';
        }).join('') +
        '<button type="button" class="li-btn li-fill">✓ Fill these fields</button>';
      grid.querySelector('.li-fill').addEventListener('click', function () {
        var applied = {};
        grid.querySelectorAll('.li-item').forEach(function (row) {
          var cb = row.querySelector('input[type=checkbox]');
          var vi = row.querySelector('.li-val');
          if (!cb.checked) return;
          var el = document.getElementById(cb.getAttribute('data-id'));
          if (el && vi.value !== '') { el.value = vi.value; applied[cb.getAttribute('data-id')] = vi.value; }
        });
        note.textContent = Object.keys(applied).length + ' field(s) filled. Review, then Generate.';
        if (onApply) onApply(applied);
      });
    }
    container.querySelector('.li-extract').addEventListener('click', function () { showGrid(parse(ta.value, targets)); });
    ['dragover', 'dragenter'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.add('li-over'); }); });
    ['dragleave', 'drop'].forEach(function (e) { drop.addEventListener(e, function (ev) { ev.preventDefault(); drop.classList.remove('li-over'); }); });
    drop.addEventListener('drop', function (ev) {
      var f = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (!f) return;
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        note.textContent = 'Reading PDF on this device…';
        var pr = new FileReader();
        pr.onload = function () {
          pdfToText(new Uint8Array(pr.result)).then(function (txt) {
            ta.value = txt; note.textContent = 'PDF read locally — confirm the values below.'; showGrid(parse(txt, targets));
          }).catch(function (e) { note.textContent = 'Could not read this PDF (' + (e && e.message || 'error') + '). Open it, Select All, Copy, and paste the text above instead.'; });
        };
        pr.readAsArrayBuffer(f);
        return;
      }
      var r = new FileReader();
      r.onload = function () { ta.value = r.result; showGrid(parse(r.result, targets)); };
      r.readAsText(f);
    });
  }
  return { mount: mount, parse: parse, pdfToText: pdfToText };
})();
