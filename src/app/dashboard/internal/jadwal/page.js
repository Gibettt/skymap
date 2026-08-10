'use client';

import { useState } from 'react';
import { BOOKINGS } from '@/data/bookings';
import { STATION_DATA } from '@/data/stations';

export default function InternalJadwalPage() {
  const [selectedDate, setSelectedDate] = useState('2026-08-15');

  const filteredBookings = BOOKINGS.filter(b => b.date === selectedDate);
  const timeSlots = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

  return (
    <div className="stagger">
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="card-title">Jadwal Observasi</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <label style={{ fontWeight: 'bold' }}>Pilih Tanggal:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '2px solid var(--text-primary)',
                fontFamily: 'inherit',
                backgroundColor: 'var(--bg-primary)'
              }}
            />
          </div>
        </div>
        <div className="card-body">
          <p style={{ marginBottom: '1rem' }}>Menampilkan jadwal seluruh penugasan observasi (Mode Baca).</p>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  {STATION_DATA.map(st => (
                    <th key={st.id}>{st.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(time => (
                  <tr key={time}>
                    <td style={{ fontWeight: 'bold', width: '100px' }}>{time}</td>
                    {STATION_DATA.map(st => {
                      const booking = filteredBookings.find(b => b.time === time && b.station === st.name);
                      return (
                        <td key={`${st.id}-${time}`} style={{ minWidth: '200px', position: 'relative' }}>
                          {booking ? (
                            <div style={{
                              padding: '0.75rem',
                              backgroundColor: booking.observer === 'Ahmad Fauzi' ? 'cyan' : '#e0e0e0',
                              border: '2px solid #000',
                              fontSize: '0.85rem'
                            }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{booking.id}</div>
                              <div>{booking.client}</div>
                              <div style={{ marginTop: '0.25rem', opacity: 0.8 }}>Oleh: {booking.observer}</div>
                              <div style={{ marginTop: '0.5rem' }}>
                                <span className="tag" style={{
                                  backgroundColor: '#fff',
                                  color: '#000',
                                  fontSize: '0.7rem',
                                  padding: '0.1rem 0.3rem',
                                  border: '1px solid #000'
                                }}>
                                  {booking.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '0.85rem' }}>Kosong</div>
                          )}
                        </td>
                      );
                    })}
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
