export type Point = [number, number];
export type BoardElement = {
  id: string;
  kind:
    "pen" | "highlight" | "line" | "arrow" | "rectangle" | "ellipse" | "text";
  color: string;
  width: number;
  points: Point[];
  text?: string;
  fontSize?: number;
};
export type BoardPage = {
  id: string;
  width: number;
  height: number;
  background?: string;
  elements: BoardElement[];
};
export type BoardDocument = {
  version: 1;
  title: string;
  active: string;
  presenting: boolean;
  pages: BoardPage[];
  revision: number;
};
export const MAX_PAGES = 80;
export const MAX_ELEMENTS = 2000;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
export const uuid = () => crypto.randomUUID();
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
export function blankPage(): BoardPage {
  return { id: uuid(), width: 1280, height: 720, elements: [] };
}
let revision = 0;
export const nextRevision = (previous = 0) =>
  (revision = Math.max(Date.now() * 1000, revision + 1, previous + 1));
export function newBoard(title: string): BoardDocument {
  const page = blankPage();
  return {
    version: 1,
    title: title.slice(0, 120),
    active: page.id,
    presenting: false,
    pages: [page],
    revision: nextRevision(),
  };
}
export function validPage(input: unknown): input is BoardPage {
  if (!input || typeof input !== "object") return false;
  const p = input as BoardPage;
  return (
    isUuid(p.id) &&
    Number.isFinite(p.width) &&
    p.width >= 100 &&
    p.width <= 5000 &&
    Number.isFinite(p.height) &&
    p.height >= 100 &&
    p.height <= 5000 &&
    (!p.background || isUuid(p.background)) &&
    Array.isArray(p.elements) &&
    p.elements.length <= MAX_ELEMENTS &&
    p.elements.every(
      (e) =>
        e &&
        isUuid(e.id) &&
        [
          "pen",
          "highlight",
          "line",
          "arrow",
          "rectangle",
          "ellipse",
          "text",
        ].includes(e.kind) &&
        /^#[\da-f]{6}$/i.test(e.color) &&
        Number.isFinite(e.width) &&
        e.width > 0 &&
        e.width <= 60 &&
        Array.isArray(e.points) &&
        e.points.length > 0 &&
        e.points.length <= 5000 &&
        e.points.every(
          (point) =>
            Array.isArray(point) &&
            point.length === 2 &&
            point.every((n) => Number.isFinite(n) && Math.abs(n) <= 20000),
        ) &&
        (e.text === undefined ||
          (typeof e.text === "string" && e.text.length <= 3000)) &&
        (e.fontSize === undefined ||
          (Number.isFinite(e.fontSize) &&
            e.fontSize >= 8 &&
            e.fontSize <= 160)),
    )
  );
}
export function validBoard(input: unknown): input is BoardDocument {
  if (!input || typeof input !== "object") return false;
  const d = input as BoardDocument;
  return (
    d.version === 1 &&
    typeof d.title === "string" &&
    d.title.length <= 120 &&
    typeof d.presenting === "boolean" &&
    Number.isSafeInteger(d.revision) &&
    d.revision >= 0 &&
    Array.isArray(d.pages) &&
    d.pages.length > 0 &&
    d.pages.length <= MAX_PAGES &&
    d.pages.every(validPage) &&
    new Set(d.pages.map((p) => p.id)).size === d.pages.length &&
    d.pages.some((p) => p.id === d.active)
  );
}
export function moveElement(
  element: BoardElement,
  dx: number,
  dy: number,
): BoardElement {
  return {
    ...element,
    points: element.points.map(([x, y]) => [x + dx, y + dy]),
  };
}
export function bounds(e: BoardElement) {
  const xs = e.points.map((p) => p[0]);
  const ys = e.points.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width:
      e.kind === "text"
        ? Math.max(
            30,
            Math.max(...(e.text ?? "").split("\n").map((s) => s.length)) *
              (e.fontSize ?? 28) *
              0.65,
          )
        : Math.max(1, Math.max(...xs) - x),
    height:
      e.kind === "text"
        ? (e.fontSize ?? 28) * 1.5 * (e.text ?? "").split("\n").length
        : Math.max(1, Math.max(...ys) - y),
  };
}
export function hitElement(e: BoardElement, p: Point): boolean {
  const b = bounds(e);
  const pad = Math.max(10, e.width);
  if (
    p[0] < b.x - pad ||
    p[0] > b.x + b.width + pad ||
    p[1] < b.y - pad ||
    p[1] > b.y + b.height + pad
  )
    return false;
  if (e.kind === "text" || e.kind === "rectangle" || e.kind === "ellipse")
    return true;
  if (e.points.length === 1)
    return Math.hypot(p[0] - e.points[0][0], p[1] - e.points[0][1]) < pad;
  return e.points.slice(1).some((end, i) => {
    const start = e.points[i];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) /
          (dx * dx + dy * dy || 1),
      ),
    );
    return Math.hypot(p[0] - start[0] - t * dx, p[1] - start[1] - t * dy) < pad;
  });
}
export function pathData(points: Point[]) {
  return points
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}
export const textDirection = (text: string) =>
  /\p{Script=Arabic}/u.test(text.match(/\p{L}/u)?.[0] ?? "")
    ? ("rtl" as const)
    : ("ltr" as const);
export type BoardFrame = {
  version: 1;
  title: string;
  presenting: boolean;
  page: BoardPage;
  revision: number;
  pageNumber: number;
  total: number;
};
export const frameOf = (d: BoardDocument): BoardFrame => ({
  version: 1,
  title: d.title,
  presenting: d.presenting,
  page: d.pages.find((p) => p.id === d.active)!,
  revision: d.revision,
  pageNumber: d.pages.findIndex((p) => p.id === d.active) + 1,
  total: d.pages.length,
});
export function validFrame(f: unknown): f is BoardFrame {
  const x = f as BoardFrame;
  return (
    !!x &&
    x.version === 1 &&
    typeof x.title === "string" &&
    x.title.length <= 120 &&
    typeof x.presenting === "boolean" &&
    Number.isSafeInteger(x.revision) &&
    x.revision >= 0 &&
    Number.isInteger(x.total) &&
    x.total >= 1 &&
    x.total <= MAX_PAGES &&
    Number.isInteger(x.pageNumber) &&
    x.pageNumber >= 1 &&
    x.pageNumber <= x.total &&
    validPage(x.page)
  );
}
