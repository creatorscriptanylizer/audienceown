import { BarChart3, FileUser, House, LifeBuoy, Link2, MailPlus, Settings, Users } from "lucide-react";

export const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/dashboard/creator-page", label: "Creator Page", icon: FileUser },
  { href: "/dashboard/updates", label: "Updates", icon: MailPlus },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/platforms", label: "Platforms", icon: Link2 },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/emergency", label: "Emergency", icon: LifeBuoy },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;
