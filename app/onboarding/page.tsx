import{redirect}from"next/navigation";import{requireOnboarding,onboardingDestination}from"@/lib/onboarding";
export default async function Onboarding(){const{state}=await requireOnboarding();redirect(onboardingDestination(state));}
