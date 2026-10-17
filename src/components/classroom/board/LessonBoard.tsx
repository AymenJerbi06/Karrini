"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent,
  type Ref,
} from "react";
import { T, useI18n } from "@/components/I18n";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/components/SiteUi";
import { useLessonBoard } from "@/lib/board/useLessonBoard";
import {
  blankPage,
  bounds,
  hitElement,
  MAX_ELEMENTS,
  MAX_PAGES,
  moveElement,
  uuid,
  type BoardDocument,
  type BoardElement,
  type BoardPage,
  type Point,
} from "@/lib/board/model";
import type { BoardContext } from "@/lib/board/repository";
import { BOARD_ACCEPT } from "@/lib/board/files";
import { BoardSurface } from "./BoardSurface";
import { BoardIcon } from "./BoardIcon";
import { BoardExport } from "./BoardExport";
import { BoardDialog } from "./BoardDialog";
import { board as boardMessages } from "@/data/i18n/board";

type Tool = BoardElement["kind"] | "select" | "eraser";
export type LessonBoardHandle = {
  present: (value: boolean) => void;
  finish: () => Promise<void>;
};
const labels: Record<Tool, string> = {
  select: "Select",
  pen: "Pen",
  highlight: "Highlighter",
  eraser: "Eraser",
  text: "Text",
  line: "Line",
  arrow: "Arrow",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
};
const buttonClass =
  "flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-colors hover:bg-gray-100 disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

export function LessonBoard({
  context,
  title,
  apiRef,
  localOnly = false,
  review = false,
  presenting = true,
}: {
  context: BoardContext;
  title: string;
  apiRef?: Ref<LessonBoardHandle>;
  localOnly?: boolean;
  review?: boolean;
  presenting?: boolean;
}) {
  const { t } = useI18n();
  const board = useLessonBoard(context, title, true, localOnly);
  const { document: doc, update, assets } = board;
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#176b58");
  const [width, setWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<{
    undo: BoardDocument[];
    redo: BoardDocument[];
  }>({ undo: [], redo: [] });
  const [exporting, setExporting] = useState(false);
  const [confirm, setConfirm] = useState<"clear" | "delete" | null>(null);
  const [text, setText] = useState<{
    at: Point;
    value: string;
    id?: string;
    size: number;
  } | null>(null);
  // Remembered between texts. Large enough to stay readable when a phone shrinks the page.
  const [textSize, setTextSize] = useState(44);
  const [importing, setImporting] = useState<[number, number] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const latest = useRef(doc);
  useEffect(() => {
    latest.current = doc;
  }, [doc]);
  const gesture = useRef<{
    pointer: number;
    start: Point;
    original: BoardPage;
    id?: string;
    element?: BoardElement;
  } | null>(null);
  const page = doc?.pages.find((p) => p.id === doc.active);
  const index = doc?.pages.findIndex((p) => p.id === doc.active) ?? 0;
  const select = page?.elements.find((e) => e.id === selected);

  useImperativeHandle(
    apiRef,
    () => ({
      present: (value) => update((d) => ({ ...d, presenting: value })),
      finish: async () => {
        update((d) => ({ ...d, presenting: false }));
        await board.persist();
      },
    }),
    [update, board],
  );
  function checkpoint() {
    if (latest.current)
      setHistory((h) => ({
        undo: [...h.undo.slice(-29), latest.current!],
        redo: [],
      }));
  }
  function changePage(fn: (p: BoardPage) => BoardPage) {
    update((d) => ({
      ...d,
      pages: d.pages.map((p) => (p.id === d.active ? fn(p) : p)),
    }));
  }
  function undo() {
    const previous = history.undo.at(-1);
    if (!previous || !doc) return;
    setHistory({
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, doc],
    });
    update(() => previous);
    setSelected(null);
  }
  function redo() {
    const next = history.redo.at(-1);
    if (!next || !doc) return;
    setHistory({
      undo: [...history.undo, doc],
      redo: history.redo.slice(0, -1),
    });
    update(() => next);
    setSelected(null);
  }
  function removeSelection() {
    if (!selected) return;
    checkpoint();
    changePage((p) => ({
      ...p,
      elements: p.elements.filter((e) => e.id !== selected),
    }));
    setSelected(null);
  }
  function location(e: PointerEvent<SVGSVGElement>): Point {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (!matrix) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix);
    return [
      Math.max(0, Math.min(page!.width, p.x)),
      Math.max(0, Math.min(page!.height, p.y)),
    ];
  }
  function down(e: PointerEvent<SVGSVGElement>) {
    if (!page || e.button !== 0 || gesture.current || importing) return;
    const at = location(e);
    e.currentTarget.closest("section")?.focus({ preventScroll: true });
    if (tool === "text") {
      setText({ at, value: "", size: textSize });
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    checkpoint();
    if (tool === "select") {
      const hit = [...page.elements].reverse().find((el) => hitElement(el, at));
      setSelected(hit?.id ?? null);
      gesture.current = {
        pointer: e.pointerId,
        start: at,
        original: page,
        id: hit?.id,
      };
    } else if (tool === "eraser") {
      gesture.current = { pointer: e.pointerId, start: at, original: page };
      changePage((p) => ({
        ...p,
        elements: p.elements.filter((el) => !hitElement(el, at)),
      }));
    } else {
      if (page.elements.length >= MAX_ELEMENTS) {
        board.setError("This page is full. Add a new page to continue.");
        return;
      }
      const element: BoardElement = {
        id: uuid(),
        kind: tool,
        color,
        width: tool === "highlight" ? width * 5 : width,
        points: [at],
      };
      gesture.current = {
        pointer: e.pointerId,
        start: at,
        original: page,
        element,
      };
      changePage((p) => ({ ...p, elements: [...p.elements, element] }));
      setSelected(null);
    }
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointer) return;
    const at = location(e);
    e.preventDefault();
    if (tool === "select" && g.id)
      changePage((p) => ({
        ...p,
        elements: g.original.elements.map((el) =>
          el.id === g.id
            ? moveElement(el, at[0] - g.start[0], at[1] - g.start[1])
            : el,
        ),
      }));
    else if (tool === "eraser")
      changePage((p) => ({
        ...p,
        elements: p.elements.filter((el) => !hitElement(el, at)),
      }));
    else if (g.element) {
      const previous = g.element.points.at(-1)!;
      if (Math.hypot(previous[0] - at[0], previous[1] - at[1]) < 1.3) return;
      const oldPoints =
        g.element.points.length >= 4998
          ? g.element.points.filter((_, i) => i % 2 === 0)
          : g.element.points;
      const points =
        g.element.kind === "pen" || g.element.kind === "highlight"
          ? [...oldPoints, at]
          : [g.start, at];
      g.element = { ...g.element, points };
      changePage((p) => ({
        ...p,
        elements: p.elements.map((el) =>
          el.id === g.element!.id ? g.element! : el,
        ),
      }));
    }
  }
  function up(e: PointerEvent<SVGSVGElement>) {
    if (gesture.current?.pointer !== e.pointerId) return;
    move(e);
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  function addPage() {
    if (!doc || doc.pages.length >= MAX_PAGES) return;
    checkpoint();
    const p = blankPage();
    update((d) => ({ ...d, active: p.id, pages: [...d.pages, p] }));
    setSelected(null);
    setZoom(1);
  }
  function navigate(id: string) {
    update((d) => ({ ...d, active: id }));
    setSelected(null);
    setZoom(1);
  }
  async function importFile(file: File) {
    if (!doc) return;
    setImporting([0, 1]);
    board.setError("");
    try {
      const { importPages } = await import("@/lib/board/files");
      const replaceBlank =
        doc.pages.length === 1 &&
        !doc.pages[0].background &&
        !doc.pages[0].elements.length;
      const pages = await importPages(
        file,
        assets,
        MAX_PAGES - doc.pages.length + (replaceBlank ? 1 : 0),
        (n, total) => setImporting([n, total]),
      );
      checkpoint();
      update((d) => ({
        ...d,
        active: pages[0].id,
        pages: [...(replaceBlank ? [] : d.pages), ...pages],
      }));
      setSelected(null);
      setZoom(1);
    } catch (e) {
      board.setError(
        e instanceof Error && e.name === "PasswordException"
          ? "This PDF is password protected. Upload an unlocked copy."
          : e instanceof Error && e.message in boardMessages
            ? e.message
            : "This file could not be imported. Try another document.",
      );
    } finally {
      setImporting(null);
    }
  }
  // Flush when a previously hidden board becomes visible (camera/board switching).
  useEffect(() => {
    if (board.ready && doc && doc.presenting !== (!review && presenting))
      update((d) => ({ ...d, presenting: !review && presenting }));
  }, [board.ready, doc, review, presenting, update]);
  if (!board.ready || !doc || !page)
    return (
      <div
        className="grid h-full place-items-center rounded-xl bg-white text-gray-500"
        role="status"
      >
        <T>Loading lesson board…</T>
      </div>
    );
  const toolButton = (name: Tool) => (
    <button
      key={name}
      type="button"
      title={t(labels[name])}
      aria-label={t(labels[name])}
      aria-pressed={tool === name}
      onClick={() => {
        setTool(name);
        setSelected(null);
      }}
      className={`${buttonClass} ${tool === name ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300" : "text-gray-600"}`}
    >
      <BoardIcon name={name} className="h-5 w-5" />
    </button>
  );
  return (
    <section
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-gray-900"
      aria-label={t("Lesson board")}
      onKeyDown={(e) => {
        if (
          (e.target as HTMLElement).closest("input,textarea,select") ||
          exporting ||
          text ||
          confirm
        )
          return;
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          redo();
        }
        if (selected && (e.key === "Delete" || e.key === "Backspace")) {
          e.preventDefault();
          removeSelection();
        }
      }}
      tabIndex={-1}
    >
      <header className="flex min-h-14 shrink-0 items-center gap-3 border-b border-gray-100 px-3">
        <BoardIcon name="board" className="h-5 w-5 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-sm font-bold">
          <bdi>{doc.title}</bdi>
        </span>
        <span role="status" className="hidden text-xs text-gray-500 sm:block">
          {t(
            board.saveState === "saving"
              ? "Saving…"
              : board.saveState === "saved"
                ? "Saved"
                : "Saved on this device",
          )}
        </span>
        {!review && (
          <span
            title={t(
              board.connected ? "Board connected" : "Board reconnecting…",
            )}
            aria-label={t(
              board.connected ? "Board connected" : "Board reconnecting…",
            )}
            className={`h-2 w-2 shrink-0 rounded-full ${board.connected ? "bg-emerald-500" : "bg-amber-400"}`}
          />
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={!!importing}
          className={buttonClass}
          title={t("Import document")}
          aria-label={t("Import document")}
        >
          <BoardIcon name="import" className="h-5 w-5" />
          <span className="hidden md:inline">
            <T>Import</T>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setExporting(true)}
          disabled={!!importing}
          className={`${buttonClass} bg-brand text-white hover:bg-[#0e4b40]`}
        >
          <BoardIcon name="export" className="h-5 w-5" />
          <T>Save</T>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={BOARD_ACCEPT}
          className="hidden"
          aria-label={t("Import document")}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
      </header>
      <div
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-gray-100 p-2"
        role="toolbar"
        aria-label={t("Board tools")}
      >
        {(["select", "pen", "highlight", "eraser", "text"] as const).map(
          toolButton,
        )}
        <select
          aria-label={t("Shapes")}
          title={t("Shapes")}
          value={
            ["rectangle", "ellipse", "line", "arrow"].includes(tool) ? tool : ""
          }
          onChange={(e) => {
            setTool(e.target.value as Tool);
            setSelected(null);
          }}
          className="h-11 w-24 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-sm"
        >
          <option value="" disabled>
            {t("Shapes")}
          </option>
          {(["rectangle", "ellipse", "line", "arrow"] as const).map((s) => (
            <option key={s} value={s}>
              {t(labels[s])}
            </option>
          ))}
        </select>
        <span className="mx-1 h-7 border-s border-gray-200" />
        <label
          title={t("Ink color")}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
        >
          <input
            type="color"
            aria-label={t("Ink color")}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
        <select
          aria-label={t("Stroke width")}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="h-11 w-20 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-sm"
        >
          {[2, 3, 6, 10].map((n) => (
            <option key={n} value={n}>
              {n} px
            </option>
          ))}
        </select>
        <span className="mx-1 h-7 border-s border-gray-200" />
        <button
          type="button"
          onClick={undo}
          disabled={!history.undo.length}
          className={buttonClass}
          title={t("Undo (Ctrl+Z)")}
          aria-label={t("Undo (Ctrl+Z)")}
        >
          <BoardIcon name="undo" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!history.redo.length}
          className={buttonClass}
          title={t("Redo (Ctrl+Shift+Z)")}
          aria-label={t("Redo (Ctrl+Shift+Z)")}
        >
          <BoardIcon name="redo" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => (selected ? removeSelection() : setConfirm("clear"))}
          disabled={!page.elements.length}
          className={`${buttonClass} text-red-600`}
          title={t(selected ? "Delete selection" : "Clear annotations")}
          aria-label={t(selected ? "Delete selection" : "Clear annotations")}
        >
          <BoardIcon name="trash" className="h-5 w-5" />
        </button>
      </div>
      {board.error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900"
        >
          <span className="flex-1">{t(board.error)}</span>
          <button
            type="button"
            className="min-h-8 min-w-8"
            onClick={() => board.setError("")}
            aria-label={t("Dismiss")}
          >
            <BoardIcon name="close" className="m-auto h-4 w-4" />
          </button>
        </div>
      )}
      <BoardSurface
        page={page}
        assets={assets}
        zoom={zoom}
        svgRef={svg}
        editable={!importing}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onDoubleClick={() => {
          if (select?.kind === "text")
            setText({
              at: select.points[0],
              value: select.text ?? "",
              id: select.id,
              size: select.fontSize ?? 28,
            });
        }}
      >
        {select &&
          (() => {
            const b = bounds(select);
            return (
              <rect
                x={b.x - 8}
                y={b.y - 8}
                width={b.width + 16}
                height={b.height + 16}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            );
          })()}
      </BoardSurface>
      <footer className="flex min-h-14 shrink-0 items-center gap-1 border-t border-gray-200 px-2">
        <button
          type="button"
          disabled={index === 0 || !!importing}
          onClick={() => navigate(doc.pages[index - 1].id)}
          className={buttonClass}
          aria-label={t("Previous page")}
        >
          <BoardIcon name="left" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <select
          aria-label={t("Board pages")}
          value={page.id}
          disabled={!!importing}
          onChange={(e) => navigate(e.target.value)}
          className="h-11 min-w-0 rounded-lg bg-transparent px-2 text-sm"
        >
          {doc.pages.map((p, i) => (
            <option key={p.id} value={p.id}>
              {t("Page {n} of {total}", { n: i + 1, total: doc.pages.length })}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={index === doc.pages.length - 1 || !!importing}
          onClick={() => navigate(doc.pages[index + 1].id)}
          className={buttonClass}
          aria-label={t("Next page")}
        >
          <BoardIcon name="right" className="h-5 w-5 rtl:rotate-180" />
        </button>
        <button
          type="button"
          disabled={doc.pages.length >= MAX_PAGES || !!importing}
          onClick={addPage}
          className={`${buttonClass} text-brand`}
          title={t("New page")}
          aria-label={t("New page")}
        >
          <BoardIcon name="plus" className="h-5 w-5" />
          <span className="hidden sm:inline">
            <T>New page</T>
          </span>
        </button>
        <button
          type="button"
          disabled={doc.pages.length === 1 || !!importing}
          onClick={() => setConfirm("delete")}
          className={`${buttonClass} hidden text-gray-500 sm:flex`}
          title={t("Delete page")}
          aria-label={t("Delete page")}
        >
          <BoardIcon name="trash" className="h-4 w-4" />
        </button>
        <span className="flex-1" />
        <select
          aria-label={t("Zoom")}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-11 w-20 shrink-0 rounded-lg bg-transparent px-1 text-xs"
          dir="ltr"
        >
          {[1, 1.5, 2, 3].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? t("Fit") : `${n * 100}%`}
            </option>
          ))}
        </select>
      </footer>
      {importing && (
        <div
          className="absolute inset-0 z-20 grid place-content-center bg-white/95 p-8 text-center text-sm text-brand"
          role="status"
        >
          <progress
            max={importing[1]}
            value={importing[0]}
            className="mb-3 w-64"
          />
          {t("Importing page {n} of {total}…", {
            n: Math.min(importing[0] + 1, importing[1]),
            total: importing[1],
          })}
        </div>
      )}
      {text && (
        <BoardDialog label={t("Add text")} onClose={() => setText(null)}>
          <form
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.value.trim()) {
                checkpoint();
                const element: BoardElement = {
                  id: text.id ?? uuid(),
                  kind: "text",
                  color,
                  width,
                  points: [text.at],
                  text: text.value.trim(),
                  fontSize: text.size,
                };
                setTextSize(text.size);
                changePage((p) => ({
                  ...p,
                  elements: text.id
                    ? p.elements.map((el) => (el.id === text.id ? element : el))
                    : [...p.elements, element],
                }));
              }
              setText(null);
            }}
          >
            <label className="block font-semibold">
              <T>Add text</T>
              <textarea
                autoFocus
                required
                rows={4}
                maxLength={1000}
                dir="auto"
                value={text.value}
                onChange={(e) => setText({ ...text, value: e.target.value })}
                className={`${fieldClass} mt-3 w-full`}
              />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-gray-700">
                <T>Text size</T>
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(
                  [
                    [32, "Small"],
                    [44, "Medium"],
                    [64, "Large"],
                  ] as const
                ).map(([size, label]) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={text.size === size}
                    onClick={() => setText({ ...text, size })}
                    className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${text.size === size ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600"}`}
                  >
                    <T>{label}</T>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setText(null)}
              >
                <T>Cancel</T>
              </button>
              <button type="submit" className={primaryButton}>
                <T>Add text</T>
              </button>
            </div>
          </form>
        </BoardDialog>
      )}
      {confirm && (
        <BoardDialog
          label={t(
            confirm === "clear" ? "Clear annotations?" : "Delete this page?",
          )}
          onClose={() => setConfirm(null)}
          alert
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="font-bold">
              <T>
                {confirm === "clear"
                  ? "Clear annotations?"
                  : "Delete this page?"}
              </T>
            </h2>
            <p className="mt-3 text-sm leading-6 text-gray-500">
              <T>
                {confirm === "clear"
                  ? "Your imported document stays on the page. You can undo this action."
                  : "This removes the page and its annotations. You can undo this action."}
              </T>
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                autoFocus
                type="button"
                className={secondaryButton}
                onClick={() => setConfirm(null)}
              >
                <T>Cancel</T>
              </button>
              <button
                type="button"
                className={primaryButton}
                onClick={() => {
                  checkpoint();
                  if (confirm === "clear")
                    changePage((p) => ({ ...p, elements: [] }));
                  else
                    update((d) => {
                      const pages = d.pages.filter((p) => p.id !== d.active);
                      return {
                        ...d,
                        pages,
                        active: pages[Math.min(index, pages.length - 1)].id,
                      };
                    });
                  setSelected(null);
                  setConfirm(null);
                }}
              >
                <T>{confirm === "clear" ? "Clear" : "Delete"}</T>
              </button>
            </div>
          </div>
        </BoardDialog>
      )}
      {exporting && (
        <BoardExport
          board={doc}
          assets={assets}
          context={context}
          onClose={() => setExporting(false)}
          localOnly={localOnly}
          prepareShare={board.persist}
        />
      )}
    </section>
  );
}

export function StudentBoard({
  context,
  title,
  onPresenting,
  localOnly = false,
}: {
  context: BoardContext;
  title: string;
  onPresenting: (value: boolean) => void;
  localOnly?: boolean;
}) {
  const { t } = useI18n();
  const board = useLessonBoard(context, title, false, localOnly);
  const presenting = !!board.frame?.presenting;
  // Students can enlarge the page on small screens; it scrolls inside the board.
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    onPresenting(presenting);
  }, [presenting, onPresenting]);
  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-white text-gray-900"
      aria-label={t("Lesson board")}
    >
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-gray-100 px-4 text-sm">
        <span className="min-w-0 flex-1 truncate font-semibold">
          <bdi>{board.frame?.title ?? title}</bdi>
        </span>
        {board.frame && (
          <span className="text-xs text-gray-500">
            {t("Page {n} of {total}", {
              n: board.frame.pageNumber,
              total: board.frame.total,
            })}
          </span>
        )}
        <span className="hidden text-xs text-gray-500 sm:block">
          <T>
            {board.connected ? "Following your teacher" : "Board reconnecting…"}
          </T>
        </span>
        {board.frame && (
          <span className="flex shrink-0 items-center gap-1" dir="ltr">
            <button
              type="button"
              aria-label={t("Zoom out")}
              disabled={zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, z / 1.5))}
              className="h-9 w-9 rounded-lg text-lg font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              −
            </button>
            <button
              type="button"
              aria-label={t("Zoom in")}
              disabled={zoom >= 4}
              onClick={() => setZoom((z) => Math.min(4, z * 1.5))}
              className="h-9 w-9 rounded-lg text-lg font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-30"
            >
              +
            </button>
          </span>
        )}
      </header>
      {board.frame ? (
        <BoardSurface page={board.frame.page} assets={board.assets} zoom={zoom} />
      ) : (
        <div
          role="status"
          className="grid flex-1 place-content-center text-sm text-gray-500"
        >
          <T>{"Waiting for your teacher's board…"}</T>
        </div>
      )}
    </section>
  );
}
