import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to access the private AI War intelligence feed.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
