import { BadgeCheck, FileUser, House, Link2, MailPlus, Users } from "lucide-react";

export const dashboardLinks = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/dashboard/creator-page", label: "Creator Page", icon: FileUser },
  { href: "/dashboard/updates", label: "Updates", icon: MailPlus },
  { href: "/dashboard/audience", label: "Audience", icon: Users },
  { href: "/dashboard/platforms", label: "Platforms", icon: Link2 },
  { href: "/dashboard/authenticity", label: "Verified Identity", icon: BadgeCheck },
] as const;
