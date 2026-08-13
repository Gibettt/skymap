'use client';

import { useState, useMemo } from 'react';
import { BOOKINGS } from '@/data/bookings';
import { calculateBookingFinance } from '@/data/keuangan';
import { ALERTS } from '@/data/alerts';
import { STATION_DATA } from '@/data/stations';

/* ── helpers ────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LABELS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const bookingMonth = (booking) => {
  const date = new Date(booking.date || booking.bookingDate || booking.createdAt);
  return Number.isNaN(date.getTime()) ? null : date.getMonth();
};
const CURRENT_MONTH = Math.max(0, ...BOOKINGS.map(bookingMonth).filter((month) => month !== null));

const OBJ_TAG = {
  Regular: 'tag-planet',
  Private: 'tag-asteroid',
  Kids: 'tag-bulan',
};

const STATUS_TAG = {
  Booked: 'tag-pending',
  'Finished Experience': 'tag-completed',
  Cancelled: 'tag-cancelled',
};

const SEVERITY_TAG = {
  Kritis: 'tag-critical',
  Peringatan: 'tag-warning',
  Info: 'tag-info',
};

const CATALOG_COLORS = {
  Regular: 'var(--cyan)',
  Private: 'var(--violet)',
  Kids: 'var(--emerald)',
};
const PIE_COLORS = ['var(--accent)', 'var(--cyan)', 'var(--violet)', 'var(--emerald)'];
const PIE_RADIUS = 34;
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;
const CHART_LEFT = 52;
const CHART_RIGHT = 968;
const CHART_TOP = 28;
const CHART_BOTTOM = 184;

export default function AdminOverviewPage() {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [activePackageName, setActivePackageName] = useState(null);
  const [chartMonth, setChartMonth] = useState(CURRENT_MONTH);

  /* ── derived stats ───────────────────────────────────── */
  const stats = useMemo(() => {
    const total = BOOKINGS.length;
    const confirmed = BOOKINGS.filter((b) => b.status === 'Booked').length;
    const pending = BOOKINGS.filter((b) => b.status === 'Booked' && !b.signedByGuest).length;
    const completed = BOOKINGS.filter((b) => b.status === 'Finished Experience').length;
    const cancelled = BOOKINGS.filter((b) => b.status === 'Cancelled').length;

    const revenue = BOOKINGS.filter((b) => b.status === 'Finished Experience')
      .reduce((acc, b) => acc + calculateBookingFinance(b).invoiceTotalUsd, 0);

    const openAlerts = ALERTS.filter((a) => a.isOpen).length;
    const criticalAlerts = ALERTS.filter((a) => a.severity === 'Kritis' && a.isOpen).length;
    const onlineStations = STATION_DATA.filter((s) => s.status === 'online').length;

    return { total, confirmed, pending, completed, cancelled, revenue, openAlerts, criticalAlerts, onlineStations };
  }, []);

  /* ── tonight's priority bookings ─────────────────────── */
  const tonightBookings = useMemo(
    () =>
      BOOKINGS.filter((b) => b.status === 'Booked').slice(0, 7),
    []
  );

  /* ── bar chart data (Jan–Jul real, rest future) ──────── */
  const barData = useMemo(() => {
    return MONTHS.map((month, i) => ({
      month,
      value: BOOKINGS.filter((booking) => bookingMonth(booking) === i).length,
      isCurrent: i === CURRENT_MONTH,
      isFuture: i > CURRENT_MONTH,
    }));
  }, []);

  const chartData = useMemo(() => barData.map((d, i) => ({
    ...d,
    isCurrent: i === chartMonth,
    isFuture: i > chartMonth,
  })), [barData, chartMonth]);

  const maxChart = useMemo(() => Math.max(...chartData.filter((d) => !d.isFuture).map((d) => d.value || 1)), [chartData]);
  const chartPoints = useMemo(() => chartData.map((d, i) => {
    const x = CHART_LEFT + i * ((CHART_RIGHT - CHART_LEFT) / 11);
    if (d.isFuture) return { ...d, x, y: null };
    return { ...d, x, y: CHART_BOTTOM - ((d.value || 0) / maxChart) * (CHART_BOTTOM - CHART_TOP) };
  }), [chartData, maxChart]);
  const visiblePoints = chartPoints.filter((d) => d.y !== null);
  const linePath = visiblePoints.map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`).join(' ');
  const areaPath = visiblePoints.length
    ? `M ${visiblePoints[0].x} ${CHART_BOTTOM} ${visiblePoints.map((d) => `L ${d.x} ${d.y}`).join(' ')} L ${visiblePoints[visiblePoints.length - 1].x} ${CHART_BOTTOM} Z`
    : '';

  /* ── catalog distribution ────────────────────────────── */
  const catalogDist = useMemo(() => {
    const types = ['Regular', 'Private', 'Kids'];
    return types.map((type) => {
      const count = BOOKINGS.filter((b) => b.objectType === type).length;
      return { type, count, pct: Math.round((count / BOOKINGS.length) * 100) };
    });
  }, []);

  const packageLeaders = useMemo(() => {
    const selectedMonthBookings = BOOKINGS.filter((booking) => bookingMonth(booking) === chartMonth);
    const totals = selectedMonthBookings.reduce((acc, booking) => {
      const key = booking.packageName || booking.objectName || 'Unknown Package';
      acc[key] = acc[key] || { name: key, count: 0, revenue: 0 };
      acc[key].count += 1;
      acc[key].revenue += booking.status === 'Finished Experience' ? calculateBookingFinance(booking).invoiceTotalUsd : 0;
      return acc;
    }, {});
    return Object.values(totals).sort((a, b) => b.count - a.count || b.revenue - a.revenue).slice(0, 4);
  }, [chartMonth]);
  const packageTotal = packageLeaders.reduce((total, item) => total + item.count, 0);
  const packagePie = useMemo(() => {
    return packageLeaders.map((item, index) => {
      const pct = packageTotal ? Math.round((item.count / packageTotal) * 100) : 0;
      const start = packageTotal
        ? packageLeaders.slice(0, index).reduce((total, row) => total + row.count, 0) / packageTotal * 100
        : 0;
      const end = index === packageLeaders.length - 1 ? 100 : start + (packageTotal ? item.count / packageTotal * 100 : 0);
      return { ...item, pct, start, end, color: PIE_COLORS[index % PIE_COLORS.length] };
    });
  }, [packageLeaders, packageTotal]);

  /* ── open alerts (only open ones) ───────────────────── */
  const openAlerts = useMemo(() => ALERTS.filter((a) => a.isOpen), []);

  /* ── bar chart summary stats ─────────────────────────── */
  const historicalBars = chartData.filter((d) => !d.isFuture);
  const barTotal = historicalBars.reduce((a, d) => a + d.value, 0);
  const barAvg = Math.round(barTotal / historicalBars.length);
  const barMax = Math.max(...historicalBars.map((d) => d.value));
  const barMaxMonth = historicalBars.find((d) => d.value === barMax)?.month || MONTHS[chartMonth];
  const activePackage = packagePie.find((item) => item.name === activePackageName) || packagePie[0];

  /* ── render ──────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Heading ────────────────────────────────── */}
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
            Dashboard / Admin
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
            Ikhtisar Sistem
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            Ringkasan operasional observatorium — 30 Juli 2026
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {stats.criticalAlerts > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                background: 'var(--accent-muted)',
                border: '1px solid var(--border-accent)',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  background: 'var(--accent)',
                  borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'pulseRed 1.5s ease-in-out infinite',
                }}
              />
              {stats.criticalAlerts} Peringatan Kritis Aktif
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              padding: '8px 14px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            ⊙ &nbsp;17:25 WIB
          </div>
        </div>
      </div>

      {/* ── KPI Row 1: Booking Status ─────────────────────── */}
      <div className="kpi-grid stagger">
        <div className="kpi-card" style={{ borderTop: '3px solid var(--text-primary)' }}>
          <div className="kpi-label">Total Booking</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-note">Seluruh periode aktif</div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--emerald)' }}>
          <div className="kpi-label">Booked</div>
          <div className="kpi-value" style={{ color: 'var(--emerald)' }}>{stats.confirmed}</div>
          <div className="kpi-note">
            <span className="kpi-trend-up">▲ {Math.round((stats.confirmed / stats.total) * 100)}%</span>
            <span style={{ color: 'var(--text-dim)' }}>&nbsp;dari total</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--amber)' }}>
          <div className="kpi-label">Belum Signed</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{stats.pending}</div>
          <div className="kpi-note">
            <span style={{ color: 'var(--amber)', fontWeight: 700 }}>● Perlu tindakan</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cyan)' }}>
          <div className="kpi-label">Finished</div>
          <div className="kpi-value" style={{ color: 'var(--cyan)' }}>{stats.completed}</div>
          <div className="kpi-note">
            <span className="kpi-trend-up">✓</span>
            <span style={{ color: 'var(--text-dim)' }}>&nbsp;Tereksekusi sukses</span>
          </div>
        </div>
      </div>

      {/* ── KPI Row 2: Operational ────────────────────────── */}
      <div className="kpi-grid stagger" style={{ marginBottom: 0 }}>
        <div className="kpi-card" style={{ borderTop: '3px solid var(--accent)' }}>
          <div className="kpi-label">Invoice Selesai</div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: '-0.03em',
              color: 'var(--accent)',
              lineHeight: 1.1,
              marginBottom: 10,
            }}
          >
            {fmt(stats.revenue)}
          </div>
          <div className="kpi-note">
            <span className="kpi-trend-up">▲ 12%</span>
            <span style={{ color: 'var(--text-dim)' }}>&nbsp;vs. bulan lalu</span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--emerald)' }}>
          <div className="kpi-label">Stasiun Aktif</div>
          <div className="kpi-value" style={{ color: 'var(--emerald)', fontSize: 40 }}>
            {stats.onlineStations}
            <span style={{ fontSize: 22, color: 'var(--text-dim)', fontWeight: 400 }}>
              /{STATION_DATA.length}
            </span>
          </div>
          <div className="kpi-note" style={{ color: 'var(--text-dim)' }}>1 offline: Siding Spring</div>
        </div>

        <div
          className="kpi-card"
          style={{ borderTop: `3px solid ${stats.openAlerts > 2 ? 'var(--accent)' : 'var(--amber)'}` }}
        >
          <div className="kpi-label">Peringatan Terbuka</div>
          <div
            className="kpi-value"
            style={{ color: stats.openAlerts > 2 ? 'var(--accent)' : 'var(--amber)' }}
          >
            {stats.openAlerts}
          </div>
          <div className="kpi-note">
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{stats.criticalAlerts} Kritis</span>
            <span style={{ color: 'var(--text-dim)' }}>
              &nbsp;· {stats.openAlerts - stats.criticalAlerts} Lainnya
            </span>
          </div>
        </div>

        <div className="kpi-card" style={{ borderTop: '3px solid var(--cyan)' }}>
          <div className="kpi-label">Finished Bulan Ini</div>
          <div className="kpi-value" style={{ color: 'var(--cyan)', fontSize: 40 }}>
            {stats.completed}
          </div>
          <div className="kpi-note">
            <span className="kpi-trend-up">▲ 3</span>
            <span style={{ color: 'var(--text-dim)' }}>&nbsp;vs. bulan lalu</span>
          </div>
        </div>
      </div>

      {/* ── Bar Chart ─────────────────────────────────────── */}
      <div className="admin-chart-grid fade-in-up">
      <div className="card admin-booking-chart-card">
        <div className="card-header">
          <span className="card-title">Booking per Bulan — 2026</span>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              Sampai Bulan
              <select className="input" value={chartMonth} onChange={(event) => setChartMonth(Number(event.target.value))} style={{ height: 32, minHeight: 32, width: 112, padding: '0 28px 0 10px', fontSize: 12 }}>
                {MONTHS.slice(0, CURRENT_MONTH + 1).map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, background: 'var(--accent)', display: 'inline-block' }} />
              Bulan Dipilih
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'inline-block',
                }}
              />
              Historis
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: 'repeating-linear-gradient(45deg,var(--border) 0px,var(--border) 2px,transparent 2px,transparent 5px)',
                  display: 'inline-block',
                  opacity: 0.5,
                }}
              />
              Proyeksi
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="line-chart">
            <svg viewBox="0 0 1000 220" role="img" aria-label="Grafik booking per bulan 2026">
              <defs>
                <linearGradient id="bookingTrendFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = CHART_BOTTOM - ratio * (CHART_BOTTOM - CHART_TOP);
                return (
                  <g key={ratio}>
                    <text x="8" y={y + 4} className="line-chart-axis">{Math.round(maxChart * ratio)}</text>
                    <line x1={CHART_LEFT} x2={CHART_RIGHT} y1={y} y2={y} className="line-chart-grid" />
                  </g>
                );
              })}
              {areaPath && <path d={areaPath} fill="url(#bookingTrendFill)" />}
              {linePath && <path d={linePath} className="line-chart-path" />}
              {chartPoints.map((point, index) => {
                if (point.y === null) {
                  return <line key={point.month} x1={point.x - 24} x2={point.x + 24} y1={CHART_BOTTOM} y2={CHART_BOTTOM} className="line-chart-future" />;
                }

                const active = point.isCurrent || hoveredBar === index;
                return (
                  <g key={point.month} onMouseEnter={() => setHoveredBar(index)} onMouseLeave={() => setHoveredBar(null)}>
                    <circle cx={point.x} cy={point.y} r={active ? 7 : 5} className={`line-chart-dot${point.isCurrent ? ' current' : ''}`} />
                    <text x={point.x} y={point.y - 14} textAnchor="middle" className={`line-chart-value${point.isCurrent ? ' current' : ''}`}>
                      {point.value}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="line-chart-labels">
              {chartData.map((point) => (
                <span key={point.month} className={point.isCurrent ? 'current' : point.isFuture ? 'future' : ''}>{point.month}</span>
              ))}
            </div>
          </div>

          {/* summary strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {[
              { label: 'Total Jan–Jul', value: barTotal, highlight: false },
              { label: 'Rata-rata / Bulan', value: barAvg, highlight: false },
              { label: 'Tertinggi (Jul)', value: barMax, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {label.includes('Total') ? `Total Jan-${MONTHS[chartMonth]}` : label.includes('Tertinggi') ? `Tertinggi (${barMaxMonth})` : label}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 28,
                    letterSpacing: '-0.03em',
                    color: highlight ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two-column section ────────────────────────────── */}
      <div className="card admin-package-pie-card">
        <div className="card-header">
          <div>
            <span className="card-title">Package Terlaris</span>
            <p className="admin-chart-subtitle">Proporsi package berdasarkan jumlah booking.</p>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{packageTotal} booking</span>
        </div>
        <div className="card-body">
          <div className="package-pie-wrap">
            <div className="package-pie-shell">
              <svg className="package-pie-svg" viewBox="0 0 100 100" role="img" aria-label="Grafik lingkaran package terlaris">
                <circle className="package-pie-track" cx="50" cy="50" r={PIE_RADIUS} />
                {packagePie.map((item) => {
                  const arc = ((item.end - item.start) / 100) * PIE_CIRCUMFERENCE;
                  const gap = Math.min(1.8, arc * 0.12);
                  return (
                    <circle
                      key={item.name}
                      className={`package-pie-segment${activePackage?.name === item.name ? ' active' : ''}`}
                      cx="50"
                      cy="50"
                      r={PIE_RADIUS}
                      style={{
                        stroke: item.color,
                        strokeDasharray: `${Math.max(0, arc - gap)} ${PIE_CIRCUMFERENCE}`,
                        strokeDashoffset: -((item.start / 100) * PIE_CIRCUMFERENCE),
                      }}
                      onMouseEnter={() => setActivePackageName(item.name)}
                    >
                      <title>{item.name}: {item.pct}%</title>
                    </circle>
                  );
                })}
              </svg>
              <div className="package-pie-center">
                <span style={{ color: activePackage?.color || 'var(--accent)' }}>{activePackage?.pct || 0}%</span>
                <strong>{activePackage?.name || '-'}</strong>
                <small>{activePackage?.count || 0} booking</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

        {/* LEFT: Prioritas Malam Ini */}
        <div className="card fade-in-up">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="card-title">Prioritas Malam Ini</span>
              <span
                style={{
                  background: 'var(--accent)',
                  color: 'white',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {tonightBookings.length}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
              30 Jul 2026
            </span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Objek</th>
                  <th>Observer</th>
                  <th>Waktu</th>
                  <th>Stasiun</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tonightBookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>
                        {b.objectName}
                      </div>
                      <span className={`tag ${OBJ_TAG[b.objectType] || ''}`} style={{ fontSize: 9 }}>
                        {b.objectType}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {b.observer.split(' ').slice(-1)[0]}
                    </td>
                    <td style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{b.timeStart}</span>
                      <span style={{ color: 'var(--text-dim)' }}> – {b.timeEnd}</span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{b.station}</td>
                    <td>
                      <span className={`tag ${STATUS_TAG[b.status] || ''}`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
              {tonightBookings.length} booked ·{' '}
              {tonightBookings.filter((b) => !b.signedByGuest).length} belum signed
            </span>
            <button className="btn btn-secondary btn-sm">Lihat Jadwal Penuh →</button>
          </div>
        </div>

        {/* RIGHT: Alerts + Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Peringatan Aktif */}
          <div className="card fade-in-up">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="card-title">Peringatan Aktif</span>
                {stats.criticalAlerts > 0 && (
                  <span
                    style={{
                      background: 'var(--accent)',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                    }}
                  >
                    {stats.criticalAlerts} Kritis
                  </span>
                )}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                Kelola Semua →
              </button>
            </div>

            <div style={{ padding: '0 22px' }}>
              {openAlerts.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <h3>Tidak Ada Peringatan</h3>
                  <p>Semua sistem berjalan normal.</p>
                </div>
              ) : (
                openAlerts.map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <div style={{ paddingTop: 2, flexShrink: 0 }}>
                      <span className={`tag ${SEVERITY_TAG[alert.severity] || ''}`}>{alert.severity}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="alert-body-title">{alert.title}</div>
                      <div
                        className="alert-body-text"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {alert.body}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{alert.source}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>·</span>
                        <span className="alert-time">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sebaran Katalog */}
          <div className="card fade-in-up">
            <div className="card-header">
              <span className="card-title">Sebaran Paket</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{BOOKINGS.length} total</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {catalogDist.map((cat) => {
                const color = CATALOG_COLORS[cat.type] || 'var(--text-primary)';
                return (
                  <div key={cat.type}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            background: color,
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {cat.type}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cat.count} booking</span>
                        <span
                          style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}
                        >
                          {cat.pct}%
                        </span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${cat.pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Station Status Grid ───────────────────────────── */}
      <div className="card fade-in-up">
        <div className="card-header">
          <span className="card-title">Status Jaringan Stasiun</span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--emerald)', fontWeight: 700 }}>
              ● {stats.onlineStations} Online
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
              ○ {STATION_DATA.length - stats.onlineStations} Offline
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
          }}
        >
          {STATION_DATA.map((st, i) => (
            <div
              key={st.short}
              style={{
                padding: '18px 20px',
                borderRight: i < STATION_DATA.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                background: st.status === 'offline' ? 'rgba(0,0,0,0.02)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: st.status === 'online' ? 'var(--emerald)' : 'var(--text-dim)',
                    display: 'inline-block',
                    flexShrink: 0,
                    opacity: st.status === 'offline' ? 0.5 : 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: '-0.01em',
                    color: st.status === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)',
                  }}
                >
                  {st.short}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <div>{st.latitude} / {st.longitude}</div>
                <div>
                  Seeing:{' '}
                  <strong
                    style={{
                      color:
                        parseFloat(st.seeing) <= 0.7
                          ? 'var(--emerald)'
                          : parseFloat(st.seeing) >= 1.5
                          ? 'var(--amber)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {st.seeing}
                  </strong>
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: st.status === 'online' ? 'var(--emerald)' : 'var(--text-dim)',
                    fontWeight: 700,
                  }}
                >
                  {st.status === 'online' ? '● Online' : '○ Offline'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
