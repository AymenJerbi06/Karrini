const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync("src/lib/board/model.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const model = {};
new Function("exports", code)(model);
const doc = model.newBoard("Test");
assert.ok(model.validBoard(doc));
assert.equal(doc.presenting, false);
assert.equal(model.validBoard({ ...doc, pages: [] }), false);
assert.equal(
  model.validBoard({ ...doc, pages: [doc.pages[0], doc.pages[0]] }),
  false,
);
assert.equal(model.validBoard({ ...doc, active: model.uuid() }), false);
const stroke = {
  id: model.uuid(),
  kind: "pen",
  color: "#176b58",
  width: 3,
  points: [
    [10, 10],
    [100, 100],
  ],
};
assert.ok(model.validPage({ ...doc.pages[0], elements: [stroke] }));
assert.equal(
  model.validPage({
    ...doc.pages[0],
    background: "https://untrusted.test/asset.png",
  }),
  false,
);
assert.equal(
  model.validPage({
    ...doc.pages[0],
    elements: [{ ...stroke, points: [[Infinity, 0]] }],
  }),
  false,
);
assert.equal(
  model.validPage({
    ...doc.pages[0],
    elements: [{ ...stroke, color: "url(https://untrusted.test)" }],
  }),
  false,
);
assert.equal(model.hitElement(stroke, [50, 50]), true);
assert.equal(model.hitElement(stroke, [50, 90]), false);
const moved = model.moveElement(stroke, 20, -5);
assert.deepEqual(moved.points, [
  [30, 5],
  [120, 95],
]);
assert.deepEqual(stroke.points, [
  [10, 10],
  [100, 100],
]);
assert.equal(model.validFrame(model.frameOf(doc)), true);
assert.equal(model.validFrame({ ...model.frameOf(doc), page: null }), false);
const earlier = model.nextRevision();
assert.ok(model.nextRevision() > earlier);
assert.ok(model.nextRevision(earlier + 1000000) > earlier + 1000000);
assert.equal(model.textDirection("Bonjour · مرحبا"), "ltr");
assert.equal(model.textDirection("مرحبا · Bonjour"), "rtl");
console.log(
  "Passed board validation, geometry, immutable edits and frame validation.",
);

(async () => {
  const { validateOffice } =
    await import("../tools/board-converter/office.mjs");
  const JSZip = require("jszip");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", "<Types/>");
  zip.file("word/document.xml", "<document/>");
  const bytes = await zip.generateAsync({ type: "nodebuffer" });
  validateOffice(bytes, "docx");
  assert.throws(() => validateOffice(bytes, "pptx"));
  assert.throws(() => validateOffice(Buffer.from("not office"), "doc"));
  zip.file("word/vbaProject.bin", "macro");
  assert.throws(() => validateOffice(Buffer.from("PK"), "docx"));
  assert.throws(() => validateOffice(Buffer.alloc(21 * 1024 * 1024), "docx"));
  assert.throws(() =>
    validateOffice(bytes.subarray(0, bytes.length - 10), "docx"),
  );
  const macroBytes = await zip.generateAsync({ type: "nodebuffer" });
  assert.throws(() => validateOffice(macroBytes, "docx"));
  console.log(
    "Passed Office signature, type, truncated archive, size and embedded macro checks.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
