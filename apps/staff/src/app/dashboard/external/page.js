'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

function StarIcon({ size = 20 }) {
  return (
    <svg
      className="external-star-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 2.75 14.78 8.4l6.22.9-4.5 4.39 1.06 6.2L12 16.96l-5.56 2.93 1.06-6.2L3 9.3l6.22-.9L12 2.75Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FiveStarProgress({ points, threshold, language }) {
  const pointsPerStar = Math.max(Number(threshold) || 10, 0.01);
  const starProgress = Math.min(points / pointsPerStar, 5);
  const completedStars = Math.min(Math.floor(starProgress), 5);
  const ariaLabel = language === 'en'
    ? `${starProgress.toFixed(1)} of 5 stars, ${points.toFixed(1)} points`
    : `${starProgress.toFixed(1)} dari 5 bintang, ${points.toFixed(1)} poin`;

  return (
    <div className="external-five-star-wrap">
      <div className="external-five-star-meter" role="img" aria-label={ariaLabel}>
        {[0, 1, 2, 3, 4].map((index) => {
          const fillPercent = Math.max(0, Math.min(1, starProgress - index)) * 100;
          return (
            <span className="external-progress-star" key={index}>
              <StarIcon size={32} />
              <span className="external-progress-star-fill" style={{ width: `${fillPercent}%` }}>
                <StarIcon size={32} />
              </span>
            </span>
          );
        })}
      </div>
      <span className="external-five-star-caption">
        {completedStars}/5 {language === 'en' ? 'stars' : 'bintang'}
      </span>
    </div>
  );
}

export default function ExternalStaffPage() {
  const { language, t } = useLanguage();
  const pathname = usePathname();
  const isInternal = pathname.startsWith('/dashboard/internal');
  const observerName = isInternal ? 'Ahmad Fauzi' : 'Budi Santoso';
  const [externalBookings, setExternalBookings] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [rewardSummary, setRewardSummary] = useState(null);
  const myBookings = externalBookings;

  const totalBookings = myBookings.length;
  const bookingAktif = myBookings.filter((booking) => COUNTED_STATUSES.has(booking.status)).length;
  const akanDatang = myBookings.filter((booking) => ['active', 'rescheduled'].includes(booking.status)).length;
  const selesai = myBookings.filter((booking) => booking.status === 'completed').length;
  const top5Bookings = myBookings.slice(0, 5);
  const starUnits = Number(rewardSummary?.starUnits || 0);
  const threshold = Math.max(Number(rewardSummary?.starThreshold || 10), 0.01);
  const fiveStarTarget = threshold * 5;
  const progressPercent = Math.min((starUnits / fiveStarTarget) * 100, 100);

  useEffect(() => {
    let alive = true;
    fetch('/api/bookings')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(language === 'en' ? 'Failed to load staff bookings.' : 'Gagal memuat booking staff.')))
      .then((data) => {
        if (alive) setExternalBookings(data.bookings || []);
      })
      .catch((error) => {
        if (alive) {
          setExternalBookings([]);
          setLoadError(error.message);
        }
      });
    fetch('/api/payouts')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(t('dashboard_load_reward_error'))))
      .then((data) => { if (alive) setRewardSummary(data.summary); })
      .catch((error) => { if (alive) setLoadError(error.message); });

    return () => {
      alive = false;
    };
  }, [language, t]);

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
          <div className="kpi-label">{t('dashboard_commission_total')}</div>
          <div className="kpi-value">${Number(rewardSummary?.commissionUsd || 0).toFixed(2)}</div>
          <div className="kpi-note">{t('dashboard_completed_count').replace('{count}', selesai)}</div>
        </div>
      </section>

      <section className="card external-star-card">
        <div className="card-body">
          <div className="external-star-summary">
            <div className="external-star-main">
              <span className="external-star-icon-wrap">
                <StarIcon size={28} />
              </span>
              <div>
                <div className="kpi-label">{t('dashboard_star_progress')}</div>
                <div className="external-star-value">
                  {starUnits.toFixed(1)} {language === 'en' ? 'points' : 'poin'}
                </div>
              </div>
            </div>
            <FiveStarProgress points={starUnits} threshold={threshold} language={language} />
          </div>
          <div className="progress-bar external-star-progress">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="external-star-note">
            <span>
              {Math.min(starUnits, fiveStarTarget).toFixed(1)} / {fiveStarTarget.toFixed(0)} {language === 'en' ? 'points to 5 stars' : 'poin menuju 5 bintang'}
            </span>
            <span>{t('dashboard_monthly_reward_amount').replace('{amount}', `$${Number(rewardSummary?.starRewardUsd || 0).toFixed(2)}`)}</span>
          </div>
          {loadError && <div className="external-star-error">{loadError}</div>}
        </div>
      </section>

      <div className="external-dashboard-grid">
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">{t('dashboard_history_title')}</h2>
            <Link href={isInternal ? '/dashboard/internal/bookings' : '/dashboard/external/bookings'} className="btn btn-sm btn-secondary">{t('dashboard_see_all')}</Link>
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
