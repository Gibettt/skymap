'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

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
  const { language, setLanguage, t } = useLanguage();
  const [emailNotif, setEmailNotif] = useState(true);
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setProfile(data?.user || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setToast(newLang === 'en' ? 'Language switched to English!' : 'Bahasa berhasil diubah ke Bahasa Indonesia!');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="fade-in-up stagger" style={{ maxWidth: 880 }}>
      <header className="page-header">
        <h1 className="page-title">{t('settings_title', 'Settings')}</h1>
        <p>{t('settings_subtitle', 'Kelola profil, preferensi bahasa, dan notifikasi Anda.')}</p>
      </header>

      {/* Language Selector Card */}
      <section className="card" style={{ marginBottom: '20px', border: '1px solid var(--border)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 16 }}>{t('settings_language_title', 'Bahasa Aplikasi (Language)')}</h2>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '4px 0 0' }}>
              {t('settings_language_desc', 'Pilih bahasa antarmuka aplikasi staf.')}
            </p>
          </div>
          <span style={{ fontSize: 18 }}>🌐</span>
        </div>
        <div className="card-body" style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Bahasa Indonesia Option */}
            <div
              onClick={() => handleLanguageChange('id')}
              style={{
                padding: '16px 18px',
                background: language === 'id' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-elevated)',
                border: language === 'id' ? '2px solid var(--primary, #7c3aed)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🇮🇩</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    Bahasa Indonesia
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    Default (ID)
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="app_language"
                checked={language === 'id'}
                onChange={() => handleLanguageChange('id')}
                style={{ width: 18, height: 18, accentColor: 'var(--primary, #7c3aed)', cursor: 'pointer' }}
              />
            </div>

            {/* English Option */}
            <div
              onClick={() => handleLanguageChange('en')}
              style={{
                padding: '16px 18px',
                background: language === 'en' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-elevated)',
                border: language === 'en' ? '2px solid var(--primary, #7c3aed)' : '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28 }}>🇬🇧</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                    English (US/UK)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    International (EN)
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="app_language"
                checked={language === 'en'}
                onChange={() => handleLanguageChange('en')}
                style={{ width: 18, height: 18, accentColor: 'var(--primary, #7c3aed)', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
            <em>* {language === 'en' ? 'Only application interface elements change. Data inputted by users remains untouched.' : 'Hanya teks antarmuka aplikasi yang berubah. Data yang sudah diinput tetap terjaga.'}</em>
          </div>
        </div>
      </section>

      {/* Profile Section */}
      <section className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">{t('settings_profile_title', 'Profil')}</h2>
        </div>
        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="input-group">
            <label className="input-label">{t('settings_name', 'Nama')}</label>
            <input className="input" value={profile?.name || ''} disabled />
          </div>
          <div className="input-group">
            <label className="input-label">{t('settings_institution', 'Institusi / Peran')}</label>
            <input
              className="input"
              value={profile?.resort_name || (profile?.role === 'internal' ? t('role_internal', 'Staff Internal') : 'Resort belum diset')}
              disabled
            />
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">{t('settings_notif_title', 'Notifikasi')}</h2>
        </div>
        <div className="card-body">
          <ToggleRow
            label={t('settings_notif_email_label', 'Notifikasi Email')}
            description={t('settings_notif_email_desc', 'Terima pemberitahuan status booking melalui email.')}
            checked={emailNotif}
            onChange={setEmailNotif}
          />
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}
