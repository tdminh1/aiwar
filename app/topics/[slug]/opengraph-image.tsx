import { ImageResponse } from "next/og";
import { getTopicPageData } from "@/lib/articles";
import { SITE_NAME, compactText, slugify } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getTopicPageData(slug);
  const topic = data?.topic.name || slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
  const count = data?.articles.length || 0;

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
          <div style={{ color: "#777" }}>{count ? `${count} tracked updates` : slugify(topic)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, fontWeight: 800, maxWidth: 980 }}>{compactText(topic, 92)}</div>
          <div style={{ marginTop: 24, color: "#777", fontSize: 30 }}>Latest updates, timeline, and source articles.</div>
        </div>
        <div style={{ height: 10, width: 220, background: "#ff6719" }} />
      </div>
    ),
    size,
  );
}
