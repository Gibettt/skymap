'use client';

import Link from 'next/link';
import { BOOKINGS } from '@/data/bookings';
import { STATION_DATA } from '@/data/stations';

const currency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const statusTagClass = (status) => {
  if (status === 'Booked') return 'tag-pending';
  if (status === 'Finished Experience') return 'tag-completed';
  if (status === 'Cancelled') return 'tag-cancelled';
  return 'tag-info';
};

export default function InternalOverviewPage() {
  const total = BOOKINGS.length;
  const active = BOOKINGS.filter((b) => b.status === 'Booked');
  const finished = BOOKINGS.filter((b) => b.status === 'Finished Experience');
  const revenue = BOOKINGS
    .filter((b) => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.adultPriceUsd * b.adultCount + b.childPriceUsd * b.childCount, 0);

  const revenueByStation = STATION_DATA.length
    ? Object.values(
        BOOKINGS.filter((b) => b.status !== 'Cancelled').reduce((acc, b) => {
          acc[b.station] = acc[b.station] || { station: b.station, amount: 0 };
          acc[b.station].amount += b.adultPriceUsd * b.adultCount + b.childPriceUsd * b.childCount;
          return acc;
        }, {})
      )
    : [];
  const maxRevenue = Math.max(1, ...revenueByStation.map((r) => r.amount));

  const upcoming = [...BOOKINGS].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

  const popularPackages = Object.values(
    BOOKINGS.reduce((acc, b) => {
      acc[b.packageName] = acc[b.packageName] || { name: b.packageName, count: 0 };
      acc[b.packageName].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <div className="fade-in-up">
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header" style={{ borderBottomColor: '#0891b2' }}>
          <h1 className="card-title" style={{ fontSize: '24px' }}>Ikhtisar Internal</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Selamat datang, Ahmad Fauzi. Berikut ringkasan operasional stargazing hari ini.</p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card" style={{ borderTop: '3px solid #0891b2' }}>
          <div className="kpi-label">Total Booking</div>
          <div className="kpi-value" style={{ color: '#0891b2' }}>{total}</div>
        </div>
        <div className="kpi-card" style={{ borderTop: '3px solid var(--emerald)' }}>
          <div className="kpi-label">Pendapatan</div>
          <div className="kpi-value" style={{ color: 'var(--emerald)', fontSize: '32px' }}>{currency(revenue)}</div>
        </div>
        <div className="kpi-card" style={{ borderTop: '3px solid var(--amber)' }}>
          <div className="kpi-label">Booking Aktif</div>
          <div className="kpi-value" style={{ color: 'var(--amber)' }}>{active.length}</div>
        </div>
        <div className="kpi-card" style={{ borderTop: '3px solid var(--cyan)' }}>
          <div className="kpi-label">Selesai</div>
          <div className="kpi-value" style={{ color: 'var(--cyan)' }}>{finished.length}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Perlu Disiapkan</h2>
            {active.length > 0 && <span className="sidebar-count" style={{ background: 'var(--amber)', color: 'white', padding: '2px 8px' }}>{active.length}</span>}
          </div>
          <div className="card-body">
            {active.length > 0 ? (
              active.map((b) => (
                <div className="overview-row" key={b.id}>
                  <span className="overview-row-icon">o</span>
                  <span className="overview-row-label">
                    {b.packageName} — {b.clientName}
                    <br />
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{b.station} · {new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}, {b.timeStart}</span>
                  </span>
                  <span className="overview-row-value">
                    <Link href={`/dashboard/internal/bookings`} style={{ color: 'var(--accent-hover)', fontWeight: 700 }}>Siapkan &gt;</Link>
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <h3>Semua Beres</h3>
                <p>Tidak ada booking yang perlu disiapkan saat ini.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Pendapatan per Lokasi</h2>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {revenueByStation.map((r) => (
                <div className="bar-item" key={r.station}>
                  <div className="bar-value">{currency(r.amount)}</div>
                  <div className="bar-fill" style={{ height: `${(r.amount / maxRevenue) * 100}%`, background: 'var(--emerald)' }} />
                  <div className="bar-label">{r.station}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Booking Terdekat</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Objek</th>
                  <th>Tanggal</th>
                  <th>Stasiun</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length > 0 ? (
                  upcoming.map((b) => (
                    <tr key={b.id}>
                      <td className="name-cell">{b.objectName}</td>
                      <td style={{ fontSize: '12px' }}>{new Date(b.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} · {b.timeStart}</td>
                      <td style={{ fontSize: '12px' }}>{b.station}</td>
                      <td>
                        <span className={`tag ${statusTagClass(b.status)}`}>{b.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>Tidak ada booking terdekat</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Paket Terpopuler</h2>
          </div>
          <div className="card-body">
            {popularPackages.map((p) => (
              <div className="overview-row" key={p.name}>
                <span className="overview-row-icon">*</span>
                <span className="overview-row-label">{p.name}</span>
                <span className="overview-row-value">{p.count} booking</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Status Stasiun Observasi</h2>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Stasiun</th>
                  <th>Koordinat</th>
                  <th>Seeing</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {STATION_DATA.map((st) => (
                  <tr key={st.short}>
                    <td>{st.short}</td>
                    <td className="name-cell">{st.name}</td>
                    <td style={{ fontSize: '12px' }}>{st.latitude}, {st.longitude}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{st.seeing}</td>
                    <td>
                      <span className={`tag ${st.status === 'online' ? 'tag-completed' : 'tag-cancelled'}`}>
                        {st.status === 'online' ? 'Operasional' : 'Offline'}
                      </span>
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
