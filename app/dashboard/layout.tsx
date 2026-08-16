import { DashboardShell } from "@/components/dashboard-shell";
import { requireCreator } from "@/lib/dal";
import { redirect } from "next/navigation";
import { getOnboardingState, onboardingDestination } from "@/lib/onboarding";
export default async function Layout({children}:{children:React.ReactNode}){const creator=await requireCreator();const state=await getOnboardingState(creator.id);if(state&&!state.completedAt)redirect(onboardingDestination(state));return <DashboardShell creator={creator}>{children}</DashboardShell>}
