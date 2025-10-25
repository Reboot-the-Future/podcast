import type { Metadata } from "next";
import { Rozha_One, Poppins, Lora } from 'next/font/google';
import "./globals.css";
import siteSettings from "@/data/settings.json";

const rozhaOne = Rozha_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-rozha',
  display: 'swap',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});

const lora = Lora({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const siteName = "Reboot the Future";
const siteDescription =
  "Conversations that matter. Exploring the ideas that will shape tomorrow.";

// Collect social profile links for JSON-LD (filter out empty values)
const sameAs = [
  siteSettings.social_twitter,
  siteSettings.social_linkedin,
  siteSettings.social_instagram,
  siteSettings.social_youtube,
].filter((v): v is string => Boolean(v && v.trim().length > 0));

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s › Reboot the Future",
  },
  description: siteDescription,
  keywords: [
    "podcast",
    "future",
    "technology",
    "society",
    "innovation",
    "ideas",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/tab-icon.png" },
      { url: "/tab-icon.png", sizes: "16x16", type: "image/png" },
      { url: "/tab-icon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/tab-icon.png",
  },
  openGraph: {
    title: "Reboot The Future - Podcast",
    description: siteDescription,
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName,
    images: [
      {
        url: "/logo-dark.png",
        width: 1200,
        height: 630,
        alt: "Reboot The Future",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reboot The Future - Podcast",
    description: siteDescription,
    images: ["/logo-dark.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': "large",
      'max-video-preview': -1,
    },
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: "#0F1C1C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/tab-icon.png" type="image/png" />
        {/* Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: siteName,
              url: siteUrl,
              logo: new URL('/logo-dark.png', siteUrl).toString(),
              sameAs,
            }),
          }}
        />
        {/* Structured Data: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: siteName,
              url: siteUrl,
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* Structured Data: Podcast */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'PodcastSeries',
              name: 'Reboot The Future',
              url: siteUrl,
              description: siteDescription,
              publisher: {
                '@type': 'Organization',
                name: siteName,
                url: siteUrl,
              },
              sameAs,
            }),
          }}
        />
      </head>
      <body className={`${poppins.variable} ${lora.variable} ${rozhaOne.variable} font-poppins antialiased`}>{children}</body>
    </html>
  );
}