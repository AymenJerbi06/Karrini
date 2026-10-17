import type { SVGProps } from "react";
const paths: Record<string, string> = {
  board: "M3 3h18v13H3z M12 16v5 M8 21h8",
  select: "m5 3 14 9-7 1-3 7z",
  pen: "m4 16-1 5 5-1L21 7l-4-4z M14 6l4 4",
  highlight: "m4 15 9-10 6 6-10 9H4z M2 22h14",
  eraser:
    "m3 14 9-10a2 2 0 0 1 3 0l6 6a2 2 0 0 1 0 3l-7 8H9z M8 9l10 10 M13 21h9",
  text: "M4 5h16 M12 5v16 M8 21h8",
  rectangle: "M4 5h16v14H4z",
  ellipse: "M21 12a9 7 0 1 1-18 0 9 7 0 1 1 18 0",
  line: "M4 20 20 4",
  arrow: "M4 20 20 4 M8 4h12v12",
  undo: "M9 4 4 9l5 5 M4 9h10a6 6 0 0 1 0 12h-4",
  redo: "m15 4 5 5-5 5 M20 9H10a6 6 0 0 0 0 12h4",
  trash: "M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7",
  plus: "M12 4v16 M4 12h16",
  import: "M12 16V3 M7 8l5-5 5 5 M3 15v6h18v-6",
  export: "M12 3v13 M7 11l5 5 5-5 M3 15v6h18v-6",
  left: "m15 5-7 7 7 7",
  right: "m9 5 7 7-7 7",
  close: "m6 6 12 12 M6 18 18 6",
};
export function BoardIcon({
  name,
  ...props
}: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.board} />
    </svg>
  );
}
