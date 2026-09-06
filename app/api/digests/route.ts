import { NextResponse } from "next/server";
import { getWeeklyDigestList } from "@/lib/digest";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";

// Backs the weekly journal side panel's list view (components/DigestPanel.tsx).
export async function GET() {
  if (!(await getAuthenticatedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digests = await getWeeklyDigestList();
  return NextResponse.json({ digests });
}
