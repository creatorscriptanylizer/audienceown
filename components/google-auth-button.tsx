import { signInWithGoogle } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/submit-button";

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.7h3.5c2-1.9 3.2-4.6 3.2-7.7Z"/>
    <path fill="#34A853" d="M12 22c2.9 0 5.3-1 7-2.6l-3.5-2.7c-1 .7-2.2 1-3.5 1-2.8 0-5.2-1.9-6-4.5H2.5V16A10 10 0 0 0 12 22Z"/>
    <path fill="#FBBC05" d="M6 13.2a6 6 0 0 1 0-3.9V6.6H2.5a10 10 0 0 0 0 9.4L6 13.2Z"/>
    <path fill="#EA4335" d="M12 5.3c1.6 0 3 .5 4.1 1.6l3.1-3A10 10 0 0 0 2.5 6.6L6 9.3c.8-2.4 3.2-4 6-4Z"/>
  </svg>;
}

export function GoogleAuthButton({ next = "/onboarding" }: { next?: string }) {
  return <form action={signInWithGoogle}>
    <input type="hidden" name="next" value={next} />
    <SubmitButton className="button google-button w-full" pendingText="Connecting to Google…">
      <GoogleIcon />Continue with Google
    </SubmitButton>
  </form>;
}
