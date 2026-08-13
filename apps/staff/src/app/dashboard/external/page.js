'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { calculateStarPoints } from '@ephemeris/finance';
import { BOOKINGS } from '@/data/bookings';

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

function statusLabel(status) {
  const labels = {
    pending_review: 'Pending Review',
    accepted: 'Accepted',
    booked: 'Booked',
    finished_experience: 'Finished Experience',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
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
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Gagal memuat booking staff.')))
      .then((data) => {
        if (alive) setExternalBookings(data.bookings || []);
      })
      .catch((error) => {
        if (alive) setLoadError(error.message);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="external-dashboard-page fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">{isInternal ? 'Dashboard Staff Internal' : 'Dashboard Observer Eksternal'}</h1>
        <p>Selamat datang, {observerName}. Kelola booking customer resort di sini.</p>
      </header>

      <section className="kpi-grid external-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Booking Saya</div>
          <div className="kpi-value">{totalBookings}</div>
          <div className="kpi-note">Sepanjang waktu</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Booking Aktif</div>
          <div className="kpi-value">{bookingAktif}</div>
          <div className="kpi-note">Langsung masuk operasional</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Akan Datang</div>
          <div className="kpi-value">{akanDatang}</div>
          <div className="kpi-note">Jadwal booking aktif</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Selesai</div>
          <div className="kpi-value">{selesai}</div>
          <div className="kpi-note">Observasi selesai</div>
        </div>
      </section>

      <section className="card external-star-card">
        <div className="card-body">
          <div className="external-star-summary">
            <div>
              <div className="kpi-label">Progress Bintang Staff</div>
              <div className="external-star-value">{starValue.toFixed(1)} / 5</div>
            </div>
            <StarMeter value={starValue} />
          </div>
          <div className="progress-bar external-star-progress">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="external-star-note">
            <span>{starPoints.toFixed(1)} / 50 poin</span>
            <span>10 booking = 1 bintang, package kids: 20 anak = 1 bintang</span>
          </div>
          {loadError && <div className="external-star-error">{loadError}</div>}
        </div>
      </section>

      <div className="external-dashboard-grid">
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Riwayat Booking (5 Teratas)</h2>
            <button className="btn btn-sm btn-secondary">Lihat Semua</button>
          </div>
          <div className="card-body">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Stasiun</th>
                    <th>Tanggal</th>
                    <th>Waktu</th>
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
                          {statusLabel(booking.status)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada riwayat booking.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="card external-guide-card">
          <div className="card-header">
            <h2 className="card-title">Panduan Booking</h2>
          </div>
          <div className="card-body">
            <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: 10, margin: 0, fontSize: 13, lineHeight: 1.55 }}>
              <li><strong>Booking Baru:</strong> booking baru yang dibuat akan masuk dengan status <em>Pending Review</em> dan memerlukan persetujuan (ACC) dari admin sebelum menjadi aktif.</li>
              <li><strong>Status:</strong> pantau status booking Anda di tabel riwayat. <em>Pending Review</em> berarti menunggu ACC admin.</li>
              <li><strong>Invoice:</strong> pembayaran tetap dicatat manual oleh resort.</li>
              <li><strong>Signed:</strong> centang setelah tamu tanda tangan fisik.</li>
              <li><strong>Feedback:</strong> kirim link WhatsApp setelah experience selesai.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

function StarMeter({ value }) {
  return (
    <div className="external-star-meter" aria-label={`${value.toFixed(1)} dari 5 bintang`}>
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
