import {
  Home,
  Calendar,
  Plus,
  Library,
  Layers,
  MapPin,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string | null;
  kind: "route" | "capture";
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: Home,
    href: "/circadium/dashboard",
    kind: "route",
  },
  {
    key: "calendar",
    label: "Calendar",
    icon: Calendar,
    href: "/circadium/calendar",
    kind: "route",
  },
  { key: "capture", label: "Capture", icon: Plus, href: null, kind: "capture" },
  {
    key: "library",
    label: "Library",
    icon: Library,
    href: "/circadium/library",
    kind: "route",
  },
  {
    key: "categories",
    label: "Categories",
    icon: Layers,
    href: "/circadium/areas",
    kind: "route",
  },
  {
    key: "places",
    label: "Places",
    icon: MapPin,
    href: "/circadium/places",
    kind: "route",
  },
];

export type MobileTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string | null;
};

export const MOBILE_TABS: MobileTab[] = [
  { key: "dashboard", label: "Dashboard", icon: Home, href: "/dashboard" },
  { key: "library", label: "Library", icon: Library, href: "/library" },
  { key: "capture", label: "Capture", icon: Plus, href: null },
  { key: "calendar", label: "Calendar", icon: Calendar, href: "/calendar" },
  { key: "more", label: "More", icon: MoreHorizontal, href: "/settings" },
];
