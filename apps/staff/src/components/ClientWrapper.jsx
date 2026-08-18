'use client';

import { LanguageProvider } from '@/context/LanguageContext';
import QueryProvider from '@/components/QueryProvider';

export default function ClientWrapper({ children }) {
  return (
    <QueryProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </QueryProvider>
  );
}

