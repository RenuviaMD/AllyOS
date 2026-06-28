// AllyOS health helper — syntax-check a .js file or every inline <script> in an .html.
// Uses new Function() so it only PARSES (never runs) the code — browser-script semantics
// (top-level return/this ok) and CommonJS (require/exports) both parse fine. Prints
// "JSERR <file> [block N]: <msg>" lines and exits non-zero on any syntax error.
const fs = require("fs");
const file = process.argv[2];
let src;
try { src = fs.readFileSync(file, "utf8"); } catch (e) { console.log("JSERR " + file + ": cannot read — " + e.message); process.exit(1); }

let blocks = [];
if (/\.html?$/i.test(file)) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m; while ((m = re.exec(src))) blocks.push(m[1]);
} else {
  blocks = [src];
}
let errs = [];
blocks.forEach(function (s, i) {
  if (!s.trim()) return;
  try { new Function(s); } catch (e) { errs.push(file + " [block " + (i + 1) + "]: " + e.message); }
});
if (errs.length) { errs.forEach(function (e) { console.log("JSERR " + e); }); process.exit(1); }
process.exit(0);
