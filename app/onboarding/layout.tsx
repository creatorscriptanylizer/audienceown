import{Logo}from"@/components/logo";import{requireViewer}from"@/lib/dal";
export default async function OnboardingLayout({children}:{children:React.ReactNode}){await requireViewer();return <main className="onboarding-shell"><header className="onboarding-brand"><Logo/><span>Creator setup</span></header>{children}</main>}
