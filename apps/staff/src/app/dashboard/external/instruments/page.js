'use client';

import { TELESCOPES } from '@/data/bookings';
import { useLanguage } from '@/context/LanguageContext';

export default function ExternalInstrumentsPage() {
  const { t } = useLanguage();
  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{t('instruments_title')}</h1>
        <p>{t('instruments_desc')}</p>
      </header>

      <div className="grid-3">
        {TELESCOPES.map((name) => (
          <div className="card" key={name}>
            <div className="card-body">
              <div style={{ fontSize: '22px', marginBottom: '10px' }}>🔭</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
