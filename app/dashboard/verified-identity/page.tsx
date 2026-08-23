import { redirect } from "next/navigation";

export default function VerifiedIdentityCompatibilityPage() {
  redirect("/dashboard/authenticity");
}
