import type { SVGProps } from "react";

// Playful decorative shapes (original drawings) used around section visuals.
type P = SVGProps<SVGSVGElement>;

export const Gear = (p: P) => (
  <svg viewBox="0 0 80 80" aria-hidden {...p}>
    <path
      fill="#2b7864"
      d="M34 2h12l2 10a29 29 0 0 1 7 3l9-6 8 8-6 9a29 29 0 0 1 3 7l10 2v12l-10 2a29 29 0 0 1-3 7l6 9-8 8-9-6a29 29 0 0 1-7 3l-2 10H34l-2-10a29 29 0 0 1-7-3l-9 6-8-8 6-9a29 29 0 0 1-3-7L1 46V34l10-2a29 29 0 0 1 3-7l-6-9 8-8 9 6a29 29 0 0 1 7-3l2-10Z"
    />
  </svg>
);

export const Ring = (p: P) => (
  <svg viewBox="0 0 100 100" aria-hidden {...p}>
    <path
      fill="none"
      stroke="#76a887"
      strokeWidth="22"
      strokeLinecap="butt"
      d="M14 58A37 37 0 1 1 84 70"
    />
  </svg>
);

export const Blob = ({ color = "#e9b665", ...p }: P & { color?: string }) => (
  <svg viewBox="0 0 80 80" aria-hidden {...p}>
    <path
      fill={color}
      d="M41 4c9 0 11 9 18 12s16 3 17 13-7 13-6 21 6 16-2 22-15-2-24 1-15 9-23 3-3-15-8-22S1 45 4 36s13-7 17-15S32 4 41 4Z"
    />
  </svg>
);

export const Cross = (p: P) => (
  <svg viewBox="0 0 80 80" aria-hidden {...p}>
    <path
      fill="#2b7864"
      d="M30 6c3-4 10-4 13 1l5 14 15-3c6-1 10 6 6 11l-10 11 9 12c3 5-1 11-7 10l-14-3-5 14c-3 5-10 5-13 0l-4-14-15 3c-6 1-10-6-6-11l10-12L4 28c-4-5 0-12 6-11l15 3 5-14Z"
      transform="rotate(12 40 40)"
    />
  </svg>
);

export const Hex = (p: P) => (
  <svg viewBox="0 0 80 80" aria-hidden {...p}>
    <path
      fill="#76a887"
      d="M40 3c4 0 6 3 10 4s9-1 12 2 1 8 3 12 6 6 6 10-4 6-5 10 2 9-1 12-8 1-12 3-5 7-9 7-6-4-10-5-9 1-12-2-1-8-3-12S7 41 7 37s4-6 5-10-2-9 1-12 8-1 12-3 11-9 15-9Z"
    />
  </svg>
);
