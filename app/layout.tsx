import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Reboot the Future",
    template: "%s › Reboot the Future"
  },
  description: "Conversations that matter. Exploring the ideas that will shape tomorrow.",
  icons: {
    icon: [
      { url: '/tab-icon.png' },
      { url: '/tab-icon.png', sizes: '16x16', type: 'image/png' },
      { url: '/tab-icon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/tab-icon.png',
  },
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
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
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
        <link rel="icon" href="/tab-icon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-poppins antialiased">{children}</body>
    </html>
  );
}