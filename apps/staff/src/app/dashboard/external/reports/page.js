'use client';

import { useLanguage } from '@/context/LanguageContext';

export default function ExternalReportsPage() {
  const { t } = useLanguage();
  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{t('reports_title')}</h1>
        <p>{t('reports_desc')}</p>
      </header>

      <div className="card">
        <div className="empty-state">
          <h3>{t('reports_unavailable')}</h3>
          <p>{t('reports_unavailable_desc')}</p>
        </div>
      </div>
    </div>
  );
}
