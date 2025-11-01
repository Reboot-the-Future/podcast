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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://podcast.rebootthefuture.org";
const siteName = "Let's Reboot the Future";
const siteDescription =
  "A weekly 15-minute podcast sharing inspiring stories of people leading with kindness, courage and care. For anyone who's ever been called naïve for believing in a fairer, more beautiful world, this podcast reminds you that change is possible and you're not alone.";

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
    template: "%s › Let's Reboot the Future",
  },
  description: siteDescription,
  keywords: [
    "podcast",
    "inspiration",
    "kindness",
    "leadership",
    "courage",
    "changemakers",
    "social impact",
    "resilience",
    "empathy",
    "purpose",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/tab-icon.png", type: "image/png" },
      { url: "/tab-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/tab-icon.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/tab-icon.png",
    apple: "/tab-icon.png",
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
        url: "/tab-icon.png",
        width: 512,
        height: 512,
        alt: "Reboot The Future",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reboot The Future - Podcast",
    description: siteDescription,
    images: ["/tab-icon.png"],
    site: "@futurereboot",
    creator: "@futurereboot",
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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0F1C1C",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Removed manual <link rel="icon"> — Next.js will emit it from metadata.icons */}
        {/* Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: siteName,
              url: siteUrl,
              logo: new URL('/tab-icon.png', siteUrl).toString(),
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
              image: new URL('/tab-icon.png', siteUrl).toString(),
              author: {
                '@type': 'Organization',
                name: siteName,
                url: siteUrl,
              },
              publisher: {
                '@type': 'Organization',
                name: siteName,
                url: siteUrl,
                logo: {
                  '@type': 'ImageObject',
                  url: new URL('/tab-icon.png', siteUrl).toString(),
                },
              },
              genre: ['Inspiration', 'Leadership', 'Social Impact'],
              keywords: 'podcast, inspiration, kindness, leadership, courage, changemakers, social impact',
              sameAs,
            }),
          }}
        />
      </head>
      <body className={`${poppins.variable} ${lora.variable} ${rozhaOne.variable} font-poppins antialiased`}>{children}</body>
    </html>
  );
}