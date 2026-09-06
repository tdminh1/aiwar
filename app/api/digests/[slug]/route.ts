import { NextResponse } from "next/server";
import { getWeeklyDigestPageData } from "@/lib/digest";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";

// Backs the weekly journal side panel's detail view (components/DigestPanel.tsx).
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await getAuthenticatedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const data = await getWeeklyDigestPageData(slug);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
