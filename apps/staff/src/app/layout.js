import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import '@ephemeris/ui/product.css';
import './staff-ui.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata = {
  title: 'SpaceCat Astrotourism Staff - Observatorium Nasional',
  description: 'Portal staff SpaceCat Astrotourism: booking, jadwal, observasi, dan Sky Guide untuk staff internal.',
  icons: { icon: '/spacecat-astrotourism-logo.jpg' },
};

import ClientWrapper from '@/components/ClientWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`dark ${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
