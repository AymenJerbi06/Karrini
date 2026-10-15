// Lists user-facing English strings in the given source folders that have no Arabic/French pair.
// Usage: node scripts/find-untranslated.cjs src/components/auth src/components/classroom …
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("exports", "require", code)(exports, (id) => load(path.join("src", id.replace(/^@\//, "")) + ".ts"));
  return exports;
}
const { messages } = load("src/lib/translations.ts");
const keys = new Set(Object.keys(messages).map((k) => k.toLowerCase()));

const looksLikeClasses = (s) =>
  s.split(/\s+/).every((tok) => /^[!a-z0-9:\-[\]\/._%&>()#,'"=*+]+$/.test(tok)) && /[-:[]/.test(s);
const ignore = (s) =>
  !/[A-Za-z]/.test(s) ||
  looksLikeClasses(s) ||
  /^(@|\/|\.|#|https?:|qarrini-|use |[a-z]+[A-Z])/.test(s) ||
  /^[a-z0-9-]+$/.test(s) || // ids, slugs, enum values
  /^(image|application|text)\//.test(s) ||
  /\.(pdf|png|jpe?g|webp|csv|svg|tsx?)$/i.test(s);

function collect(file, out) {
  const src = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node) => {
    let text = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      // Skip import paths and JSX className/key/href-like attributes.
      if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return;
      if (ts.isJsxAttribute(parent) && !["aria-label", "placeholder", "title", "alt", "label", "submitLabel"].includes(parent.name.getText())) return;
      text = node.text;
    } else if (ts.isJsxText(node)) {
      text = node.getText().replace(/\s+/g, " ").trim();
    }
    if (text) {
      const t = text.replace(/\s+/g, " ").trim();
      if (t && !ignore(t) && !keys.has(t.toLowerCase())) out.add(t);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

const files = [];
for (const target of process.argv.slice(2)) {
  const stat = fs.statSync(target);
  if (stat.isFile()) files.push(target);
  else
    for (const f of fs.readdirSync(target, { recursive: true }))
      if (/\.(tsx?)$/.test(f)) files.push(path.join(target, f));
}
const out = new Set();
files.forEach((f) => collect(f, out));
console.log(JSON.stringify([...out].sort(), null, 1));
console.error(`${out.size} strings without a translation in ${files.length} files.`);
