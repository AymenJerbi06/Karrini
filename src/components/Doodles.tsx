// Repeating school-doodle pattern (original line drawings) used behind page heroes.
export function Doodles({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden>
      <defs>
        <pattern
          id="karrini-doodles"
          width="220"
          height="220"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke="#28b661"
            strokeOpacity=".28"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* pencil */}
            <path d="M20 70 62 28l12 12-42 42-16 4Z M56 34l12 12" />
            {/* apple */}
            <path d="M150 40c-14-8-30 2-28 20 2 16 14 26 22 22 8 4 20-6 22-22 2-18-14-28-16-20Z M146 38c0-8 4-12 10-14" />
            {/* book */}
            <path d="M30 150h46v40H30Z M30 150c10-6 36-6 46 0 M40 165h26 M40 176h20" />
            {/* triangle ruler */}
            <path d="M130 200l60-60v60Z M175 185v-12 M162 192h-8" />
            {/* graduation cap */}
            <path d="M110 110l30-14 30 14-30 14Z M124 118v14c10 6 22 6 32 0v-14" />
            {/* squiggle arrow */}
            <path d="M190 60c10 10-10 20 0 30s-10 20 0 30 M184 112l6 10 8-8" />
            {/* small circle + cross */}
            <circle cx="96" cy="200" r="7" />
            <path d="M88 60l10 10M98 60 88 70" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#karrini-doodles)" />
    </svg>
  );
}
