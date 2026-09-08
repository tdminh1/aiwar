import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedClient } from "@/components/FeedClient";
import { FeedTopbar } from "@/components/FeedTopbar";
import { isAdminEmail } from "@/lib/admin";
import { getFeedData } from "@/lib/feed";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Intelligence feed",
  description: "Private live frontier AI intelligence feed.",
  robots: { index: false, follow: false },
};

export default async function FeedPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=/feed");

  const feedData = await getFeedData();

  return (
    <main className="feed-app">
      <FeedTopbar email={user.email || "Member"} />
      <FeedClient initialData={feedData} isAdmin={isAdminEmail(user.email)} />
    </main>
  );
}
