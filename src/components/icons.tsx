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

/* ---- Live classroom & workspace icons ---- */

export const MicIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
  </svg>
);

export const MicOffIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M15 9.3V4.5a3 3 0 0 0-5.9-.8M9 9v3.75a3 3 0 0 0 4.7 2.47M3 3l18 18" />
  </svg>
);

export const CameraIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

export const CameraOffIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.84 9.09a2.24 2.24 0 0 0 .66-1.59v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.62 0-1.18.25-1.59.66M3 3l18 18" />
  </svg>
);

export const ScreenIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M9 17.25v1.01a3 3 0 0 1-.88 2.12L7.5 21h9l-.62-.62A3 3 0 0 1 15 18.26v-1.01m5.25-13.5v10.5A2.25 2.25 0 0 1 18 16.5H6a2.25 2.25 0 0 1-2.25-2.25V3.75A2.25 2.25 0 0 1 6 1.5h12a2.25 2.25 0 0 1 2.25 2.25ZM12 12V6m0 0-2.25 2.25M12 6l2.25 2.25" />
  </svg>
);

export const HandIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M10.05 4.58c0-.65.53-1.18 1.18-1.18s1.18.53 1.18 1.18V11m-2.36-6.42v-.4c0-.65-.53-1.18-1.18-1.18s-1.18.53-1.18 1.18v8.36m4.72-7.24c0-.65.53-1.18 1.18-1.18s1.18.53 1.18 1.18V11m0-3.7c0-.65.53-1.18 1.18-1.18s1.18.53 1.18 1.18v6.85a6.5 6.5 0 0 1-6.5 6.5h-.9a6.5 6.5 0 0 1-5.4-2.88l-2.43-3.64a1.2 1.2 0 0 1 1.86-1.5l1.7 1.7" />
  </svg>
);

export const UploadIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.11 1.02.17m-1.02-.17-1.06 13.88a2.25 2.25 0 0 1-2.25 2.08H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.4m-12 .57c.34-.06.68-.12 1.02-.17m0 0a48.1 48.1 0 0 1 3.48-.4m7.5 0v-.92c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.92m7.5 0a48.67 48.67 0 0 0-7.5 0" />
  </svg>
);

export const PhoneIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

export const UsersIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M15 19.13a9.38 9.38 0 0 0 2.63.37 9.34 9.34 0 0 0 4.12-.95 4.13 4.13 0 0 0-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 0 1 8.62 21c-2.33 0-4.51-.64-6.37-1.77v-.1a6.38 6.38 0 0 1 11.96-3.08M12 6.38a3.38 3.38 0 1 1-6.75 0 3.38 3.38 0 0 1 6.75 0Zm8.25 2.25a2.63 2.63 0 1 1-5.25 0 2.63 2.63 0 0 1 5.25 0Z" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const BookIcon = (p: P) => (
  <svg {...stroke(p)}>
    <path d="M12 6.04A8.97 8.97 0 0 0 6 3.75c-1.05 0-2.06.18-3 .51v14.25A8.99 8.99 0 0 1 6 18c2.3 0 4.4.87 6 2.29m0-14.25a8.97 8.97 0 0 1 6-2.29c1.05 0 2.06.18 3 .51v14.25A8.99 8.99 0 0 0 18 18a8.97 8.97 0 0 0-6 2.29m0-14.25v14.25" />
  </svg>
);
