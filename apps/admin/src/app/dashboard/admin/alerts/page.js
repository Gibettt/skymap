'use client';

import { useState, useMemo } from 'react';
import { ALERTS } from '@/data/alerts';

/* ── constants ──────────────────────────────────────────── */
const FILTERS = ['Semua', 'Kritis', 'Peringatan', 'Info'];

const SEVERITY_TAG = {
  Kritis: 'tag-critical',
  Peringatan: 'tag-warning',
  Info: 'tag-info',
};

const SEVERITY_ICON = {
  Kritis: '🔴',
  Peringatan: '🟡',
  Info: '🔵',
};

const SEVERITY_ORDER = { Kritis: 0, Peringatan: 1, Info: 2 };

/* ── page component ─────────────────────────────────────── */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState(() =>
    [...ALERTS].sort((a, b) => {
      // Sort: open first, then by severity, then by id
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    })
  );
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [resolvingId, setResolvingId] = useState(null);

  /* ── derived counts ─────────────────────────────────────── */
  const counts = useMemo(() => {
    const all = alerts.length;
    const kritis = alerts.filter((a) => a.severity === 'Kritis').length;
    const peringatan = alerts.filter((a) => a.severity === 'Peringatan').length;
    const info = alerts.filter((a) => a.severity === 'Info').length;
    const terbuka = alerts.filter((a) => a.isOpen).length;
    const ditangani = alerts.filter((a) => !a.isOpen).length;
    return { all, kritis, peringatan, info, terbuka, ditangani };
  }, [alerts]);

  /* ── filtered list ─────────────────────────────────────── */
  const filteredAlerts = useMemo(() => {
    if (activeFilter === 'Semua') return alerts;
    return alerts.filter((a) => a.severity === activeFilter);
  }, [alerts, activeFilter]);

  /* ── resolve handler ────────────────────────────────────── */
  const handleResolve = (id) => {
    setResolvingId(id);
    setTimeout(() => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isOpen: !a.isOpen } : a))
      );
      setResolvingId(null);
    }, 300);
  };

  /* ── resolve all open ───────────────────────────────────── */
  const handleResolveAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isOpen: false })));
  };

  /* ── reopen all ─────────────────────────────────────────── */
  const handleReset = () => {
    setAlerts(
      [...ALERTS].sort((a, b) => {
        if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
        return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      })
    );
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Heading ──────────────────────────────────── */}
      <div
        className="fade-in-up"
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            Dashboard / Admin / Peringatan
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: 34,
              letterSpacing: '-0.04em',
              lineHeight: 1,
              color: 'var(--text-primary)',
            }}
          >
            Manajemen Peringatan
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Pantau dan tangani peringatan sistem observatorium secara real-time.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          {counts.terbuka > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleResolveAll}
              style={{ letterSpacing: '0.04em' }}
            >
              ✓ Tangani Semua ({counts.terbuka})
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleReset}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* ── Summary Bar ──────────────────────────────────── */}
      <div className="kpi-grid stagger" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {/* Total */}
        <div className="kpi-card" style={{ borderTop: '3px solid var(--text-primary)' }}>
          <div className="kpi-label">Total Peringatan</div>
          <div className="kpi-value" style={{ fontSize: 40 }}>{counts.all}</div>
          <div className="kpi-note" style={{ color: 'var(--text-dim)' }}>Semua periode</div>
        </div>

        {/* Kritis */}
        <div
          className="kpi-card"
          style={{
            borderTop: '3px solid var(--accent)',
            background: counts.kritis > 0 ? 'var(--accent-muted)' : undefined,
          }}
        >
          <div className="kpi-label">Kritis</div>
          <div className="kpi-value" style={{ color: 'var(--accent)', fontSize: 40 }}>{counts.kritis}</div>
          <div className="kpi-note">
            {counts.kritis > 0 ? (
              <span style={{ color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, background: 'var(--accent)', borderRadius: '50%', display: 'inline-block', animation: 'pulseRed 1.5s ease-in-out infinite' }} />
                Perlu tindakan segera
              </span>
            ) : (
              <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>✓ Aman</span>
            )}
          </div>
        </div>

        {/* Peringatan */}
        <div className="kpi-card" style={{ borderTop: '3px solid var(--amber)' }}>
          <div className="kpi-label">Peringatan</div>
          <div className="kpi-value" style={{ color: 'var(--amber)', fontSize: 40 }}>{counts.peringatan}</div>
          <div className="kpi-note" style={{ color: 'var(--text-dim)' }}>Dipantau</div>
        </div>

        {/* Info */}
        <div className="kpi-card" style={{ borderTop: '3px solid var(--cyan)' }}>
          <div className="kpi-label">Info</div>
          <div className="kpi-value" style={{ color: 'var(--cyan)', fontSize: 40 }}>{counts.info}</div>
          <div className="kpi-note" style={{ color: 'var(--text-dim)' }}>Notifikasi sistem</div>
        </div>

        {/* Ditangani */}
        <div className="kpi-card" style={{ borderTop: '3px solid var(--emerald)' }}>
          <div className="kpi-label">Ditangani</div>
          <div className="kpi-value" style={{ color: 'var(--emerald)', fontSize: 40 }}>{counts.ditangani}</div>
          <div className="kpi-note">
            <span className="kpi-trend-up">
              ✓ {counts.all > 0 ? Math.round((counts.ditangani / counts.all) * 100) : 0}% selesai
            </span>
          </div>
        </div>
      </div>

      {/* ── Alert List Card ───────────────────────────────── */}
      <div className="card fade-in-up">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          {/* Filter chips */}
          <div className="filter-bar">
            {FILTERS.map((f) => {
              const count =
                f === 'Semua'
                  ? counts.all
                  : f === 'Kritis'
                  ? counts.kritis
                  : f === 'Peringatan'
                  ? counts.peringatan
                  : counts.info;
              return (
                <button
                  key={f}
                  className={`chip${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '0 5px',
                      fontSize: 10,
                      fontWeight: 700,
                      background: activeFilter === f ? 'rgba(255,255,255,0.2)' : 'var(--border)',
                      borderRadius: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status summary */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
              ● {counts.terbuka} Terbuka
            </span>
            <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 600 }}>
              ✓ {counts.ditangani} Ditangani
            </span>
          </div>
        </div>

        <div className="card-body" style={{ padding: '0 22px' }}>
          {filteredAlerts.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px 0' }}>
              <h3>Tidak Ada Peringatan</h3>
              <p>Tidak ada peringatan untuk filter yang dipilih.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                isResolving={resolvingId === alert.id}
                onResolve={() => handleResolve(alert.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {filteredAlerts.length > 0 && (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Menampilkan {filteredAlerts.length} dari {counts.all} peringatan
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              Diperbarui otomatis setiap 60 detik
            </span>
          </div>
        )}
      </div>

      {/* ── Activity Log ─────────────────────────────────── */}
      <div className="card fade-in-up">
        <div className="card-header">
          <span className="card-title">Log Aktivitas Peringatan</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>30 Jul 2026</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Waktu</th>
                  <th>Kejadian</th>
                  <th>Sumber</th>
                  <th style={{ width: 100 }}>Tingkat</th>
                  <th style={{ width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...ALERTS]
                  .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))
                  .map((alert) => (
                    <tr key={alert.id} style={{ opacity: alert.isOpen ? 1 : 0.55 }}>
                      <td style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)' }}>
                        {alert.time}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {alert.title}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {alert.body}
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{alert.source}</td>
                      <td>
                        <span className={`tag ${SEVERITY_TAG[alert.severity] || ''}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>
                        {alert.isOpen ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--amber)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--amber)',
                                display: 'inline-block',
                              }}
                            />
                            Terbuka
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'var(--emerald)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: 'var(--emerald)',
                                display: 'inline-block',
                              }}
                            />
                            Ditangani
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── AlertItem sub-component ────────────────────────────── */
function AlertItem({ alert, isResolving, onResolve }) {
  const isResolved = !alert.isOpen;

  const severityBorderColor = {
    Kritis: 'var(--accent)',
    Peringatan: 'var(--amber)',
    Info: 'var(--cyan)',
  }[alert.severity] || 'var(--border)';

  return (
    <div
      className={`alert-item${isResolved ? ' resolved' : ''}`}
      style={{
        opacity: isResolving ? 0.4 : isResolved ? 0.5 : 1,
        transition: 'opacity 0.3s ease',
        borderLeft: `3px solid ${isResolved ? 'var(--border)' : severityBorderColor}`,
        paddingLeft: 16,
        marginLeft: -4,
      }}
    >
      {/* Severity tag */}
      <div style={{ paddingTop: 2, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 18 }}>{SEVERITY_ICON[alert.severity]}</span>
        <span className={`tag ${SEVERITY_TAG[alert.severity] || ''}`} style={{ fontSize: 9 }}>
          {alert.severity}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <div className="alert-body-title" style={{ textDecoration: isResolved ? 'line-through' : 'none' }}>
            {alert.title}
          </div>
          {isResolved && (
            <span className="tag tag-completed" style={{ fontSize: 9, flexShrink: 0 }}>
              Ditangani
            </span>
          )}
        </div>

        <div className="alert-body-text" style={{ marginBottom: 8 }}>
          {alert.body}
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>📡</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{alert.source}</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
          <span className="alert-time">🕐 {alert.time}</span>
        </div>
      </div>

      {/* Action button */}
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <button
          className="btn btn-sm"
          onClick={onResolve}
          disabled={isResolving}
          style={{
            background: isResolved ? 'var(--emerald-muted)' : 'var(--accent-muted)',
            color: isResolved ? 'var(--emerald)' : 'var(--accent)',
            border: `1px solid ${isResolved ? 'var(--emerald)' : 'var(--border-accent)'}`,
            fontWeight: 700,
            letterSpacing: '0.04em',
            minWidth: 88,
            transition: 'all 0.2s ease',
          }}
        >
          {isResolving ? '...' : isResolved ? '↩ Buka Ulang' : '✓ Tangani'}
        </button>
      </div>
    </div>
  );
}
