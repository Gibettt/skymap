'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminPencairanStaffPanel from '@/components/AdminPencairanStaffPanel';
import { BOOKINGS } from '@/data/bookings';
import { calculateBookingFinance, formatUsd } from '@/data/keuangan';

function KpiCard({ label, value, sub, accent = 'var(--text-primary)', border = 'var(--border)' }) {
  return (
    <div className="kpi-card" style={{ borderTop: `3px solid ${border}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: accent, fontSize: 32 }}>{value}</div>
      {sub && <div className="kpi-note" style={{ marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function Stars({ rating }) {
  if (!rating) return <span style={{ color: 'var(--text-dim)' }}>Belum ada</span>;
  return <span style={{ color: 'var(--amber)', letterSpacing: 2 }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
}

export default function KeuanganPage() {
  const [tab, setTab] = useState('rekap');

  useEffect(() => {
    const timer = setTimeout(() => {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (['rekap', 'receipt', 'commission', 'pencairan', 'tips'].includes(tabParam)) {
        setTab(tabParam);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const completedBookings = useMemo(() => (
    BOOKINGS
      .filter((b) => b.status === 'Finished Experience')
      .map((b) => ({ ...b, finance: calculateBookingFinance(b) }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  ), []);

  const totals = useMemo(() => completedBookings.reduce((acc, b) => {
    acc.base += b.finance.baseTotalUsd;
    acc.invoice += b.finance.invoiceTotalUsd;
    acc.operation += b.finance.operationShareUsd;
    acc.company += b.finance.companyShareUsd;
    acc.commission += b.finance.staffCommissionUsd;
    acc.tip += b.finance.tipIncentiveUsd;
    if (b.rating) {
      acc.ratingSum += b.rating;
      acc.ratingCount += 1;
    }
    return acc;
  }, { base: 0, invoice: 0, operation: 0, company: 0, commission: 0, tip: 0, ratingSum: 0, ratingCount: 0 }), [completedBookings]);

  const commissionByStaff = useMemo(() => {
    const map = new Map();
    completedBookings.forEach((b) => {
      const current = map.get(b.staffId) || {
        staffId: b.staffId,
        staffName: b.staffName,
        staffRole: b.staffRole,
        bookings: 0,
        total: 0,
      };
      current.bookings += 1;
      current.total += b.finance.staffCommissionUsd;
      map.set(b.staffId, current);
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [completedBookings]);

  const averageRating = totals.ratingCount ? (totals.ratingSum / totals.ratingCount).toFixed(1) : '-';

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid var(--border)', width: 'fit-content', flexWrap: 'wrap' }}>
        {[
          ['rekap', 'Rekap'],
          ['receipt', 'Digital Receipt'],
          ['commission', 'Komisi Staff'],
          ['pencairan', 'Pencairan Staff'],
          ['tips', 'Tip Lapangan'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '10px 20px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            border: 'none',
            borderRight: '1px solid var(--border)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            background: tab === key ? 'var(--text-primary)' : 'var(--bg-card)',
            color: tab === key ? 'var(--bg-card)' : 'var(--text-secondary)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'rekap' && (
        <>
          <div className="kpi-grid stagger">
            <KpiCard label="Invoice Tamu" value={formatUsd(totals.invoice)} border="var(--emerald)" accent="var(--emerald)" sub="Base + 10% service charge + 17% GST" />
            <KpiCard label="Base Revenue" value={formatUsd(totals.base)} border="var(--cyan)" accent="var(--cyan)" sub="Dasar split dan komisi" />
            <KpiCard label="Jatah Resort 50%" value={formatUsd(totals.operation)} border="var(--violet)" accent="var(--violet)" sub="Operation share" />
            <KpiCard label="Komisi Staff" value={formatUsd(totals.commission)} border="var(--amber)" accent="var(--amber)" sub="External tetap lama, internal 9% dari base" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <KpiCard label="Selesai" value={completedBookings.length} sub="Finished Experience" />
            <KpiCard label="Signed by Guest" value={completedBookings.filter((b) => b.signedByGuest).length} sub="Bukti invoice fisik" />
            <KpiCard label="Average Rating" value={averageRating} sub={`${totals.ratingCount} feedback masuk`} />
            <KpiCard label="Tip Lapangan" value={formatUsd(totals.tip)} sub="Terpisah dari komisi" />
          </div>
        </>
      )}

      {tab === 'receipt' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Digital Receipt Preview</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{completedBookings.length} transaksi selesai</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Package</th>
                  <th>Pax</th>
                  <th style={{ textAlign: 'right' }}>Base</th>
                  <th style={{ textAlign: 'right' }}>10% SC</th>
                  <th style={{ textAlign: 'right' }}>17% GST</th>
                  <th style={{ textAlign: 'right' }}>Invoice</th>
                  <th>Signed</th>
                </tr>
              </thead>
              <tbody>
                {completedBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="name-cell">{b.bookingCode}</td>
                    <td>{b.clientName}<br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Room {b.roomNumber}</span></td>
                    <td>{b.packageName}</td>
                    <td>{b.adultCount} Adults / {b.childCount} Children</td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(b.finance.baseTotalUsd)}</td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(b.finance.serviceChargeUsd)}</td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(b.finance.gstUsd)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--emerald)' }}>{formatUsd(b.finance.invoiceTotalUsd)}</td>
                    <td><span className={`tag ${b.signedByGuest ? 'tag-completed' : 'tag-pending'}`}>{b.signedByGuest ? 'Yes' : 'No'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'commission' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Laporan Komisi Staff</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Single commission owner per booking</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Nama</th>
                  <th>Role</th>
                  <th>Booking Selesai</th>
                  <th style={{ textAlign: 'right' }}>Komisi Dibayar</th>
                </tr>
              </thead>
              <tbody>
                {commissionByStaff.map((staff) => (
                  <tr key={staff.staffId}>
                    <td className="name-cell">{staff.staffId}</td>
                    <td>{staff.staffName}</td>
                    <td>{staff.staffRole}</td>
                    <td>{staff.bookings}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--amber)' }}>{formatUsd(staff.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pencairan' && <AdminPencairanStaffPanel />}

      {tab === 'tips' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Resort & Review Summary / Tip Lapangan</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tip tidak bercampur dengan komisi staff</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Package</th>
                  <th style={{ textAlign: 'right' }}>Resort 50%</th>
                  <th style={{ textAlign: 'right' }}>Company 50%</th>
                  <th style={{ textAlign: 'right' }}>Tip</th>
                  <th>Rating</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {completedBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="name-cell">{b.bookingCode}</td>
                    <td>{b.packageName}</td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(b.finance.operationShareUsd)}</td>
                    <td style={{ textAlign: 'right' }}>{formatUsd(b.finance.companyShareUsd)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--emerald)', fontWeight: 800 }}>{formatUsd(b.finance.tipIncentiveUsd)}</td>
                    <td><Stars rating={b.rating} /></td>
                    <td style={{ maxWidth: 260 }}>{b.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
