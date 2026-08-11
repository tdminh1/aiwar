"use client";

import { useState } from "react";

export function SafeImage({
  src,
  alt = "",
  loading,
}: {
  src: string;
  alt?: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="image-fallback" role="img" aria-label={alt || "Image unavailable"}>AI WAR</span>;
  }

  return <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />;
}
