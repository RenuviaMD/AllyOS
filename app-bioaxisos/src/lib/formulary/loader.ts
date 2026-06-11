import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { formularyFrontmatterSchema, type FormularyCard, type FormularyKind } from "./schema";

/**
 * Build-time importer for the formulary. Reads the markdown cards committed to
 * _research/formulary/, validates each against the Zod schema, and returns a
 * typed, sorted catalog. A malformed card throws (failing the build).
 *
 * The repo layout is: <root>/_research/formulary and <root>/app-bioaxisos.
 * Next runs with cwd = app-bioaxisos, so the formulary sits one level up.
 */
const FORMULARY_ROOT = resolve(process.cwd(), "..", "_research", "formulary");

const DIRS: Array<{ dir: string; kind: FormularyKind }> = [
  { dir: "_individuals", kind: "individual" },
  { dir: "_stacks", kind: "stack" },
];

function loadDir(dir: string, kind: FormularyKind): FormularyCard[] {
  const full = join(FORMULARY_ROOT, dir);
  const files = readdirSync(full).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const raw = readFileSync(join(full, file), "utf8");
    const { data, content } = matter(raw);
    const parsed = formularyFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new Error(`Invalid formulary card ${dir}/${file}: ${issues}`);
    }
    const expectedSlug = file.replace(/\.md$/, "");
    if (parsed.data.slug !== expectedSlug) {
      throw new Error(
        `Slug mismatch in ${dir}/${file}: frontmatter slug "${parsed.data.slug}" != filename`,
      );
    }
    return { ...parsed.data, kind, body: content.trim() };
  });
}

let _cache: FormularyCard[] | undefined;

export function loadFormulary(): FormularyCard[] {
  if (!_cache) {
    const cards = DIRS.flatMap(({ dir, kind }) => loadDir(dir, kind));
    const slugs = new Set<string>();
    for (const c of cards) {
      if (slugs.has(c.slug)) throw new Error(`Duplicate formulary slug: ${c.slug}`);
      slugs.add(c.slug);
    }
    _cache = cards.sort((a, b) => a.name.localeCompare(b.name));
  }
  return _cache;
}

export function getFormularyCard(slug: string): FormularyCard | undefined {
  return loadFormulary().find((c) => c.slug === slug);
}
