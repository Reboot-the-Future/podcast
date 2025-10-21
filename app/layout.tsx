import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reboot The Future - Podcast",
  description: "Conversations that matter. Exploring the ideas that will shape tomorrow.",
  openGraph: {
    title: "Reboot The Future - Podcast",
    description: "Conversations that matter. Exploring the ideas that will shape tomorrow.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reboot The Future - Podcast",
    description: "Conversations that matter. Exploring the ideas that will shape tomorrow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-poppins antialiased">{children}</body>
    </html>
  );
}