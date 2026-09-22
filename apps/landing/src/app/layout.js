import localFont from 'next/font/local';
import './club-faune-custom.css';
import './globals.css';
import './product.css';
import './landing-responsive.css';

const inter = localFont({
  src: './fonts/inter-latin-variable.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
});

const spaceGrotesk = localFont({
  src: './fonts/space-grotesk-latin-variable.woff2',
  variable: '--font-space-grotesk',
  display: 'swap',
  weight: '300 700',
});

const ogg = localFont({
  src: './fonts/Ogg-Regular.woff2',
  variable: '--font-ogg',
  display: 'swap',
});

const biotif = localFont({
  src: [
    { path: './fonts/Biotif-Light.woff2', weight: '300', style: 'normal' },
    { path: './fonts/Biotif-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Biotif-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Biotif-Bold.woff2', weight: '700', style: 'normal' },
    { path: './fonts/Biotif-Black.woff2', weight: '900', style: 'normal' },
  ],
  variable: '--font-biotif',
  display: 'swap',
});

export const metadata = {
  title: 'SpaceCat ASTROTOURISM | Luxury Astrotourism & Celestial Stargazing Experiences in the Maldives',
  description: 'Journey into the cosmos beside the ocean of stars. Exclusive guided stargazing experiences led by resident astronomers at luxury Maldives partner resorts.',
  icons: {
    icon: '/spacecat-astrotourism-logo.jpg',
    shortcut: '/spacecat-astrotourism-logo.jpg',
    apple: '/spacecat-astrotourism-logo.jpg',
  },
};

import Script from 'next/script';
import ClientWrapper from '@/components/ClientWrapper';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

const browserExtensionHydrationGuard = `
  (function () {
    var attribute = 'bis_skin_checked';
    var clean = function (root) {
      if (root && root.nodeType === 1 && root.hasAttribute && root.hasAttribute(attribute)) {
        root.removeAttribute(attribute);
      }
      if (root && root.querySelectorAll) {
        root.querySelectorAll('[' + attribute + ']').forEach(function (element) {
          element.removeAttribute(attribute);
        });
      }
    };

    clean(document.documentElement);
    var observer = new MutationObserver(function (records) {
      records.forEach(function (record) {
        clean(record.target);
        record.addedNodes.forEach(clean);
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attribute],
      childList: true,
      subtree: true
    });

    window.addEventListener('load', function () {
      setTimeout(function () {
        clean(document.documentElement);
        observer.disconnect();
      }, 3000);
    }, { once: true });
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${ogg.variable} ${biotif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          id="browser-extension-hydration-guard"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: browserExtensionHydrationGuard }}
        />
      </head>
      <body suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
