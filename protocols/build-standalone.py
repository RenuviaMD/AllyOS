#!/usr/bin/env python3
"""Inline protocols-data.js into library.html -> protocols-standalone.html
(single-file build for offline review / Netlify Drop)."""
import pathlib
HERE = pathlib.Path(__file__).resolve().parent
html = (HERE / "library.html").read_text(encoding="utf-8")
data = (HERE / "protocols-data.js").read_text(encoding="utf-8")
out = html.replace('<script src="protocols-data.js"></script>', "<script>\n" + data + "\n</script>")
(HERE / "protocols-standalone.html").write_text(out, encoding="utf-8")
print("Wrote protocols-standalone.html", len(out), "bytes")
