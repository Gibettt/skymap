'use client';

import { TELESCOPES } from '@/data/bookings';

export default function ExternalInstrumentsPage() {
  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">Instruments</h1>
        <p>Daftar teleskop yang tersedia di jaringan observatorium.</p>
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
