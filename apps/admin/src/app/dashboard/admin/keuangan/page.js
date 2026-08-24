'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Receipt, Users, Wallet } from 'lucide-react';
import AdminPencairanStaffPanel from '@/components/AdminPencairanStaffPanel';
import { BOOKINGS } from '@/data/bookings';
import { calculateBookingFinance, formatUsd } from '@/data/keuangan';

const TABS = [
  ['rekap', 'Rekap'],
  ['receipt', 'Digital Receipt'],
  ['commission', 'Komisi Staff'],
  ['pencairan', 'Pencairan Staff'],
  ['tips', 'Tip Lapangan'],
];

const formatDate = (value) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
}).format(new Date(value));

function Stars({ rating }) {
  if (!rating) return <span style={{ color: 'var(--text-dim)' }}>Belum ada</span>;
  return <span className="finance-rating">{rating}/5</span>;
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
    acc.serviceCharge += b.finance.serviceChargeUsd;
    acc.gst += b.finance.gstUsd;
    acc.operation += b.finance.operationShareUsd;
    acc.company += b.finance.companyShareUsd;
    acc.commission += b.finance.staffCommissionUsd;
    acc.tip += b.finance.tipIncentiveUsd;
    if (b.rating) {
      acc.ratingSum += b.rating;
      acc.ratingCount += 1;
    }
    return acc;
  }, { base: 0, invoice: 0, serviceCharge: 0, gst: 0, operation: 0, company: 0, commission: 0, tip: 0, ratingSum: 0, ratingCount: 0 }), [completedBookings]);

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
  const signedBookings = completedBookings.filter((booking) => booking.signedByGuest).length;
  const summaryItems = [
    { label: 'Invoice Tamu', value: formatUsd(totals.invoice), note: 'Total tagihan final', Icon: Receipt, primary: true },
    { label: 'Base Revenue', value: formatUsd(totals.base), note: 'Dasar pembagian', Icon: Wallet },
    { label: 'Jatah Resort', value: formatUsd(totals.operation), note: '50% dari base', Icon: Building2 },
    { label: 'Komisi Staff', value: formatUsd(totals.commission), note: 'Dari booking selesai', Icon: Users },
  ];

  return (
    <div className="finance-report fade-in-up">
      <section className="finance-report-heading">
        <div>
          <span className="finance-report-eyebrow">Financial Operations</span>
          <h1>Revenue and settlement overview</h1>
          <p>Pantau invoice, pembagian pendapatan, komisi, dan pencairan dalam satu laporan.</p>
        </div>
        <div className="finance-report-period">
          <span>Periode data</span>
          <strong>Semua transaksi selesai</strong>
          <small>USD, {completedBookings.length} transaksi tercatat</small>
        </div>
      </section>

      <div className="finance-report-tabs" role="tablist" aria-label="Bagian laporan keuangan">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            id={`finance-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={tab === key}
            aria-controls="finance-tab-panel"
            className={tab === key ? 'is-active' : ''}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        id="finance-tab-panel"
        className="finance-report-tab-panel"
        role="tabpanel"
        aria-labelledby={`finance-tab-${tab}`}
      >
        {tab === 'rekap' && (
          <div className="finance-report-recap">
            <section className="finance-report-summary" aria-label="Ringkasan pendapatan">
              {summaryItems.map(({ label, value, note, Icon, primary }) => (
                <article key={label} className={primary ? 'is-primary' : ''}>
                  <div className="finance-summary-label">
                    <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                    <span>{label}</span>
                  </div>
                  <strong>{value}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </section>

            <div className="finance-report-grid">
              <section className="finance-report-panel finance-revenue-panel">
                <div className="finance-panel-heading">
                  <div>
                    <span>Revenue flow</span>
                    <h2>Rekonsiliasi Invoice</h2>
                  </div>
                  <span className="finance-balanced-status">Balanced</span>
                </div>

                <div className="finance-invoice-total">
                  <span>Invoice Tamu</span>
                  <strong>{formatUsd(totals.invoice)}</strong>
                  <small>Base + service charge + GST</small>
                </div>

                <div className="finance-breakdown">
                  <div><span>Base revenue</span><strong>{formatUsd(totals.base)}</strong></div>
                  <div><span>Service charge 10%</span><strong>{formatUsd(totals.serviceCharge)}</strong></div>
                  <div><span>GST 17%</span><strong>{formatUsd(totals.gst)}</strong></div>
                  <div className="is-total"><span>Total invoice</span><strong>{formatUsd(totals.invoice)}</strong></div>
                </div>

                <div className="finance-allocation">
                  <div className="finance-allocation-heading">
                    <h3>Distribusi Pendapatan</h3>
                    <span>Berdasarkan base revenue</span>
                  </div>
                  <div className="finance-allocation-split">
                    <div><span>Resort operation</span><strong>{formatUsd(totals.operation)}</strong><small>50%</small></div>
                    <div><span>Company share</span><strong>{formatUsd(totals.company)}</strong><small>50%</small></div>
                  </div>
                </div>
              </section>

              <section className="finance-report-panel finance-health-panel">
                <div className="finance-panel-heading">
                  <div>
                    <span>Operational status</span>
                    <h2>Kesiapan Dokumen</h2>
                  </div>
                </div>
                <div className="finance-health-list">
                  <div><span>Experience selesai</span><strong>{completedBookings.length}</strong></div>
                  <div><span>Signed by guest</span><strong>{signedBookings}</strong></div>
                  <div><span>Belum ditandatangani</span><strong>{completedBookings.length - signedBookings}</strong></div>
                  <div><span>Average rating</span><strong>{averageRating}</strong></div>
                </div>
                <div className="finance-tip-total">
                  <span>Tip Lapangan</span>
                  <strong>{formatUsd(totals.tip)}</strong>
                  <small>Dicatat terpisah dari komisi staff</small>
                </div>
              </section>
            </div>

            <section className="finance-report-recent">
              <div className="finance-panel-heading">
                <div>
                  <span>Latest activity</span>
                  <h2>Transaksi Selesai Terbaru</h2>
                </div>
                <small>{completedBookings.length} transaksi</small>
              </div>
              <div className="finance-recent-list">
                {completedBookings.length ? completedBookings.slice(0, 4).map((booking) => (
                  <article key={booking.id}>
                    <div className="finance-recent-booking">
                      <strong>{booking.bookingCode}</strong>
                      <span>{booking.clientName}, Room {booking.roomNumber}</span>
                    </div>
                    <div className="finance-recent-package">
                      <strong>{booking.packageName}</strong>
                      <span>{formatDate(booking.date)}</span>
                    </div>
                    <span className={`tag ${booking.signedByGuest ? 'tag-completed' : 'tag-pending'}`}>
                      {booking.signedByGuest ? 'Signed' : 'Unsigned'}
                    </span>
                    <strong className="finance-recent-amount">{formatUsd(booking.finance.invoiceTotalUsd)}</strong>
                  </article>
                )) : (
                  <div className="finance-report-empty">Belum ada transaksi selesai untuk ditampilkan.</div>
                )}
              </div>
            </section>
          </div>
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
    </div>
  );
}
