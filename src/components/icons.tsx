import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const stroke = (props: P) => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  ...props,
});

export const StarIcon = (p: P) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...p}>
    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 0 0 .95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 0 0-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 0 0-1.18 0l-2.8 2.03c-.78.57-1.83-.2-1.54-1.12l1.07-3.29a1 1 0 0 0-.36-1.12L2.98 8.72c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 0 0 .95-.69l1.07-3.29Z" />
  </svg>
);

export const StarOutlineIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.38a.56.56 0 0 1-.84.61l-4.73-2.88a.56.56 0 0 0-.59 0L7 20.54a.56.56 0 0 1-.84-.61l1.28-5.38a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35l2.13-5.11Z" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

export const TrendIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M2.25 18 9 11.25l4.3 4.3a11.95 11.95 0 0 1 5.81-5.52l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.94" />
  </svg>
);

export const ChevronDownIcon = (p: P) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...p}>
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
      clipRule="evenodd"
    />
  </svg>
);

export const ChevronRightIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);

export const SearchIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z" />
  </svg>
);

export const ChatBubbleIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M8.63 12a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0Zm0 0H8.25m4.13 0a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0Zm0 0H12m4.13 0a.38.38 0 1 1-.75 0 .38.38 0 0 1 .75 0Zm0 0h-.38M2.25 12.76c0 1.6 1.12 2.99 2.7 3.22 1.09.16 2.19.28 3.3.37V21l4.18-4.17a1.14 1.14 0 0 1 .78-.33 48.1 48.1 0 0 0 5.83-.5c1.58-.23 2.71-1.62 2.71-3.22V6.74c0-1.6-1.13-2.99-2.71-3.22A48.4 48.4 0 0 0 12 3c-2.39 0-4.73.17-7.02.52-1.58.23-2.73 1.62-2.73 3.22v6.02Z" />
  </svg>
);

export const VideoIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

export const RewindIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M21 16.81c0 .86-.93 1.4-1.68.98l-7.11-4.06a1.13 1.13 0 0 1 0-1.96l7.11-4.06c.75-.43 1.68.11 1.68.98v8.12ZM11.25 16.81c0 .86-.93 1.4-1.68.98l-7.11-4.06a1.13 1.13 0 0 1 0-1.96l7.11-4.06c.75-.43 1.68.11 1.68.98v8.12Z" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export const ArrowRightIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

export const CheckCircleIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const MailIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.24a2.25 2.25 0 0 1-1.07 1.92l-7.5 4.61a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.92v-.24" />
  </svg>
);

export const ArrowUpIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 2, ...p })}>
    <path d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const ChatSolidIcon = (p: P) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden {...p}>
    <path d="M3.43 2.52A41.3 41.3 0 0 1 10 2c2.24 0 4.44.18 6.57.52 1.58.26 2.68 1.64 2.68 3.2v5.16c0 1.56-1.1 2.94-2.68 3.2-1.38.22-2.8.37-4.24.45a.75.75 0 0 0-.5.22l-2.8 2.8A.75.75 0 0 1 7.75 17v-2.54a.75.75 0 0 0-.67-.75 41.4 41.4 0 0 1-3.65-.42C1.85 13.03.75 11.65.75 10.09V5.72c0-1.56 1.1-2.94 2.68-3.2Z" />
  </svg>
);

export const FacebookIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);

export const InstagramIcon = (p: P) => (
  <svg {...stroke({ strokeWidth: 1.8, ...p })}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const XIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2Z" />
  </svg>
);
