import type { Metadata } from 'next';

export const siteMetadata: Metadata = {
  title: {
    default: 'Leora - Financial Advisory Platform',
    template: '%s | Leora',
  },
  description:
    'Leora is a comprehensive financial advisory platform that streamlines client management, document handling, and regulatory compliance for financial advisors.',
  keywords: [
    'financial advisory',
    'client management',
    'regulatory compliance',
    'document management',
    'financial planning',
    'wealth management',
  ],
  authors: [{ name: 'Leora Team' }],
  creator: 'Leora',
  publisher: 'Leora',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://leora.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://leora.app',
    title: 'Leora - Financial Advisory Platform',
    description:
      'Comprehensive financial advisory platform for client management and regulatory compliance.',
    siteName: 'Leora',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Leora Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leora - Financial Advisory Platform',
    description:
      'Comprehensive financial advisory platform for client management and regulatory compliance.',
    images: ['/og-image.png'],
    creator: '@leora',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F7F3' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0B' },
  ],
};
