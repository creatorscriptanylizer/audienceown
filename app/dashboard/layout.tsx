import { DashboardShell } from "@/components/dashboard-shell";
import { requireCreator } from "@/lib/dal";
export default async function Layout({children}:{children:React.ReactNode}){const creator=await requireCreator(); return <DashboardShell creator={creator}>{children}</DashboardShell>}
