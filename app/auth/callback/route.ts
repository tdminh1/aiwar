import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth-utils";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(nextPath, url.origin));
  }

  return NextResponse.redirect(new URL("/login?error=confirmation_failed", url.origin));
}
