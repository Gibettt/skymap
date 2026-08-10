'use client';

import { useState, useEffect } from 'react';
import { STATION_DATA } from '@/data/stations';

/* ── Toast Component ── */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          style={{ cursor: 'pointer' }}
          onClick={() => onDismiss(t.id)}
        >
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── Toggle Row Component ── */
function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div className="toggle-info">
        <h4>{label}</h4>
        {description && <p>{description}</p>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderLeft: '4px solid var(--accent)', paddingLeft: 14,
      }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PengaturanPage() {
  /* ── Toast state ── */
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  /* ── Umum settings ── */
  const [generalSettings, setGeneralSettings] = useState({
    systemName:  'Ephemeris Observatory Management System',
    timezone:    'Asia/Jakarta',
    language:    'id',
    adminEmail:  'admin@ephemeris.id',
    maxSessions: '50',
    dataRetention: '365',
  });

  /* ── Notifikasi toggles ── */
  const [notifSettings, setNotifSettings] = useState({
    emailAlert:    true,
    smsCritical:   false,
    dailyReport:   true,
    autoBackup:    true,
    weatherAlert:  true,
    maintenanceReminder: false,
  });

  /* ── Keamanan settings ── */
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: '60',
    autoLogout:     '120',
    twoFactor:      false,
    loginAttempts:  '5',
    passwordExpiry: '90',
    auditLog:       true,
  });

  /* ── Station states (online/offline + seeing override) ── */
  const [stationStates, setStationStates] = useState(() =>
    STATION_DATA.map(s => ({
      ...s,
      online:     s.status === 'online',
      seeingEdit: s.seeing,
      maintenance: false,
    }))
  );

  const toggleStation = (idx, field) => {
    setStationStates(prev => prev.map((s, i) => i === idx ? { ...s, [field]: !s[field] } : s));
  };

  const updateStationSeeing = (idx, val) => {
    setStationStates(prev => prev.map((s, i) => i === idx ? { ...s, seeingEdit: val } : s));
  };

  /* ── Save handlers ── */
  const saveGeneral = () => {
    addToast('Pengaturan umum berhasil disimpan.', 'success');
  };

  const saveNotif = () => {
    addToast('Pengaturan notifikasi diperbarui.', 'success');
  };

  const saveStations = () => {
    addToast('Konfigurasi stasiun berhasil disimpan.', 'success');
  };

  const saveSecurity = () => {
    if (parseInt(securitySettings.sessionTimeout) < 5) {
      addToast('Waktu sesi minimum adalah 5 menit.', 'error');
      return;
    }
    addToast('Pengaturan keamanan diperbarui.', 'success');
  };

  const handleResetAll = () => {
    addToast('Semua pengaturan telah direset ke default.', 'info');
  };

  const updateGeneral = (key, val) => setGeneralSettings(prev => ({ ...prev, [key]: val }));
  const updateSecurity = (key, val) => setSecuritySettings(prev => ({ ...prev, [key]: val }));

  /* online count */
  const onlineCount = stationStates.filter(s => s.online).length;

  return (
    <div className="page-content fade-in-up">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* ── Page Title ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
          Admin / Pengaturan
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
            Pengaturan Sistem
          </h1>
          <button className="btn btn-secondary btn-sm" onClick={handleResetAll}>
            ↺ Reset ke Default
          </button>
        </div>
      </div>

      {/* ── System Status Bar ── */}
      <div className="kpi-grid stagger" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
        <div className="kpi-card">
          <div className="kpi-label">Stasiun Online</div>
          <div className="kpi-value" style={{ fontSize: 36, color: 'var(--emerald)' }}>{onlineCount}</div>
          <div className="kpi-note" style={{ color: 'var(--emerald)' }}>dari {STATION_DATA.length} stasiun</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Notifikasi Aktif</div>
          <div className="kpi-value" style={{ fontSize: 36 }}>
            {Object.values(notifSettings).filter(Boolean).length}
          </div>
          <div className="kpi-note">dari {Object.keys(notifSettings).length} kanal</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Sesi Login</div>
          <div className="kpi-value" style={{ fontSize: 36 }}>{securitySettings.sessionTimeout}&apos;</div>
          <div className="kpi-note">batas waktu aktif</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">2FA</div>
          <div className="kpi-value" style={{ fontSize: 36, color: securitySettings.twoFactor ? 'var(--emerald)' : 'var(--text-dim)' }}>
            {securitySettings.twoFactor ? 'ON' : 'OFF'}
          </div>
          <div className="kpi-note">{securitySettings.twoFactor ? 'keamanan tinggi' : 'belum diaktifkan'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* ══════════════════════════════════════════
            SECTION 1 — UMUM
        ══════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">⚙ Pengaturan Umum</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Konfigurasi dasar sistem</span>
          </div>
          <div className="card-body">
            <SectionHeader
              icon="🌐"
              title="Identitas & Lokalisasi"
              subtitle="Informasi utama sistem dan preferensi regional"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Nama Sistem</label>
                <input
                  className="input"
                  type="text"
                  value={generalSettings.systemName}
                  onChange={e => updateGeneral('systemName', e.target.value)}
                  placeholder="Nama sistem observatorium"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Zona Waktu</label>
                <select className="input" value={generalSettings.timezone} onChange={e => updateGeneral('timezone', e.target.value)}>
                  <option value="Asia/Jakarta">Asia/Jakarta (WIB, UTC+7)</option>
                  <option value="Asia/Makassar">Asia/Makassar (WITA, UTC+8)</option>
                  <option value="Asia/Jayapura">Asia/Jayapura (WIT, UTC+9)</option>
                  <option value="UTC">UTC (Universal)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Pacific/Honolulu">Pacific/Honolulu (HST)</option>
                  <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Bahasa Antarmuka</label>
                <select className="input" value={generalSettings.language} onChange={e => updateGeneral('language', e.target.value)}>
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Email Administrator</label>
                <input
                  className="input"
                  type="email"
                  value={generalSettings.adminEmail}
                  onChange={e => updateGeneral('adminEmail', e.target.value)}
                  placeholder="admin@domain.com"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Maks. Sesi Bersamaan</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={200}
                  value={generalSettings.maxSessions}
                  onChange={e => updateGeneral('maxSessions', e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Retensi Data (hari)</label>
                <input
                  className="input"
                  type="number"
                  min={30}
                  max={3650}
                  value={generalSettings.dataRetention}
                  onChange={e => updateGeneral('dataRetention', e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => addToast('Perubahan dibatalkan.', 'info')}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={saveGeneral}>
                💾 Simpan Pengaturan Umum
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2 — NOTIFIKASI
        ══════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔔 Notifikasi</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {Object.values(notifSettings).filter(Boolean).length} dari {Object.keys(notifSettings).length} aktif
            </span>
          </div>
          <div className="card-body">
            <SectionHeader
              icon="📬"
              title="Kanal Pemberitahuan"
              subtitle="Atur metode notifikasi untuk peristiwa sistem dan pengamatan"
            />

            <ToggleRow
              label="Email Peringatan"
              description="Kirim email saat ada peringatan kritis atau kegagalan sistem"
              checked={notifSettings.emailAlert}
              onChange={v => setNotifSettings(p => ({ ...p, emailAlert: v }))}
            />
            <ToggleRow
              label="SMS Kritis"
              description="Notifikasi SMS untuk kejadian kritis yang membutuhkan tindakan segera"
              checked={notifSettings.smsCritical}
              onChange={v => setNotifSettings(p => ({ ...p, smsCritical: v }))}
            />
            <ToggleRow
              label="Laporan Harian Otomatis"
              description="Kirim ringkasan aktivitas harian ke email administrator setiap pukul 06:00 WIB"
              checked={notifSettings.dailyReport}
              onChange={v => setNotifSettings(p => ({ ...p, dailyReport: v }))}
            />
            <ToggleRow
              label="Backup Otomatis"
              description="Buat cadangan data setiap 24 jam dan simpan ke penyimpanan awan"
              checked={notifSettings.autoBackup}
              onChange={v => setNotifSettings(p => ({ ...p, autoBackup: v }))}
            />
            <ToggleRow
              label="Peringatan Cuaca"
              description="Notifikasi jika kondisi cuaca di stasiun tidak memungkinkan pengamatan"
              checked={notifSettings.weatherAlert}
              onChange={v => setNotifSettings(p => ({ ...p, weatherAlert: v }))}
            />
            <ToggleRow
              label="Pengingat Pemeliharaan"
              description="Ingatkan tim teknis saat jadwal perawatan teleskop mendekat"
              checked={notifSettings.maintenanceReminder}
              onChange={v => setNotifSettings(p => ({ ...p, maintenanceReminder: v }))}
            />

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setNotifSettings({ emailAlert: false, smsCritical: false, dailyReport: false, autoBackup: false, weatherAlert: false, maintenanceReminder: false })}>
                Nonaktifkan Semua
              </button>
              <button className="btn btn-primary" onClick={saveNotif}>
                💾 Simpan Notifikasi
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 3 — STASIUN
        ══════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔭 Konfigurasi Stasiun</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>{onlineCount}</span> / {STATION_DATA.length} online
              </span>
            </div>
          </div>
          <div className="card-body">
            <SectionHeader
              icon="🗺"
              title="Status &amp; Parameter Stasiun"
              subtitle="Kelola ketersediaan dan parameter operasional setiap stasiun observatorium"
            />

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Stasiun</th>
                    <th>Kode</th>
                    <th>Koordinat</th>
                    <th>Seeing (″)</th>
                    <th>Pemeliharaan</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Online/Offline</th>
                  </tr>
                </thead>
                <tbody>
                  {stationStates.map((s, idx) => (
                    <tr key={s.short}>
                      <td className="name-cell" style={{ minWidth: 180 }}>
                        <div>{s.name}</div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: 12,
                          background: 'var(--bg-elevated)',
                          padding: '3px 8px',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                        }}>
                          {s.short}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {s.latitude} / {s.longitude}
                      </td>
                      <td style={{ minWidth: 90 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input
                            className="input"
                            type="text"
                            value={s.seeingEdit}
                            onChange={e => updateStationSeeing(idx, e.target.value)}
                            style={{ width: 70, padding: '5px 8px', fontSize: 12 }}
                          />
                        </div>
                      </td>
                      <td>
                        <label className="toggle-switch" style={{ width: 40, height: 22 }}>
                          <input
                            type="checkbox"
                            checked={s.maintenance}
                            onChange={() => toggleStation(idx, 'maintenance')}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          border: '1px solid',
                          borderColor: s.maintenance ? 'var(--amber)' : s.online ? 'var(--emerald)' : 'var(--border)',
                          color: s.maintenance ? 'var(--amber)' : s.online ? 'var(--emerald)' : 'var(--text-dim)',
                          background: s.maintenance ? 'var(--amber-muted)' : s.online ? 'var(--emerald-muted)' : 'var(--bg-elevated)',
                        }}>
                          {s.maintenance ? 'Pemeliharaan' : s.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={s.online}
                            onChange={() => toggleStation(idx, 'online')}
                          />
                          <span className="toggle-slider" />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Seeing legend */}
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              fontSize: 12,
              color: 'var(--text-muted)',
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Skala Seeing:</span>
              <span style={{ color: 'var(--emerald)' }}>≤ 0.7″ Sangat Baik</span>
              <span style={{ color: 'var(--cyan)' }}>0.8–1.0″ Baik</span>
              <span style={{ color: 'var(--amber)' }}>1.1–1.5″ Sedang</span>
              <span style={{ color: 'var(--accent)' }}>&gt; 1.5″ Buruk</span>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => addToast('Tes koneksi stasiun dimulai…', 'info')}>
                Tes Koneksi
              </button>
              <button className="btn btn-primary" onClick={saveStations}>
                💾 Simpan Konfigurasi Stasiun
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 4 — KEAMANAN
        ══════════════════════════════════════════ */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔒 Keamanan</span>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              padding: '3px 10px',
              background: securitySettings.twoFactor ? 'var(--emerald-muted)' : 'var(--amber-muted)',
              color: securitySettings.twoFactor ? 'var(--emerald)' : 'var(--amber)',
              border: '1px solid',
              borderColor: securitySettings.twoFactor ? 'var(--emerald)' : 'var(--amber)',
              textTransform: 'uppercase',
            }}>
              {securitySettings.twoFactor ? '🛡 2FA Aktif' : '⚠ 2FA Nonaktif'}
            </span>
          </div>
          <div className="card-body">
            <SectionHeader
              icon="🛡"
              title="Kontrol Akses &amp; Autentikasi"
              subtitle="Konfigurasi kebijakan keamanan login dan sesi pengguna"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="input-group">
                <label className="input-label">Batas Waktu Sesi (menit)</label>
                <input
                  className="input"
                  type="number"
                  min={5}
                  max={480}
                  value={securitySettings.sessionTimeout}
                  onChange={e => updateSecurity('sessionTimeout', e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  Sesi akan berakhir setelah tidak aktif selama ini
                </span>
              </div>

              <div className="input-group">
                <label className="input-label">Auto Logout (menit)</label>
                <input
                  className="input"
                  type="number"
                  min={10}
                  max={1440}
                  value={securitySettings.autoLogout}
                  onChange={e => updateSecurity('autoLogout', e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  Logout paksa setelah durasi ini meski sedang aktif
                </span>
              </div>

              <div className="input-group">
                <label className="input-label">Maks. Percobaan Login</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={20}
                  value={securitySettings.loginAttempts}
                  onChange={e => updateSecurity('loginAttempts', e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  Akun dikunci setelah melewati batas ini
                </span>
              </div>

              <div className="input-group">
                <label className="input-label">Kedaluwarsa Kata Sandi (hari)</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={365}
                  value={securitySettings.passwordExpiry}
                  onChange={e => updateSecurity('passwordExpiry', e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                  Isi 0 untuk menonaktifkan kedaluwarsa kata sandi
                </span>
              </div>
            </div>

            {/* Security toggles */}
            <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: 4,
              }}>
                Opsi Keamanan Lanjutan
              </div>
              <ToggleRow
                label="Autentikasi Dua Faktor (2FA)"
                description="Wajibkan kode OTP saat login selain kata sandi — sangat disarankan untuk akun admin"
                checked={securitySettings.twoFactor}
                onChange={v => updateSecurity('twoFactor', v)}
              />
              <ToggleRow
                label="Log Audit Sistem"
                description="Catat semua aktivitas login, perubahan pengaturan, dan tindakan admin ke log audit"
                checked={securitySettings.auditLog}
                onChange={v => updateSecurity('auditLog', v)}
              />
            </div>

            {/* Security warnings */}
            {!securitySettings.twoFactor && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'var(--amber-muted)',
                border: '1px solid var(--amber)',
                borderLeft: '4px solid var(--amber)',
                fontSize: 12,
                color: 'var(--amber)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <span>
                  <strong>Perhatian:</strong> Autentikasi Dua Faktor (2FA) tidak aktif. Aktifkan untuk meningkatkan keamanan akun administrator.
                </span>
              </div>
            )}

            {parseInt(securitySettings.sessionTimeout) < 15 && (
              <div style={{
                marginTop: 12,
                padding: '12px 16px',
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent)',
                borderLeft: '4px solid var(--accent)',
                fontSize: 12,
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}>
                <span style={{ fontSize: 16 }}>⚠</span>
                <span>
                  <strong>Peringatan:</strong> Batas waktu sesi sangat pendek (&lt;15 menit) dapat mengganggu sesi pengamatan aktif.
                </span>
              </div>
            )}

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                  onClick={() => addToast('Log audit diekspor ke laporan.pdf', 'info')}
                >
                  📥 Ekspor Log Audit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => addToast('Semua sesi aktif telah dihentikan.', 'success')}
                >
                  ✕ Hapus Semua Sesi
                </button>
              </div>
              <button className="btn btn-primary" onClick={saveSecurity}>
                💾 Simpan Pengaturan Keamanan
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            FOOTER — Danger Zone
        ══════════════════════════════════════════ */}
        <div className="card" style={{ borderColor: 'var(--accent)', borderWidth: 1 }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="card-title" style={{ color: 'var(--accent)' }}>⚠ Zona Berbahaya</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tindakan ini tidak dapat dibatalkan</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  title: 'Hapus Semua Log Sistem',
                  desc: 'Menghapus seluruh riwayat log sistem dan peringatan. Data tidak dapat dipulihkan.',
                  action: () => addToast('Fitur ini memerlukan konfirmasi administrator.', 'error'),
                  label: 'Hapus Log',
                },
                {
                  title: 'Reset Database Jadwal',
                  desc: 'Menghapus semua data pemesanan dan jadwal. Pastikan sudah melakukan backup terlebih dahulu.',
                  action: () => addToast('Fitur ini memerlukan konfirmasi administrator.', 'error'),
                  label: 'Reset Jadwal',
                },
                {
                  title: 'Factory Reset Sistem',
                  desc: 'Mengembalikan semua pengaturan ke kondisi awal pabrik. Semua data konfigurasi akan hilang.',
                  action: () => addToast('Fitur ini memerlukan konfirmasi superadmin.', 'error'),
                  label: 'Factory Reset',
                },
              ].map(({ title, desc, action, label }) => (
                <div key={title} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: 'var(--accent-muted)',
                  border: '1px solid var(--border-accent)',
                  gap: 20,
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  <button
                    className="btn btn-sm"
                    style={{
                      background: 'transparent',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      flexShrink: 0,
                    }}
                    onClick={action}
                  >
                    {label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
