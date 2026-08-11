import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your AI War account.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?error=reset_link_invalid");

  return <ResetPasswordForm email={user.email || "your account"} />;
}
