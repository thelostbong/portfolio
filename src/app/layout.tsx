import type { Metadata } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./globals.css";
import { profile } from "@/content";

const title = `${profile.name} | ${profile.title}`;
const shareDescription =
  "AI infrastructure and MLOps engineer in Germany. Production DevOps and cloud at Tata Consultancy Services, now computer vision and edge AI at TH Deggendorf.";
const preview = {
  url: "/og.jpg",
  width: 1200,
  height: 630,
  alt: `${profile.name}, ${profile.title}`,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nayeemuddin.de"),
  title,
  description: profile.summary,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: profile.name,
    title,
    description: shareDescription,
    locale: "en_US",
    images: [preview],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: shareDescription,
    images: [preview.url],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body>{children}</body>
    </html>
  );
}
