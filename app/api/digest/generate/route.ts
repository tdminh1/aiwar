import { NextResponse } from "next/server";
import { generateWeeklyDigest } from "@/lib/digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional `week_start=YYYY-MM-DD` lets an operator manually (re)generate a
  // specific past week, e.g. for backfill. Without it, the current cron run
  // summarizes the most recently completed ISO week.
  const weekStart = new URL(request.url).searchParams.get("week_start");

  try {
    const result = await generateWeeklyDigest({ weekStart });
    const status = result.status === "failed" ? 500 : 200;
    return NextResponse.json({ ok: result.status !== "failed", result }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
