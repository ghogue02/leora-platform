import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Leora',
    template: '%s | Leora',
  },
  description: 'Clarity you can act on.',
  keywords: ['beverage alcohol', 'distributor', 'sales intelligence', 'order management'],
  authors: [{ name: 'Leora' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://leora.app',
    siteName: 'Leora',
    title: 'Leora',
    description: 'Clarity you can act on.',
    images: [
      {
        url: '/social/og_leora_light.png',
        width: 1200,
        height: 630,
        alt: 'Leora',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leora',
    description: 'Clarity you can act on.',
    images: ['/social/og_leora_light.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/icons/favicon-512.png',
    apple: '/icons/favicon-512.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
