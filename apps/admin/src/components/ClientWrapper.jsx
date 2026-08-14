'use client';

import { AdminLanguageProvider } from '@/context/AdminLanguageContext';

export default function ClientWrapper({ children }) {
  return <AdminLanguageProvider>{children}</AdminLanguageProvider>;
}
