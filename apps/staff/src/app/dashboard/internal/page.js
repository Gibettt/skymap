'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';

const COUNTED_STATUSES = new Set([
  'pending',
  'active',
  'rescheduled',
]);

function getField(booking, snakeName, camelName) {
  return booking[snakeName] ?? booking[camelName];
}

function statusLabel(status, language = 'id') {
  const isEn = language === 'en';
  const labels = {
    pending: isEn ? 'Pending' : 'Menunggu',
    active: isEn ? 'Active' : 'Aktif',
    completed: isEn ? 'Completed' : 'Selesai',
    rescheduled: isEn ? 'Rescheduled' : 'Dijadwalkan ulang',
    cancelled_by_guest: isEn ? 'Cancelled by guest' : 'Dibatalkan tamu',
    cancelled_weather: isEn ? 'Cancelled by weather' : 'Dibatalkan karena cuaca',
  };
  return labels[status] || status;
}

function statusClass(status) {
  if (['active', 'rescheduled'].includes(status)) return 'tag-confirmed';
  if (status === 'pending') return 'tag-pending';
  if (status === 'completed') return 'tag-completed';
  if (status.startsWith('cancelled_')) return 'tag-cancelled';
  return 'tag-info';
}

export default function InternalStaffPage() {
  const { language, t } = useLanguage();
  const observerName = 'Ahmad Fauzi';
  const [internalBookings, setInternalBookings] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [rewardSummary, setRewardSummary] = useState(null);
  const myBookings = internalBookings;

  const totalBookings = myBookings.length;
  const bookingAktif = myBookings.filter((booking) => COUNTED_STATUSES.has(booking.status)).length;
  const akanDatang = myBookings.filter((booking) => ['active', 'rescheduled'].includes(booking.status)).length;
  const selesai = myBookings.filter((booking) => booking.status === 'completed').length;
  const top5Bookings = myBookings.slice(0, 5);

  useEffect(() => {
    let alive = true;
    fetch('/api/bookings')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(language === 'en' ? 'Failed to load staff bookings.' : 'Gagal memuat booking staff.')))
      .then((data) => {
        if (alive) setInternalBookings(data.bookings || []);
      })
      .catch((error) => {
        if (alive) {
          setInternalBookings([]);
          setLoadError(error.message);
        }
      });
    fetch('/api/payouts')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(t('dashboard_load_commission_error'))))
      .then((data) => { if (alive) setRewardSummary(data.summary); })
      .catch((error) => { if (alive) setLoadError(error.message); });

    return () => {
      alive = false;
    };
  }, [language, t]);

  return (
    <div className="external-dashboard-page fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{t('dashboard_internal_title')}</h1>
        <p>{t('dashboard_welcome').replace('{name}', observerName)}</p>
      </header>

      <section className="kpi-grid external-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">{t('dashboard_total_bookings')}</div>
          <div className="kpi-value">{totalBookings}</div>
          <div className="kpi-note">{t('dashboard_all_time')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('dashboard_active_bookings')}</div>
          <div className="kpi-value">{bookingAktif}</div>
          <div className="kpi-note">{t('dashboard_operational_note')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('dashboard_upcoming')}</div>
          <div className="kpi-value">{akanDatang}</div>
          <div className="kpi-note">{t('dashboard_active_schedule')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('dashboard_commission_total')}</div>
          <div className="kpi-value">${Number(rewardSummary?.commissionUsd || 0).toFixed(2)}</div>
          <div className="kpi-note">{t('dashboard_completed_count').replace('{count}', selesai)}</div>
        </div>
      </section>

      {loadError && (
        <div className="external-star-error">{loadError}</div>
      )}

      <div className="external-dashboard-grid">
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">{t('dashboard_history_title')}</h2>
            <Link href="/dashboard/internal/bookings" className="btn btn-sm btn-secondary">{t('dashboard_see_all')}</Link>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{t('table_station')}</th>
                    <th>{t('table_date')}</th>
                    <th>{t('table_time')}</th>
                    <th>{t('common_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {top5Bookings.length > 0 ? top5Bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td>{getField(booking, 'booking_code', 'bookingCode') || booking.id}</td>
                      <td>{getField(booking, 'package_name', 'packageName') || getField(booking, 'station', 'stationId')}</td>
                      <td>{String(getField(booking, 'event_date', 'date') || '').slice(0, 10)}</td>
                      <td>{getField(booking, 'time_start', 'timeStart')} - {getField(booking, 'time_end', 'timeEnd')}</td>
                      <td>
                        <span className={`tag ${statusClass(booking.status)}`}>
                          {statusLabel(booking.status, language)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>{t('dashboard_no_history')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="card external-guide-card">
          <div className="card-header">
            <h2 className="card-title">{t('dashboard_booking_guide')}</h2>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 10, margin: 0, fontSize: 13, lineHeight: 1.55 }}>
              <li><strong>{language === 'en' ? 'New Booking' : 'Booking Baru'}:</strong> {t('dashboard_guide_new')}</li>
              <li><strong>{t('dashboard_status_label')}:</strong> {t('dashboard_guide_status')}</li>
              <li><strong>{t('dashboard_invoice_label')}:</strong> {t('dashboard_guide_invoice')}</li>
              <li><strong>{t('dashboard_signed_label')}:</strong> {t('dashboard_guide_signed')}</li>
              <li><strong>{t('dashboard_feedback_label')}:</strong> {t('dashboard_guide_feedback')}</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
