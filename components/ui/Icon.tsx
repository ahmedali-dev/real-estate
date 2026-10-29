import type { SVGProps } from "react";

const paths = {
  sidebarExpand: "M3 4h18v16H3zM8 4v16M12 9l3 3-3 3",
  sidebarCollapse: "M3 4h18v16H3zM8 4v16M16 9l-3 3 3 3",
  chevronDown: "m6 9 6 6 6-6",
  menu: "M4 6h16M4 12h16M4 18h16",
  copy: "M9 9h12v12H9zM15 9V3H3v12h6",
  tiktok: "M14 3v12.5a4.5 4.5 0 1 1-4-4.47V14a1.5 1.5 0 1 0 1 1.5V3h3ZM14 3c0 4 2 6 6 6V6c-2 0-3-1-3-3",
  share: "M18 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM6 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM18 16a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM9 10l6-4M9 14l6 4",
  whatsapp: "M21 11.5a9 9 0 0 1-13.3 8L3 21l1.5-4.5A9 9 0 1 1 21 11.5ZM8 7h2l1 3-1.5 1a9 9 0 0 0 3.5 3.5l1-1.5 3 1v2a1 1 0 0 1-1 1 10 10 0 0 1-9-9 1 1 0 0 1 1-1Z",
  close: "m6 6 12 12M18 6 6 18",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7",
  building: "M4 21V3h12v18M16 9h4v12M2 21h20M8 7h4M8 11h4M8 15h4M9 21v-3h2v3",
  land: "m3 8 7-4 11 4-3 12-11 1-4-13ZM10 4l2 8 9-4M12 12l-5 9",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  location: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  bed: "M3 18v3M21 18v3M3 12v6h18v-6H3ZM5 12V5h14v7M5 8h6v4M13 8h6v4",
  bath: "M3 12h18M5 12V5a2 2 0 0 1 4 0M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4M7 20v2M17 20v2",
  snow: "M12 2v20M3.34 7l17.32 10M3.34 17 20.66 7M9 4l3 3 3-3M9 20l3-3 3 3M3 10l4-1-1-4M18 19l-1-4 4-1M3 14l4 1-1 4M18 5l-1 4 4 1",
  money: "M3 5h18v14H3zM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 8h1M18 16h1",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  users: "M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a8 8 0 0 1 16 0v2M18 4a4 4 0 0 1 0 8M21 21v-2a8 8 0 0 0-3-6",
  phone: "M5 3h4l2 5-3 2a16 16 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z",
  image: "M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M17 7h.01",
  video: "M3 5h12v14H3zM15 9l6-3v12l-6-3",
  filter: "M4 4h16l-6 7v7l-4 2v-9Z",
  check: "m5 12 4 4L19 6",
  key: "M14 10a5 5 0 1 1 1-5l6 6-3 3-2-2-2 2-2-2",
  tag: "M3 3h8l10 10-8 8L3 11V3ZM7 7h.01",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4M12 14v3",
  calendar: "M3 5h18v16H3zM7 3v4M17 3v4M3 11h18",
  edit: "m15 3 6 6-12 12H3v-6L15 3ZM12 6l6 6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0ZM15 15l6 6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  clipboard: "M8 5H4v16h16V5h-4M8 3h8v4H8zM8 12h8M8 16h5",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = "h-5 w-5", ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`} {...props}><path d={paths[name]} /></svg>;
}
