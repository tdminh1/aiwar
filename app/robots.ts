import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/feed", "/login", "/articles/", "/topics/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
