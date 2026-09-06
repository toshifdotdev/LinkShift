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
}

export const APP_NAV: AppNavItem[] = [
  { label: "Overview", to: "/app", icon: LayoutGrid, index: "01" },
  { label: "Links", to: "/app/links", icon: Link2, index: "02" },
  { label: "QR Codes", to: "/app/qr", icon: QrCode, index: "03" },
  { label: "Analytics", to: "/app/analytics", icon: BarChart3, index: "04" },
  { label: "Domains", to: "/app/domains", icon: Globe, index: "05" },
  { label: "Billing", to: "/app/billing", icon: CreditCard, index: "06" },
  { label: "Settings", to: "/app/settings", icon: Settings, index: "07" },
];
