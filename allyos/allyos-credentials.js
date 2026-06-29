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

  // the Medical Director of record — his real credentials travel on every signature.
  var MD_OF_RECORD = { name: "Armando Falcon", cred: "MD", npi: "1447295126", license: "ME 84789", role: "provider", status: "active" };
  function roster() {
    var r = [];
    try { r = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { r = []; }
    // backfill the MD-of-record's NPI + license on any existing Falcon/MD seat
    var hasPhysician = false;
    r.forEach(function (s) {
      var k = credClass(s.cred);
      if (k === "physician") hasPhysician = true;
      if (k === "physician" && /falcon/i.test(s.name || "")) {
        if (!s.name || /^falcon$/i.test(s.name)) s.name = MD_OF_RECORD.name;
        if (!s.npi) s.npi = MD_OF_RECORD.npi;
        if (!s.license && !s.state_license) s.license = MD_OF_RECORD.license;
      }
    });
    // ensure the MD-of-record is always available to sign (he's the physician of record)
    if (!hasPhysician) r.unshift(Object.assign({}, MD_OF_RECORD));
    return r;
  }

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
      .map(function (s) {
        var lic = s.license || s.state_license || "";
        var label = (s.name || "") + (s.cred ? ", " + s.cred : "") + (s.npi ? " · NPI " + s.npi : "") + (lic ? " · " + lic : "");
        return { name: s.name, cred: s.cred, npi: s.npi, license: lic, label: label };
      });
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
