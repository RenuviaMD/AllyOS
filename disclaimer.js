// AllyOS — global legal footer (single source of truth).
// Include on every page, before </body>:  <script src="../disclaimer.js"></script>
// (All current pages live one level deep, so ../ resolves to repo root.)
(function () {
  var html =
    '<footer class="allyos-legal" style="background:#102a30;color:#9fb4b8;font-size:.72rem;line-height:1.55;padding:22px;margin-top:32px">' +
      '<div style="max-width:1040px;margin:0 auto">' +
        '<b style="color:#dfeae8">For licensed healthcare professional use only.</b> ' +
        'AllyOS provides educational clinical decision-support and software for licensed providers. ' +
        'It is <b>not medical or legal advice, not prescribing authorization, and does not create a ' +
        'medical-director, supervisory, or physician-patient relationship</b> with RenuviaMD&reg; or ' +
        'Armando A. Falcon, MD. <b>Clinical decisions remain the sole responsibility of the licensed ' +
        'practitioner.</b> AI responses (Ally) are decision-support only, may be incomplete or in error, ' +
        'and must be independently verified. Peptides and compounds referenced are ' +
        '<b>not FDA-approved drugs unless otherwise noted</b>; evidence quality varies (Grade A&ndash;D). ' +
        '<b>AllyOS does not sell, supply, compound, or distribute peptides or any drug.</b> ' +
        'AllyOS collects no protected health information; patient data stays on the provider’s device, ' +
        'and AllyOS is not a HIPAA business associate. Any clinical use must comply with all applicable ' +
        '<b>federal and state laws, medical-board regulations, and scope-of-practice requirements.</b> ' +
        '<a href="../terms.html" style="color:#ffd98a">Terms of Service &amp; Privacy</a> ' +
        '&middot; &copy; 2026 RenuviaMD&reg; &middot; AllyOS.' +
      '</div>' +
    '</footer>';
  function inject() { document.body.insertAdjacentHTML('beforeend', html); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
