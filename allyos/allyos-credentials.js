/* ============================================================
   AllyOS — credentialing → signer authority (IV line)
   Reads the clinic's own roster (allyos_seats_v1, set at onboarding
   in admin-seats) and returns the signers ELIGIBLE for a given IV
   document. States who CAN sign — never "who can't".

   Signer authority (positive):
     • Standing order  → Medical Director (MD/DO)
     • GFE             → MD/DO or APP (NP/PA)
     • Infusion note   → MD/DO, APP, or RN
   The clinic credentials its own staff; AllyOS shows the eligible
   names and never decides who may perform a clinical act.
   ============================================================ */
(function () {
  var KEY = "allyos_seats_v1";

  function roster() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }

  // map a credential string to a tier
  function credClass(cred) {
    var c = (cred || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (/^(MD|DO)$/.test(c)) return "physician";
    if (/^(NP|APRN|ARNP|PA|PAC|APP)$/.test(c)) return "app";
    if (/^(RN|LPN)$/.test(c)) return "rn";
    return "other";
  }

  // who can sign each IV document (positive allow-lists)
  var ALLOW = {
    standing_order: ["physician"],
    gfe: ["physician", "app"],
    infusion_note: ["physician", "app", "rn"],
  };

  function signers(docType) {
    var allow = ALLOW[docType] || ["physician"];
    return roster()
      .filter(function (s) { return s.status !== "removed" && allow.indexOf(credClass(s.cred)) >= 0; })
      .map(function (s) { return { name: s.name, cred: s.cred, label: (s.name || "") + (s.cred ? ", " + s.cred : "") }; });
  }

  // <option> list for a <select>, filtered to eligible signers for docType
  function options(docType, selected) {
    var list = signers(docType);
    if (!list.length) return '<option value="">— credential a signer in Team Seats —</option>';
    var o = '<option value="">— select signer —</option>';
    list.forEach(function (s) {
      var v = s.label.replace(/"/g, "");
      o += '<option value="' + v + '"' + (selected === v ? " selected" : "") + ">" + v + "</option>";
    });
    return o;
  }

  window.AllyOSCred = {
    roster: roster, credClass: credClass, signers: signers, options: options,
    DOC: { STANDING_ORDER: "standing_order", GFE: "gfe", INFUSION_NOTE: "infusion_note" },
  };
})();
