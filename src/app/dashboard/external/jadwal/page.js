'use client';

import React, { useState } from 'react';
import { BOOKINGS } from '@/data/bookings';

export default function ExternalSchedulePage() {
  const [selectedDate, setSelectedDate] = useState('2023-10-25'); // Using typical mock data date

  // Filter bookings that are approved for the selected date
  const approvedBookings = BOOKINGS.filter(b => b.status === 'Disetujui' && b.date === selectedDate);

  const stations = ['ST-01', 'ST-02', 'ST-03'];
  const hours = Array.from({ length: 12 }, (_, i) => 18 + i); // 18:00 to 05:00 next day

  const formatHour = (h) => {
    const hr = h % 24;
    return `${hr.toString().padStart(2, '0')}:00`;
  };

  const isBusy = (stationId, hour) => {
    return approvedBookings.some(b => {
      if (b.stationId !== stationId) return false;
      const start = parseInt(b.startTime.split(':')[0], 10);
      const end = parseInt(b.endTime.split(':')[0], 10);
      let h = hour % 24;
      
      if (start > end) { // Overnight booking
         return h >= start || h < end;
      }
      return h >= start && h < end;
    });
  };

  return (
    <div className="fade-in-up stagger">
      <header className="page-header">
        <h1 className="page-title">Jadwal Publik Stasiun</h1>
        <p>Cek ketersediaan stasiun observasi sebelum melakukan pengajuan booking.</p>
      </header>

      <section className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title">Ketersediaan - {selectedDate}</h2>
            <div>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ 
                  padding: '0.5rem', 
                  border: '2px solid var(--border)', 
                  borderRadius: '0', 
                  fontFamily: 'inherit',
                  background: 'var(--surface)'
                }}
              />
            </div>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {stations.map(station => (
              <div key={station} style={{ border: '2px solid var(--border)', padding: '1rem', background: 'var(--bg-color)' }}>
                <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-heading)', margin: 0, paddingBottom: '0.5rem' }}>
                  Stasiun {station}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '0.5rem', marginTop: '1rem' }}>
                  {hours.map(h => {
                    const busy = isBusy(station, h);
                    return (
                      <div 
                        key={h} 
                        style={{ 
                          padding: '0.5rem', 
                          textAlign: 'center', 
                          background: busy ? 'var(--error)' : 'var(--success)', 
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          border: '1px solid rgba(0,0,0,0.1)'
                        }}
                        title={busy ? 'Sudah dibooking' : 'Tersedia'}
                      >
                        {formatHour(h)}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem', fontSize: '0.9rem', padding: '1rem', background: 'var(--surface)', border: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'var(--success)', border: '1px solid rgba(0,0,0,0.1)' }}></div>
              <span style={{ fontWeight: '500' }}>Tersedia / Kosong</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', background: 'var(--error)', border: '1px solid rgba(0,0,0,0.1)' }}></div>
              <span style={{ fontWeight: '500' }}>Sudah Dibooking</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
