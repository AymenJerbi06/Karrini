import { T } from "@/components/I18n";
import { Logo } from "@/components/Logo";
import { Blob, Gear, Ring } from "@/components/shapes";
import { Laptop } from "@/components/mockups/Laptop";

const palettes = [
  { bg: "#e6eee5", skin: "#bc815c", hair: "#273d35", shirt: "#387c68" },
  { bg: "#f4e8d4", skin: "#dfac83", hair: "#654637", shirt: "#d5a354" },
  { bg: "#e0ebe9", skin: "#8d573e", hair: "#29362d", shirt: "#5b8a83" },
  { bg: "#efe8de", skin: "#d59b73", hair: "#4d382c", shirt: "#9b8063" },
];

/** Original, illustrative portraits; these do not represent real tutors. */
export function Portrait({ variant = 0 }: { variant?: number }) {
  const p = palettes[variant % palettes.length];
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <rect width="120" height="120" fill={p.bg} />
      <path d="M12 120c2-31 19-42 48-42s46 11 48 42" fill={p.shirt} />
      {variant % 2 === 1 && (
        <path d="M32 66V43c0-19 11-29 28-29s28 10 28 29v41H32Z" fill={p.hair} />
      )}
      <path d="M49 74h22v17c-6 8-16 8-22 0" fill={p.skin} />
      <ellipse cx="60" cy="52" rx="24" ry="29" fill={p.skin} />
      <path
        d={
          variant % 2 === 0
            ? "M35 50V39c0-18 13-25 26-25 18 0 26 11 25 30-12 0-20-7-26-12-6 10-15 15-25 18Z"
            : "M34 48c-1-24 12-35 28-34 16 1 27 15 25 36-9-2-16-12-20-22-7 12-17 18-33 20Z"
        }
        fill={p.hair}
      />
      <path
        d="M46 53h4m20 0h4"
        stroke="#293a31"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M54 68q6 5 12 0"
        fill="none"
        stroke="#774a38"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m46 88 14 13 14-13"
        fill="none"
        stroke="#fff"
        strokeOpacity=".65"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LessonPreview() {
  return (
    <div
      className="overflow-hidden rounded-lg bg-white shadow-[0_12px_25px_-8px_rgba(16,47,41,0.25)] ring-1 ring-gray-200"
      dir="ltr"
      aria-hidden="true"
    >
      <div className="flex h-9 items-center justify-between border-b border-gray-100 px-3">
        <Logo className="text-[10px] text-brand!" />
        <span className="text-[8px] text-gray-500">
          <T>Bac Mathematics</T>
        </span>
        <span className="flex gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-gray-200" />
          <i className="h-1.5 w-1.5 rounded-full bg-brand" />
        </span>
      </div>
      <div className="flex aspect-[1.95]">
        <div className="w-[17%] shrink-0 bg-gray-900">
          <div className="aspect-square">
            <Portrait />
          </div>
          <div className="aspect-square border-t-2 border-white">
            <Portrait variant={1} />
          </div>
        </div>
        <div className="relative flex-1 p-3">
          <div className="absolute inset-y-0 start-0 flex w-6 flex-col items-center gap-4 border-e border-gray-100 pt-4 text-[11px] text-gray-400">
            <span>↖</span>
            <span className="text-brand">✎</span>
            <span>□</span>
            <span>+</span>
          </div>
          <svg
            viewBox="0 0 400 245"
            className="ms-auto h-full w-[92%]"
            fill="none"
          >
            <path
              d="M35 179H375M52 217V40"
              stroke="#607b70"
              strokeWidth="1.5"
            />
            <path
              d="m369 175 6 4-6 4m-321-137 4-6 4 6"
              stroke="#607b70"
              strokeWidth="1.5"
            />
            <path
              d="M54 178C92 25 130 25 169 178S246 329 284 178 344 25 371 90"
              transform="translate(0 -20) scale(1 .82)"
              stroke="#d6a04d"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M112 45v134M112 45h200"
              stroke="#91a69b"
              strokeDasharray="4 5"
            />
            <circle cx="112" cy="45" r="5" fill="#176b58" />
            <circle cx="228" cy="211" r="5" fill="#176b58" />
            <text
              x="158"
              y="26"
              fill="#102f29"
              fontSize="14"
              fontFamily="sans-serif"
            >
              f(x) = sin(x)
            </text>
            <path
              d="M151 58q22-8 45-3m-21 7 21-7-19-6"
              stroke="#176b58"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <div className="flex h-7 items-center justify-center gap-3 border-t border-gray-100">
        {["◉", "♩", "▣"].map((icon) => (
          <span
            key={icon}
            className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-200 text-[8px] text-gray-500"
          >
            {icon}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProgressVisual() {
  return (
    <div
      className="relative mx-auto flex aspect-[1.35] max-w-[390px] items-center justify-center"
      aria-hidden="true"
      dir="ltr"
    >
      <Blob className="absolute top-5 left-16 h-11 w-11" />
      <Gear className="absolute bottom-10 left-6 h-16 w-16" />
      <Ring className="absolute top-16 right-5 h-20 w-20" />
      <svg viewBox="0 0 370 280" className="relative w-full" fill="none">
        <path
          d="M52 226H316M72 227V78"
          stroke="#c8d3c8"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="103" y="158" width="42" height="68" rx="5" fill="#b7d9c8" />
        <rect x="169" y="115" width="42" height="111" rx="5" fill="#76a887" />
        <rect x="235" y="66" width="42" height="160" rx="5" fill="#176b58" />
        <path
          d="m91 130 82-52 70-38m-27-1 28-1-9 26"
          stroke="#e9b665"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function VideoVisual() {
  return (
    <div className="relative mx-auto max-w-[460px]" aria-hidden="true">
      <Gear className="absolute -top-8 left-3 h-20 w-20" />
      <Ring className="absolute -top-6 -right-3 h-24 w-24" />
      <div className="relative">
        <Laptop>
          <div className="absolute inset-0 flex bg-gray-800" dir="ltr">
            <div className="w-1/5">
              <div className="aspect-square">
                <Portrait variant={1} />
              </div>
            </div>
            <div className="flex-1 p-3">
              <div className="h-full overflow-hidden bg-gray-50">
                <Portrait variant={0} />
              </div>
            </div>
          </div>
        </Laptop>
      </div>
      <Blob className="absolute -bottom-8 right-20 h-20 w-20" />
    </div>
  );
}

export function PriceVisual() {
  return (
    <div
      className="relative mx-auto flex aspect-[1.35] max-w-[370px] items-center justify-center"
      aria-hidden="true"
      dir="ltr"
    >
      <Ring className="absolute top-5 left-5 h-20 w-20 -rotate-45" />
      <Blob className="absolute bottom-7 left-20 h-16 w-16" />
      <Gear className="absolute right-3 top-20 h-12 w-12" />
      <svg viewBox="0 0 370 280" className="relative w-full">
        <text
          x="183"
          y="201"
          textAnchor="middle"
          fontSize="146"
          fontWeight="800"
          fontFamily="sans-serif"
          fill="#0e4b40"
        >
          DT
        </text>
        <text
          x="177"
          y="193"
          textAnchor="middle"
          fontSize="146"
          fontWeight="800"
          fontFamily="sans-serif"
          fill="#76a887"
          stroke="#176b58"
          strokeWidth="2"
        >
          DT
        </text>
        <path
          d="M300 193v41h-12l22 25 22-25h-12v-41ZM93 42v27H83l18 21 18-21h-10V42Z"
          fill="#b7d9c8"
          stroke="#76a887"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

export function PeopleVisual() {
  return (
    <div
      className="relative mx-auto grid max-w-[360px] grid-cols-2 items-center gap-5 p-3"
      aria-hidden="true"
    >
      <Gear className="absolute -top-3 -left-4 h-20 w-20" />
      <Blob className="absolute top-[44%] -right-3 h-20 w-20" />
      <Ring className="absolute -bottom-4 -left-4 h-20 w-20 rotate-90" />
      {[0, 2, 1, 3].map((i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-full border-2 border-gray-200 bg-white ${i === 0 ? "scale-110" : "scale-90"}`}
        >
          <Portrait variant={i} />
        </div>
      ))}
    </div>
  );
}
