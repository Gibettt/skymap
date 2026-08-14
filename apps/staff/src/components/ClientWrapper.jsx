'use client';

import { LanguageProvider } from '@/context/LanguageContext';

export default function ClientWrapper({ children }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
