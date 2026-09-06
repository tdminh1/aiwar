import { ImageResponse } from "next/og";
import { getWeeklyDigestPageData } from "@/lib/digest";
import { formatDigestWeekRange } from "@/lib/digest-format";
import { SITE_NAME } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getWeeklyDigestPageData(slug);
  const weekRange = data ? formatDigestWeekRange(data.digest.week_start, data.digest.week_end) : "Weekly recap";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf6",
          color: "#2a2b2b",
          padding: 70,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
          <div style={{ color: "#ff6719", fontWeight: 800 }}>{SITE_NAME}</div>
          <div style={{ color: "#777" }}>Weekly AI Digest</div>
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.06, fontWeight: 800, maxWidth: 980 }}>{weekRange}</div>
        <div style={{ height: 10, width: 220, background: "#ff6719" }} />
      </div>
    ),
    size,
  );
}
