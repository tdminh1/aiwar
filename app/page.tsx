import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";
import { absoluteUrl, organizationJsonLd, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Frontier AI intelligence, without the noise",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function Home() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
      description: SITE_DESCRIPTION,
    },
    organizationJsonLd(),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <LandingPage />
    </>
  );
}
