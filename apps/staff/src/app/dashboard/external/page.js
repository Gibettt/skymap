'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { calculateStarPoints } from '@ephemeris/finance';
import { BOOKINGS } from '@/data/bookings';
import { useLanguage } from '@/context/LanguageContext';

const COUNTED_STATUSES = new Set([
  'pending_review',
  'accepted',
  'booked',
  'finished_experience',
  'Menunggu',
  'Disetujui',
  'Booked',
  'Finished Experience',
]);

function getField(booking, snakeName, camelName) {
  return booking[snakeName] ?? booking[camelName];
}

function statusLabel(status, language = 'id') {
  const isEn = language === 'en';
  const labels = {
    pending_review: isEn ? 'Pending Review' : 'Menunggu Admin',
    accepted: isEn ? 'Accepted' : 'Diterima',
    booked: 'Booked',
    finished_experience: isEn ? 'Finished Experience' : 'Selesai',
    rejected: isEn ? 'Rejected' : 'Ditolak',
    cancelled: isEn ? 'Cancelled' : 'Dibatalkan',
  };
  return labels[status] || status;
}

function statusClass(status) {
  if (['accepted', 'booked', 'Disetujui', 'Booked'].includes(status)) return 'tag-confirmed';
  if (['pending_review', 'Menunggu'].includes(status)) return 'tag-pending';
  if (['finished_experience', 'Finished Experience', 'Selesai'].includes(status)) return 'tag-completed';
  if (['rejected', 'Ditolak', 'cancelled', 'Cancelled'].includes(status)) return 'tag-cancelled';
  return 'tag-info';
}

export default function ExternalStaffPage() {
  const { language, t } = useLanguage();
  const pathname = usePathname();
  const isInternal = pathname.startsWith('/dashboard/internal');
  const observerName = isInternal ? 'Ahmad Fauzi' : 'Budi Santoso';
  const [externalBookings, setExternalBookings] = useState(null);
  const [loadError, setLoadError] = useState('');
  const fallbackBookings = BOOKINGS.filter((booking) => booking.observer === observerName);
  const myBookings = externalBookings || fallbackBookings;

  const totalBookings = myBookings.length;
  const bookingAktif = myBookings.filter((booking) => COUNTED_STATUSES.has(booking.status)).length;
  const akanDatang = myBookings.filter((booking) => ['accepted', 'booked', 'Disetujui', 'Booked'].includes(booking.status)).length;
  const selesai = myBookings.filter((booking) => ['finished_experience', 'Finished Experience', 'Selesai'].includes(booking.status)).length;
  const top5Bookings = myBookings.slice(0, 5);
  const starPoints = useMemo(() => calculateStarPoints(myBookings), [myBookings]);
  const starValue = Math.min(starPoints / 10, 5);
  const progressPercent = Math.min((starPoints / 50) * 100, 100);

  useEffect(() => {
    let alive = true;
    fetch('/api/bookings')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(language === 'en' ? 'Failed to load staff bookings.' : 'Gagal memuat booking staff.')))
      .then((data) => {
        if (alive) setExternalBookings(data.bookings || []);
      })
      .catch((error) => {
        if (alive) setLoadError(error.message);
      });

    return () => {
      alive = false;
    };
  }, [language]);

  return (
    <div className="external-dashboard-page fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{t(isInternal ? 'dashboard_internal_title' : 'dashboard_external_title')}</h1>
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
          <div className="kpi-label">{t('dashboard_finished')}</div>
          <div className="kpi-value">{selesai}</div>
          <div className="kpi-note">{t('dashboard_finished_note')}</div>
        </div>
      </section>

      <section className="card external-star-card">
        <div className="card-body">
          <div className="external-star-summary">
            <div>
              <div className="kpi-label">{t('dashboard_star_progress')}</div>
              <div className="external-star-value">{starValue.toFixed(1)} / 5</div>
            </div>
            <StarMeter value={starValue} />
          </div>
          <div className="progress-bar external-star-progress">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="external-star-note">
            <span>{t('dashboard_points').replace('{points}', starPoints.toFixed(1))}</span>
            <span>{t('dashboard_star_rule')}</span>
          </div>
          {loadError && <div className="external-star-error">{loadError}</div>}
        </div>
      </section>

      <div className="external-dashboard-grid">
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">{t('dashboard_history_title')}</h2>
            <button className="btn btn-sm btn-secondary">{t('dashboard_see_all')}</button>
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
                    <th>Status</th>
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
              <li><strong>Status:</strong> {t('dashboard_guide_status')}</li>
              <li><strong>Invoice:</strong> {t('dashboard_guide_invoice')}</li>
              <li><strong>Signed:</strong> {t('dashboard_guide_signed')}</li>
              <li><strong>Feedback:</strong> {t('dashboard_guide_feedback')}</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StarMeter({ value }) {
  const { language } = useLanguage();
  return (
    <div className="external-star-meter" aria-label={language === 'en' ? `${value.toFixed(1)} out of 5 stars` : `${value.toFixed(1)} dari 5 bintang`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, value - index)) * 100;
        return (
          <span className="external-star" key={index}>
            <span className="external-star-fill" style={{ width: `${fill}%` }} />
          </span>
        );
      })}
    </div>
  );
}
