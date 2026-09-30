import {
  BarChart3,
  CreditCard,
  Globe,
  LayoutGrid,
  Link2,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface AppNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  
  index: string;
  
  group: "Workspace" | "Account";
}

export const APP_NAV: AppNavItem[] = [
  { label: "Overview", to: "/app", icon: LayoutGrid, index: "01", group: "Workspace" },
  { label: "Links", to: "/app/links", icon: Link2, index: "02", group: "Workspace" },
  { label: "QR Codes", to: "/app/qr", icon: QrCode, index: "03", group: "Workspace" },
  { label: "Analytics", to: "/app/analytics", icon: BarChart3, index: "04", group: "Workspace" },
  { label: "Domains", to: "/app/domains", icon: Globe, index: "05", group: "Workspace" },
  { label: "Billing", to: "/app/billing", icon: CreditCard, index: "06", group: "Account" },
  { label: "Settings", to: "/app/settings", icon: Settings, index: "07", group: "Account" },
];

/** Nav rows in rendering order, grouped by their section heading. */
export const APP_NAV_GROUPS: { group: AppNavItem["group"]; items: AppNavItem[] }[] =
  ["Workspace", "Account"].map((group) => ({
    group: group as AppNavItem["group"],
    items: APP_NAV.filter((n) => n.group === group),
  }));
