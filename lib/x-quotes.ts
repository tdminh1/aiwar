import "server-only";

import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { X_QUOTE_HANDLES } from "@/lib/x-quotes-config";

const X_API_BASE = "https://api.x.com/2";
const FETCH_TIMEOUT_MS = 12_000;
const TWEETS_PER_HANDLE = 5;

type XApiUser = {
  id: string;
  username: string;
  name?: string;
  profile_image_url?: string;
};

type XApiTweet = {
  id: string;
  text: string;
  created_at?: string;
};

type XQuoteRow = {
  tweet_id: string;
  author_handle: string;
  author_name: string | null;
  author_avatar_url: string | null;
  text: string;
  tweet_url: string;
  posted_at: string | null;
  crawled_at: string;
};

export type XQuoteHandleSummary = {
  handle: string;
  status: "success" | "error";
  found: number;
  saved: number;
  error?: string;
};

// X's default profile image is a small "_normal" thumbnail — swap it for the
// 400x400 variant so the quote wall doesn't show a blurry avatar.
function higherResAvatar(url: string | undefined) {
  if (!url) return null;
  return url.replace(/_normal(?=\.[a-zA-Z]+$)/, "_400x400");
}

async function xApiFetch<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${X_API_BASE}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { title?: string; detail?: string })
    | null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.title || `X API request failed with status ${response.status}`);
  }
  if (!payload) {
    throw new Error("X API returned an empty response.");
  }

  return payload;
}

async function resolveUsers(token: string, handles: string[]) {
  const usernames = handles.join(",");
  const payload = await xApiFetch<{ data?: XApiUser[] }>(
    `/users/by?usernames=${encodeURIComponent(usernames)}&user.fields=profile_image_url,name`,
    token,
  );
  return payload.data ?? [];
}

async function fetchUserTweets(token: string, userId: string) {
  const payload = await xApiFetch<{ data?: XApiTweet[] }>(
    `/users/${userId}/tweets?max_results=${TWEETS_PER_HANDLE}&exclude=retweets,replies&tweet.fields=created_at`,
    token,
  );
  return payload.data ?? [];
}

/**
 * Crawls the latest original (non-retweet, non-reply) tweets for every
 * handle in lib/x-quotes-config.ts and upserts them into x_quotes. Each
 * handle is isolated — one failing or unresolvable handle does not affect
 * the others, matching lib/crawler.ts's per-source resilience.
 */
export async function runXQuotesCrawl() {
  if (!hasSupabaseServerEnv()) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("Missing X_BEARER_TOKEN.");
  }
  if (X_QUOTE_HANDLES.length === 0) {
    return { handles: [] as XQuoteHandleSummary[], found: 0, saved: 0 };
  }

  const supabase = createSupabaseServerClient();
  const users = await resolveUsers(token, X_QUOTE_HANDLES);
  const usersByHandle = new Map(users.map((user) => [user.username.toLowerCase(), user]));

  const summaries = await Promise.all(
    X_QUOTE_HANDLES.map(async (handle): Promise<XQuoteHandleSummary> => {
      const user = usersByHandle.get(handle.toLowerCase());
      if (!user) {
        return { handle, status: "error", found: 0, saved: 0, error: "Handle not found on X." };
      }

      try {
        const tweets = await fetchUserTweets(token, user.id);
        const rows: XQuoteRow[] = tweets.map((tweet) => ({
          tweet_id: tweet.id,
          author_handle: user.username,
          author_name: user.name ?? null,
          author_avatar_url: higherResAvatar(user.profile_image_url),
          text: tweet.text,
          tweet_url: `https://x.com/${user.username}/status/${tweet.id}`,
          posted_at: tweet.created_at ?? null,
          crawled_at: new Date().toISOString(),
        }));

        if (rows.length > 0) {
          const { error } = await supabase.from("x_quotes").upsert(rows, { onConflict: "tweet_id" });
          if (error) throw error;
        }

        return { handle, status: "success", found: rows.length, saved: rows.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { handle, status: "error", found: 0, saved: 0, error: message };
      }
    }),
  );

  return {
    handles: summaries,
    found: summaries.reduce((total, item) => total + item.found, 0),
    saved: summaries.reduce((total, item) => total + item.saved, 0),
  };
}
