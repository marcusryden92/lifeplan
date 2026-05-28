export type NavItem = {
  key: string;
  label: string;
  glyph: string;
  href: string | null;
  kind: "route" | "capture";
};

export const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "Today", glyph: "◐", href: "/today", kind: "route" },
  { key: "capture", label: "Capture", glyph: "⌘", href: null, kind: "capture" },
  { key: "library", label: "Library", glyph: "☷", href: "/library", kind: "route" },
  { key: "calendar", label: "Calendar", glyph: "▦", href: "/calendar", kind: "route" },
  { key: "life-areas", label: "Life Areas", glyph: "◉", href: "/life-areas", kind: "route" },
  { key: "places", label: "Places", glyph: "⌖", href: "/places", kind: "route" },
];

export const MOBILE_TABS = [
  { key: "today", label: "Today", glyph: "◐", href: "/today" },
  { key: "library", label: "Library", glyph: "☷", href: "/library" },
  { key: "capture", label: "Capture", glyph: "⌘", href: null },
  { key: "calendar", label: "Calendar", glyph: "▦", href: "/calendar" },
  { key: "more", label: "More", glyph: "⋯", href: "/settings" },
] as const;
