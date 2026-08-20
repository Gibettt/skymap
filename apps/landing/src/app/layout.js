import localFont from 'next/font/local';
import './globals.css';

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

export const metadata = {
  title: 'Beach Stargazing | Le Meridien Maldives',
  description: 'Premium guided stargazing, solar observation, celestial dining, and astronomy programmes at Le Meridien Maldives.',
};

import ClientWrapper from '@/components/ClientWrapper';

// Some browser security extensions inject this attribute into every div
// before React hydrates. Remove only that known extension-owned attribute so
// genuine application hydration mismatches remain visible during development.
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
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: browserExtensionHydrationGuard }} />
      </head>
      <body suppressHydrationWarning>
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
