'use client';

import { AdminLanguageProvider } from '@/context/AdminLanguageContext';
import QueryProvider from '@/components/QueryProvider';

export default function ClientWrapper({ children }) {
  return (
    <QueryProvider>
      <AdminLanguageProvider>{children}</AdminLanguageProvider>
    </QueryProvider>
  );
}

