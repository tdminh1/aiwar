"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function FeedTopbar({ email }: { email: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError("");

    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut();
      if (error) throw error;
      router.replace("/");
      router.refresh();
    } catch {
      setSignOutError("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <header className="feed-topbar">
      <Link href="/feed"><img src="/assets/aiwar-logo-mark.png" alt="AI War" /></Link>
      <div>
        <span><i /> Intelligence feed</span>
        <small>{signOutError || email}</small>
        <button onClick={signOut} disabled={isSigningOut}>
          <LogOut size={13} /> {isSigningOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
