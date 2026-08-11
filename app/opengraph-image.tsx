import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
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
          padding: 72,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#ff6719", fontWeight: 700 }}>{SITE_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, lineHeight: 1.03, fontWeight: 800, maxWidth: 920 }}>{SITE_TAGLINE}</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#777" }}>Frontier AI lab news, research, safety, and product updates.</div>
        </div>
        <div style={{ height: 10, width: 220, background: "#ff6719" }} />
      </div>
    ),
    size,
  );
}
