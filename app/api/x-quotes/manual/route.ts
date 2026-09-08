import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import { addXQuoteFromUrl } from "@/lib/x-quotes";

// Session-gated add-by-URL for the "AI Voices on X" panel's UI form
// (components/FeedClient.tsx). Only signed-in users whose email is in
// ADMIN_EMAILS may add — everyone else can view the quote wall but not
// post to it. This is separate from POST /api/crawl-x-quotes, which uses
// the CRON_SECRET bearer token for operator/automation use instead of a
// user session.
export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Only an admin account can add tweets." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "Body must include a tweet url." }, { status: 400 });
  }

  try {
    const quote = await addXQuoteFromUrl(url);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
