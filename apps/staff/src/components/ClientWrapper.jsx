'use client';

import { LanguageProvider } from '@/context/LanguageContext';
import QueryProvider from '@/components/QueryProvider';
import StaffPresence from '@/components/StaffPresence';

export default function ClientWrapper({ children }) {
  return (
    <QueryProvider>
      <LanguageProvider>
        <StaffPresence />
        {children}
      </LanguageProvider>
    </QueryProvider>
  );
}
