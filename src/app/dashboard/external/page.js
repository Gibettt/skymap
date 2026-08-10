'use client';

import React from 'react';
import { BOOKINGS } from '@/data/bookings';

export default function ExternalStaffPage() {
  const observerName = 'Budi Santoso';
  const myBookings = BOOKINGS.filter(b => b.observer === observerName);
  
  const totalBookings = myBookings.length;
  const menungguKonfirmasi = myBookings.filter(b => b.status === 'Menunggu').length;
  const akanDatang = myBookings.filter(b => b.status === 'Disetujui').length;
  const selesai = myBookings.filter(b => b.status === 'Selesai').length;

  const top5Bookings = myBookings.slice(0, 5);

  return (
    <div className="external-dashboard-page fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">Dashboard Observer Eksternal</h1>
        <p>Selamat datang, {observerName}. Kelola pengajuan observasi Anda di sini.</p>
      </header>

      <section className="kpi-grid external-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Booking Saya</div>
          <div className="kpi-value">{totalBookings}</div>
          <div className="kpi-note">Sepanjang waktu</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Menunggu Konfirmasi</div>
          <div className="kpi-value">{menungguKonfirmasi}</div>
          <div className="kpi-note">Sedang direview Admin</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Akan Datang</div>
          <div className="kpi-value">{akanDatang}</div>
          <div className="kpi-note">Jadwal disetujui</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Selesai</div>
          <div className="kpi-value">{selesai}</div>
          <div className="kpi-note">Observasi selesai</div>
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
                  {top5Bookings.length > 0 ? top5Bookings.map(b => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.stationId}</td>
                      <td>{b.date}</td>
                      <td>{b.startTime} - {b.endTime}</td>
                      <td>
                        <span className={`tag ${b.status === 'Disetujui' ? 'tag-success' : b.status === 'Menunggu' ? 'tag-warning' : b.status === 'Ditolak' ? 'tag-error' : 'tag-neutral'}`}>
                          {b.status}
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
              <li><strong>Prioritas:</strong> staff internal dapat memvalidasi status operasional.</li>
              <li><strong>External:</strong> booking baru masuk sebagai pending review.</li>
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
