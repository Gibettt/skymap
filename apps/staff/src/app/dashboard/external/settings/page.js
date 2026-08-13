'use client';

import { useEffect, useState } from 'react';

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <h4>{label}</h4>
        {description && <p>{description}</p>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

export default function ExternalSettingsPage() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (alive) setProfile(data?.user || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p>Kelola profil dan preferensi notifikasi Anda.</p>
      </header>

      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Profil</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">Nama</label>
            <input className="input" value={profile?.name || ''} disabled />
          </div>
          <div className="input-group">
            <label className="input-label">Institusi</label>
            <input className="input" value={profile?.resort_name || (profile?.role === 'internal' ? 'Staff Internal' : 'Resort belum diset')} disabled />
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Notifikasi</h2>
        </div>
        <div className="card-body">
          <ToggleRow
            label="Notifikasi Email"
            description="Terima pemberitahuan status booking melalui email."
            checked={emailNotif}
            onChange={setEmailNotif}
          />
        </div>
      </section>
    </div>
  );
}
