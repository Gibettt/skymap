import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata = {
  title: 'Ephemeris — Sistem Manajemen Observatorium Nasional',
  description: 'Platform booking dan manajemen observasi benda langit untuk Observatorium Nasional. Kelola jadwal, teleskop, dan laporan dari satu dashboard terpadu.',
  keywords: 'observatorium, booking teleskop, benda langit, astronomi, ephemeris',
  openGraph: {
    title: 'Ephemeris — Sistem Manajemen Observatorium Nasional',
    description: 'Platform booking dan manajemen observasi benda langit untuk Observatorium Nasional.',
    type: 'website',
  },
};

import ClientWrapper from '@/components/ClientWrapper';

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
