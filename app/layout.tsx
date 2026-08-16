import type { Metadata } from "next";
import { appUrl } from "@/lib/app-url";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "AudienceOwn", template: "%s · AudienceOwn" },
  description: "One permanent creator page for every platform.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/audienceown-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/audienceown-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/audienceown-apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
