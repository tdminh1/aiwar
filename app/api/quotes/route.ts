import { NextResponse } from "next/server";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth-server";
import type { ReaderQuote } from "@/lib/types";

const MAX_QUOTES = 20;
const QUOTE_SELECT = "id, name, text, profile_url, profile_platform, profile_handle, created_at";
const LEGACY_QUOTE_SELECT = "id, name, text, created_at";

type ProfilePlatform = "facebook" | "x" | "instagram";

const PLATFORM_HOSTS: Record<ProfilePlatform, string[]> = {
  facebook: ["facebook.com", "www.facebook.com", "fb.com", "m.facebook.com"],
  x: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
  instagram: ["instagram.com", "www.instagram.com"],
};

const RESERVED_PATHS = new Set([
  "about",
  "explore",
  "hashtag",
  "home",
  "i",
  "intent",
  "login",
  "marketplace",
  "messages",
  "people",
  "photo",
  "p",
  "reel",
  "reels",
  "search",
  "share",
  "stories",
  "watch",
]);

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 180) : "";
}

function isMissingProfileColumn(error: { message?: string }) {
  return /profile_(url|platform|handle)/i.test(error.message || "");
}

function withProfileFallback(data: unknown[] | null | undefined) {
  return (data ?? []).map((quote) => ({
    ...(quote as Record<string, unknown>),
    profile_url: null,
    profile_platform: null,
    profile_handle: null,
  })) as ReaderQuote[];
}

function platformFromHost(hostname: string): ProfilePlatform | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as [ProfilePlatform, string[]][]) {
    if (hosts.some((item) => item.replace(/^www\./, "") === host)) return platform;
  }

  return null;
}

function parseProfileUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid Facebook, X, or Instagram profile URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Enter a valid Facebook, X, or Instagram profile URL.");
  }

  const platform = platformFromHost(url.hostname);
  if (!platform) {
    throw new Error("Profile URL must be from Facebook, X, or Instagram.");
  }

  const handle = decodeURIComponent(url.pathname)
    .split("/")
    .filter(Boolean)
    .at(0)
    ?.replace(/^@/, "")
    .trim();

  if (!handle || RESERVED_PATHS.has(handle.toLowerCase()) || !/^[A-Za-z0-9._-]{1,32}$/.test(handle)) {
    throw new Error("Enter a direct profile URL with a valid username.");
  }

  url.protocol = "https:";
  url.hash = "";
  url.search = "";

  return {
    profile_url: url.toString(),
    profile_platform: platform,
    profile_handle: handle,
  };
}

export async function GET() {
  if (!(await getAuthenticatedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reader_quotes")
    .select(QUOTE_SELECT)
    .order("created_at", { ascending: false })
    .limit(MAX_QUOTES);

  if (error) {
    if (isMissingProfileColumn(error)) {
      const legacy = await supabase
        .from("reader_quotes")
        .select(LEGACY_QUOTE_SELECT)
        .order("created_at", { ascending: false })
        .limit(MAX_QUOTES);

      if (legacy.error) {
        return NextResponse.json({ error: legacy.error.message }, { status: 500 });
      }

      return NextResponse.json({ quotes: withProfileFallback(legacy.data) });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quotes: (data ?? []) as ReaderQuote[] });
}

export async function POST(request: Request) {
  if (!(await getAuthenticatedUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { profileUrl?: unknown; text?: unknown } | null;
  const text = cleanText(body?.text);

  let profile;
  try {
    profile = parseProfileUrl(body?.profileUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Quote text is required." }, { status: 400 });
  }

  if (!profile) {
    return NextResponse.json({ error: "Profile URL is required." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reader_quotes")
    .insert({ name: profile.profile_handle, text, ...profile })
    .select(QUOTE_SELECT)
    .single();

  if (error) {
    if (isMissingProfileColumn(error)) {
      return NextResponse.json(
        { error: "Profile quote fields are not migrated in Supabase yet." },
        { status: 500 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ quote: data as ReaderQuote }, { status: 201 });
}
