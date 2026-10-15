const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
// Load the project's pure TS dictionaries without adding a test runner or runtime dependency.
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("exports", "require", code)(exports, (id) =>
    load(path.join("src", id.replace(/^@\//, "")) + ".ts"),
  );
  return exports;
}
const { translate, messages } = load("src/lib/translations.ts");
const { localizedHref } = load("src/lib/i18n.ts");
for (const [key, values] of Object.entries(messages)) {
  assert.equal(values.length, 2, key);
  assert.ok(
    values.every((v) => typeof v === "string" && v.trim()),
    key,
  );
}
assert.equal(translate("Find a Teacher", "ar"), "اختار أستاذك");
assert.equal(translate("Find a Teacher", "fr"), "Trouver un professeur");
assert.equal(translate("0 DT", "ar"), "0 د.ت");
assert.equal(
  translate("73% of 30 graded answers", "fr"),
  "73% sur 30 réponses corrigées",
);
assert.equal(translate("  Class full  ", "fr"), "  Classe complète  ");
assert.equal(translate("(x − 2)(x − 3) = 0", "ar"), "(x − 2)(x − 3) = 0");
assert.equal(
  localizedHref("/register?teacher=sonia-kammoun", "fr"),
  "/fr/register?teacher=sonia-kammoun",
);
assert.equal(localizedHref("/ar/classroom", "ar"), "/ar/classroom");
assert.equal(localizedHref("https://example.com", "ar"), "https://example.com");
console.log(
  `Passed: ${Object.keys(messages).length} Arabic/French pairs, currency, numerical summaries, math and localized links.`,
);
