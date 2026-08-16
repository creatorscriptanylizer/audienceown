import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AudienceOwn",
    short_name: "AudienceOwn",
    description: "A permanent creator connection across every platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/brand/audienceown-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/audienceown-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/audienceown-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
