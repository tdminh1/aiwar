import { unstable_noStore as noStore } from "next/cache";
import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import type { Article } from "@/lib/types";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 80;

function numberParam(url: URL, key: string, fallback: number) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export async function GET(request: Request) {
  noStore();

  if (!(await getAuthenticatedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const offset = numberParam(url, "offset", 0);
  const limit = Math.min(numberParam(url, "limit", DEFAULT_LIMIT), MAX_LIMIT);
  const from = offset;
  const to = offset + limit - 1;

  const supabase = createSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("articles")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const articles = (data ?? []) as Article[];

  return NextResponse.json({
    articles,
    total: count ?? offset + articles.length,
    nextOffset: offset + articles.length,
    hasMore: offset + articles.length < (count ?? 0),
  });
}
