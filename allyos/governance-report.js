/* AllyOS Governance Binder Report — client-side PDF (pdfmake), PHI-free.
 * Renders the governance checklist as a binder-ready monthly report matching the
 * RenuviaMD/Ally ReportLab template style. Lazy-loads pdfmake on first use.
 *
 *   AllyOSGovReport.download(payload)
 *   payload = { clinic, month, md, rec, overall, required:[{label,status}],
 *               lines:[{title, items:[{label,status}]}], corrections:[{label,resp,due}] }
 */
window.AllyOSGovReport = (function () {
  var NAVY = '#13233b', GREEN = '#1f8f55', RED = '#b42318', BLUE = '#2f66d8',
      SLATE = '#475569', LIGHT = '#f6f8fb', LINE = '#d9e1ec', INK = '#1f2937', HEAD = '#eef4ff';
  function ensure() {
    return new Promise(function (resolve, reject) {
      if (window.pdfMake && window.pdfMake.vfs) return resolve(window.pdfMake);
      loadScript('vendor/pdfmake.min.js').then(function () {
        return loadScript('vendor/vfs_fonts.js');
      }).then(function () {
        if (window.pdfMake) resolve(window.pdfMake); else reject(new Error('pdfmake not available'));
      }).catch(reject);
    });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src;
      s.onload = res; s.onerror = function () { rej(new Error('failed to load ' + src)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function statusColor(s) { return s === 'Present' ? GREEN : s === 'Missing' ? RED : s === 'Not applicable' ? BLUE : SLATE; }
  function statusBox(label, status, color) {
    return { table: { widths: ['*', 110], body: [[
      { text: label, bold: true, color: SLATE, fontSize: 8.5 },
      { text: status, bold: true, color: color || GREEN, alignment: 'center', fontSize: 8.5 }
    ]] }, layout: {
      fillColor: function () { return LIGHT; },
      hLineColor: function () { return LINE; }, vLineColor: function () { return LINE; },
      hLineWidth: function () { return 0.75; }, vLineWidth: function () { return 0.35; },
      paddingTop: function () { return 6; }, paddingBottom: function () { return 6; }, paddingLeft: function () { return 8; }, paddingRight: function () { return 8; }
    }, margin: [0, 4, 0, 4] };
  }
  function checklist(title, items) {
    var body = [[{ text: title, bold: true, color: SLATE, fontSize: 8.5, fillColor: HEAD }, { text: 'Status', bold: true, color: SLATE, fontSize: 8.5, alignment: 'right', fillColor: HEAD }]];
    items.forEach(function (it) {
      body.push([{ text: it.label, fontSize: 9.5, color: INK }, { text: it.status || '—', bold: true, alignment: 'right', color: statusColor(it.status), fontSize: 8.5 }]);
    });
    return { table: { widths: ['*', 92], body: body }, layout: gridLayout(), margin: [0, 2, 0, 8], unbreakable: true };
  }
  function dataTable(head, rows, widths) {
    var body = [head.map(function (h) { return { text: h, bold: true, color: 'white', fontSize: 8.5, fillColor: NAVY }; })];
    rows.forEach(function (r) { body.push(r.map(function (c) { return { text: '' + c, fontSize: 9, color: INK }; })); });
    return { table: { widths: widths || null, headerRows: 1, body: body }, layout: gridLayout(), margin: [0, 2, 0, 8] };
  }
  function gridLayout() {
    return { hLineColor: function () { return LINE; }, vLineColor: function () { return LINE; },
      hLineWidth: function () { return 0.5; }, vLineWidth: function () { return 0.5; },
      paddingTop: function () { return 5; }, paddingBottom: function () { return 5; }, paddingLeft: function () { return 6; }, paddingRight: function () { return 6; } };
  }
  function sec(t) { return { text: t, style: 'sectionTitle' }; }

  function build(pl) {
    var overallColor = pl.overall === 'Compliant' ? GREEN : pl.overall === 'Needs correction' ? RED : SLATE;
    var content = [
      { text: 'Monthly Medical Director Governance Report', style: 'coverTitle' },
      { text: 'Ally Wellness · Non-AHCA Clinic Oversight — Binder-Ready Monthly Report', style: 'subtitle' },
      { text: ' ', margin: [0, 4] },
      dataTable(['Field', 'Detail'], [
        ['Clinic / Program', pl.clinic || '—'],
        ['Medical Director', pl.md || '—'],
        ['Report Date', pl.month || '—'],
        ['Clinic Record Location', pl.rec || 'Clinic EMR / paper chart remains the official record'],
        ['Active Treatment Lines', (pl.lines && pl.lines.length) ? pl.lines.map(function (l) { return l.title; }).join(', ') : 'None active for this period'],
        ['Overall Status', pl.overall || '—']
      ], [140, '*']),
      sec('I. General Governance'),
      statusBox('Overall governance status for the reporting period', pl.overall || '—', overallColor),
      checklist('Required for every clinic', pl.required || []),
      sec('II. Service-Line Governance Review'),
      { text: 'Only active treatment lines are shown; inactive lines are omitted from this report.', style: 'body', margin: [0, 0, 0, 6] }
    ];
    if (pl.lines && pl.lines.length) pl.lines.forEach(function (l) { content.push(checklist(l.title, l.items)); });
    else content.push(statusBox('No IV/IM, peptide, or BHRT/HRT line was active this period', 'NOT ACTIVE', '#b87913'));

    content.push(sec('III. Corrective Action'));
    if (pl.corrections && pl.corrections.length) {
      content.push({ text: 'The following items were marked Missing and require correction:', style: 'body', margin: [0, 0, 0, 6] });
      content.push(dataTable(['Item', 'Responsible party', 'Due date'],
        pl.corrections.map(function (c) { return [c.label + ' missing', c.resp || '—', c.due || '—']; }), ['*', 150, 100]));
    } else {
      content.push(statusBox('Corrective action', 'NONE REQUIRED', GREEN));
      content.push({ text: 'No items marked Missing. Staff reminded that services may only be performed within signed protocol, active license/scope, documented consent, and clinic record requirements.', style: 'body', margin: [0, 4, 0, 0] });
    }

    content.push(sec('IV. Medical Director Attestation'));
    content.push({ text: pl.note || 'I reviewed the governance items above for the reporting period. This report documents Medical Director oversight status, service-line governance, and any corrective-action needs for the clinic binder. The clinic EMR or paper chart remains the official medical record.', style: 'body' });
    content.push({ text: ' ', margin: [0, 18] });
    content.push({ columns: [
      { width: '*', stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 240, y2: 0, lineWidth: 0.75 }] }, { text: (pl.md || 'Medical Director') + ' — Signature & Print', color: SLATE, fontSize: 9, margin: [0, 4, 0, 0] }] },
      { width: 150, stack: [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 130, y2: 0, lineWidth: 0.75 }] }, { text: 'Date', color: SLATE, fontSize: 9, margin: [0, 4, 0, 0] }] }
    ] });

    return {
      pageSize: 'LETTER', pageMargins: [50, 46, 50, 54],
      info: { title: 'Ally Monthly Governance Report', author: pl.md || 'Medical Director' },
      footer: function (cp, pc) {
        return { margin: [50, 8, 50, 0], columns: [
          { text: 'Ally Monthly Governance Report · internal clinic binder copy', color: SLATE, fontSize: 7.5 },
          { text: 'Page ' + cp + ' of ' + pc, color: SLATE, fontSize: 7.5, alignment: 'right' }
        ] };
      },
      content: content,
      styles: {
        coverTitle: { fontSize: 20, bold: true, color: NAVY, alignment: 'center', margin: [0, 0, 0, 6] },
        subtitle: { fontSize: 10, color: SLATE, alignment: 'center' },
        sectionTitle: { fontSize: 13, bold: true, color: NAVY, margin: [0, 14, 0, 6] },
        body: { fontSize: 9.5, color: INK, lineHeight: 1.25 }
      },
      defaultStyle: { fontSize: 9.5, color: INK }
    };
  }
  function download(pl) {
    return ensure().then(function (pm) {
      var name = 'Ally-Governance-' + (pl.clinic || 'Clinic').replace(/[^A-Za-z0-9]+/g, '-') + '-' + (pl.month || '').replace(/[^A-Za-z0-9]+/g, '-') + '.pdf';
      pm.createPdf(build(pl)).download(name);
    });
  }
  return { build: build, download: download, ensure: ensure };
})();
