"use client";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type PointerEventHandler,
} from "react";
import {
  pathData,
  textDirection,
  type BoardElement,
  type BoardPage,
} from "@/lib/board/model";
import type { BoardAssets } from "@/lib/board/repository";
import { useI18n } from "@/components/I18n";

export const BoardMark = memo(function BoardMark({
  element: e,
}: {
  element: BoardElement;
}) {
  const [a, b = a] = e.points;
  const stroke = {
    stroke: e.color,
    strokeWidth: e.width,
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (e.kind === "text")
    return (
      <g
        fill={e.color}
        fontSize={e.fontSize ?? 28}
        style={{
          fontFamily:
            "var(--font-open-sans), var(--font-arabic), Arial, sans-serif",
        }}
      >
        {(e.text ?? "").split("\n").map((line, i) => (
          <text
            key={i}
            x={a[0]}
            y={a[1] + (e.fontSize ?? 28) * (i * 1.5 + 0.9)}
            direction={textDirection(line)}
            textAnchor={textDirection(line) === "rtl" ? "end" : "start"}
            unicodeBidi="plaintext"
          >
            {line}
          </text>
        ))}
      </g>
    );
  if (e.kind === "rectangle")
    return (
      <rect
        {...stroke}
        x={Math.min(a[0], b[0])}
        y={Math.min(a[1], b[1])}
        width={Math.abs(b[0] - a[0])}
        height={Math.abs(b[1] - a[1])}
      />
    );
  if (e.kind === "ellipse")
    return (
      <ellipse
        {...stroke}
        cx={(a[0] + b[0]) / 2}
        cy={(a[1] + b[1]) / 2}
        rx={Math.abs(b[0] - a[0]) / 2}
        ry={Math.abs(b[1] - a[1]) / 2}
      />
    );
  const points =
    e.points.length === 1
      ? [a, [a[0] + 0.1, a[1] + 0.1] as [number, number]]
      : e.points;
  if (e.kind === "arrow") {
    const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const length = Math.max(14, e.width * 4);
    return (
      <g {...stroke}>
        <path d={pathData(points)} />
        <path
          d={`M${b[0] - length * Math.cos(angle - 0.5)},${b[1] - length * Math.sin(angle - 0.5)} L${b[0]},${b[1]} L${b[0] - length * Math.cos(angle + 0.5)},${b[1] - length * Math.sin(angle + 0.5)}`}
        />
      </g>
    );
  }
  return (
    <path
      {...stroke}
      opacity={e.kind === "highlight" ? 0.28 : 1}
      d={pathData(points)}
    />
  );
});

export function BoardSurface({
  page,
  assets,
  zoom = 1,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  children,
  editable = false,
}: {
  page: BoardPage;
  assets: BoardAssets;
  zoom?: number;
  svgRef?: React.RefObject<SVGSVGElement | null>;
  onPointerDown?: PointerEventHandler<SVGSVGElement>;
  onPointerMove?: PointerEventHandler<SVGSVGElement>;
  onPointerUp?: PointerEventHandler<SVGSVGElement>;
  onDoubleClick?: React.MouseEventHandler<SVGSVGElement>;
  children?: React.ReactNode;
  editable?: boolean;
}) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 500 });
  const [background, setBackground] = useState<{
    id: string;
    url: string;
  } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!page.background) return;
    let active = true;
    let url: string | undefined;
    assets
      .get(page.background)
      .then((blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setBackground({ id: page.background!, url });
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [page.background, assets, retry]);
  const scale =
    Math.max(
      0.05,
      Math.min(
        (size.width - 32) / page.width,
        (size.height - 32) / page.height,
      ),
    ) * zoom;
  const waiting = !!page.background && background?.id !== page.background;
  return (
    <div
      ref={container}
      className="relative min-h-0 flex-1 overflow-auto bg-[#edf0ef]"
      dir="ltr"
    >
      {waiting ? (
        <div
          className="absolute inset-0 z-10 grid place-content-center bg-gray-100/95 p-6 text-center text-sm text-gray-600"
          role="status"
        >
          {error ? (
            <button
              type="button"
              className="min-h-11 rounded-lg border bg-white px-5"
              onClick={() => {
                setError(false);
                setRetry((n) => n + 1);
              }}
            >
              {t("Page unavailable. Retry")}
            </button>
          ) : (
            t("Loading page…")
          )}
        </div>
      ) : null}
      <div
        className="flex min-h-full min-w-full p-4"
        style={{
          width: Math.max(size.width, page.width * scale + 32),
          height: Math.max(size.height, page.height * scale + 32),
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${page.width} ${page.height}`}
          width={page.width * scale}
          height={page.height * scale}
          className="m-auto shrink-0 bg-white shadow-sm"
          style={{
            touchAction: editable ? "none" : "pan-x pan-y",
            cursor: editable ? "crosshair" : "default",
          }}
          role="img"
          aria-label={t("Lesson board page")}
          onPointerDown={waiting ? undefined : onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          {page.background && background?.id === page.background && (
            <image
              href={background.url}
              x="0"
              y="0"
              width={page.width}
              height={page.height}
              preserveAspectRatio="none"
            />
          )}
          {page.elements.map((e) => (
            <BoardMark key={e.id} element={e} />
          ))}
          {children}
        </svg>
      </div>
    </div>
  );
}
