'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function ExternalUsersPage() {
  const { t } = useLanguage();
  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{t('users_title')}</h1>
        <p>{t('users_desc')}</p>
      </header>

      <div className="card">
        <div className="empty-state">
          <h3>{t('users_unavailable')}</h3>
          <p>{t('users_unavailable_desc')}</p>
        </div>
      </div>
    </div>
  );
}
