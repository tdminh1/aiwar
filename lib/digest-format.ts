// Pure date formatting, no Supabase/OpenRouter access — deliberately free of
// "server-only" so it can be imported from both server pages
// (app/digest/**) and client components (components/DigestPanel.tsx).

export function formatDigestWeekRange(weekStart: string, weekEnd: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(`${weekEnd}T00:00:00.000Z`);
  const yearSuffix = start.getUTCFullYear() !== new Date().getUTCFullYear() ? `, ${start.getUTCFullYear()}` : "";
  return `${formatter.format(start)} – ${formatter.format(end)}${yearSuffix}`;
}
