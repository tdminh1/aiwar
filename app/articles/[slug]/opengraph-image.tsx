import { ImageResponse } from "next/og";
import { getArticlePageData } from "@/lib/articles";
import { compactText, SITE_NAME } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getArticlePageData(slug);
  const title = data?.article.title || SITE_NAME;
  const source = data?.article.source_domain || data?.article.author || "Frontier AI update";

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
          <div style={{ color: "#777" }}>{source}</div>
        </div>
        <div style={{ fontSize: 68, lineHeight: 1.06, fontWeight: 800, maxWidth: 980 }}>{compactText(title, 110)}</div>
        <div style={{ height: 10, width: 220, background: "#ff6719" }} />
      </div>
    ),
    size,
  );
}
