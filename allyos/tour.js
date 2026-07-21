/* AllyOS guided-tour engine — activates only on ?tour=1.
   A page opts in by defining, before including this file:
     window.ALLYOS_TOUR_SEED  = function(){ ...fill sample data + run the generator... }
     window.ALLYOS_TOUR_STEPS = [ {intro:true,title,body} | {sel,title,body} | {cta:true,title,body} ]
     window.ALLYOS_TOUR_TITLE = "Men's Hormone Optimization"   // shown in the ribbon
   On-rails, sample-data, no full-feature access. Ends in "Request a live demo".            */
(function () {
  if (location.search.indexOf('tour=1') === -1) return;

  var TEAL = '#2ee6d6', GREEN = '#2bbf76', INK = '#eaf3f5', MUT = '#9fb4c6', LINE = '#28405c', BG = '#0b1626';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var steps = (window.ALLYOS_TOUR_STEPS || []).slice();
    if (!steps.length) return;

    // 1) seed the page with a realistic sample scenario + run its generator
    if (typeof window.ALLYOS_TOUR_SEED === 'function') {
      try { window.ALLYOS_TOUR_SEED(); } catch (e) { /* non-fatal: tour still runs */ }
    }

    // 2) watermark ribbon (top)
    var ribbon = document.createElement('div');
    ribbon.setAttribute('data-tour', 'ribbon');
    ribbon.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;gap:10px;'
      + 'background:#08131f;border-bottom:1px solid ' + TEAL + ';box-shadow:0 2px 14px rgba(0,0,0,.5);'
      + 'color:' + INK + ';font:600 12.5px/1 -apple-system,Segoe UI,Roboto,sans-serif;padding:10px 14px';
    ribbon.innerHTML = '<span style="color:' + TEAL + '">● GUIDED DEMO</span>'
      + '<span style="color:' + MUT + '">' + (window.ALLYOS_TOUR_TITLE || 'AllyOS') + ' · sample data · advisory only, not a prescription</span>'
      + '<a href="demo-center.html" style="margin-left:6px;color:' + MUT + ';text-decoration:underline">exit</a>';
    document.body.appendChild(ribbon);
    document.body.style.paddingTop = '40px';
    // push any sticky page nav below the ribbon so it doesn't slide under it
    var st = document.createElement('style');
    st.textContent = '.top{top:40px !important}';
    document.head.appendChild(st);

    // keep the visitor inside the guided tour — block any click that would navigate
    // to a login-walled app page (dashboard, chairside, login, etc.). Allow the tour's
    // own CTAs (book-demo), the exit link (demo-center), external, and in-page anchors.
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var oc = a.getAttribute('onclick') || '';
      if (/book-demo|demo-center/.test(href)) return;              // tour CTA + exit
      if (/tour|replay|showTour/i.test(oc)) return;                 // tour controls
      if ((href === '' || href === '#') && !oc) return;             // harmless anchor
      if (/^(https?:|mailto:|tel:)/i.test(href)) return;            // external
      // everything else would navigate / sign out to a login wall — stay in the tour
      e.preventDefault();
      e.stopImmediatePropagation();
    }, true);

    // 3) spotlight ring (follows the target element)
    var ring = document.createElement('div');
    ring.style.cssText = 'position:fixed;z-index:2147482000;pointer-events:none;border:2px solid ' + TEAL + ';border-radius:12px;'
      + 'box-shadow:0 0 0 4000px rgba(4,10,18,.62),0 0 22px rgba(46,230,214,.55);transition:all .32s cubic-bezier(.4,0,.2,1);opacity:0';
    document.body.appendChild(ring);

    // 4) caption dock (bottom-center)
    var dock = document.createElement('div');
    dock.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483001;width:min(540px,92vw);'
      + 'background:' + BG + ';border:1px solid ' + LINE + ';border-radius:16px;padding:17px 19px 15px;'
      + 'box-shadow:0 18px 50px rgba(0,0,0,.55);font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:' + INK;
    dock.innerHTML =
      '<div style="display:flex;align-items:center;gap:9px;margin-bottom:7px">'
        + '<span data-t="dot" style="width:7px;height:7px;border-radius:50%;background:' + TEAL + '"></span>'
        + '<span data-t="count" style="font:700 11px/1 ui-monospace,Menlo,monospace;color:' + MUT + ';letter-spacing:.05em"></span>'
        + '<span data-t="bar" style="flex:1;height:3px;border-radius:3px;background:#12233a;overflow:hidden"><i data-t="fill" style="display:block;height:100%;width:0;background:linear-gradient(90deg,' + TEAL + ',' + GREEN + ');transition:width .3s"></i></span>'
      + '</div>'
      + '<div data-t="title" style="font:750 16px/1.25 inherit;margin-bottom:5px"></div>'
      + '<div data-t="body" style="font:400 13.5px/1.55 inherit;color:' + MUT + '"></div>'
      + '<div data-t="cta" style="margin-top:12px;display:none"></div>'
      + '<div data-t="nav" style="display:flex;gap:9px;justify-content:space-between;align-items:center;margin-top:14px">'
        + '<button data-t="prev" style="background:transparent;border:1px solid ' + LINE + ';color:' + MUT + ';font:600 13px inherit;padding:8px 14px;border-radius:9px;cursor:pointer">‹ Back</button>'
        + '<button data-t="next" style="background:linear-gradient(120deg,' + TEAL + ',' + GREEN + ');border:0;color:#04121a;font:800 13px inherit;padding:9px 18px;border-radius:9px;cursor:pointer">Next ›</button>'
      + '</div>';
    document.body.appendChild(dock);

    function q(n) { return dock.querySelector('[data-t="' + n + '"]'); }
    var i = 0;

    function place(el) {
      var r = el.getBoundingClientRect();
      var pad = 8;
      ring.style.opacity = '1';
      ring.style.left = (r.left - pad) + 'px';
      ring.style.top = (r.top - pad) + 'px';
      ring.style.width = (r.width + pad * 2) + 'px';
      ring.style.height = (r.height + pad * 2) + 'px';
    }
    function reposition() {
      var s = steps[i]; if (!s || !s.sel) return;
      var el = document.querySelector(s.sel); if (el) place(el);
    }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    function render() {
      var s = steps[i];
      q('count').textContent = 'STEP ' + (i + 1) + ' / ' + steps.length;
      q('fill').style.width = Math.round(((i + 1) / steps.length) * 100) + '%';
      q('title').textContent = s.title || '';
      q('body').innerHTML = s.body || '';
      q('prev').style.visibility = i === 0 ? 'hidden' : 'visible';

      var cta = q('cta');
      if (s.cta) {
        cta.style.display = 'block';
        cta.innerHTML = '<a href="book-demo.html" style="display:block;text-align:center;background:linear-gradient(120deg,' + TEAL + ',' + GREEN + ');color:#04121a;font:800 14px inherit;padding:12px;border-radius:10px;text-decoration:none">📅 Request a live demo</a>';
        q('next').style.display = 'none';
      } else {
        cta.style.display = 'none';
        q('next').style.display = '';
        q('next').textContent = (i === steps.length - 1) ? 'Done' : 'Next ›';
      }

      if (s.sel) {
        var el = document.querySelector(s.sel);
        if (el) {
          // reveal collapsed <details> so the target is visible
          var d = el.closest('details'); if (d && !d.open) d.open = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { place(el); }, 340);
        } else { ring.style.opacity = '0'; }
      } else {
        ring.style.opacity = '0';
      }
    }

    q('next').onclick = function () { if (i < steps.length - 1) { i++; render(); } };
    q('prev').onclick = function () { if (i > 0) { i--; render(); } };
    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') q('next').click();
      if (e.key === 'ArrowLeft') q('prev').click();
    });

    render();
  });
})();
