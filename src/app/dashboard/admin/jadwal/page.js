'use client';

import { useState, useMemo } from 'react';
import { BOOKINGS } from '@/data/bookings';
import { STATION_DATA } from '@/data/stations';

/* ── helpers ── */
const fmt = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const fmtShort = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const addDays = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const todayStr = () => new Date().toISOString().split('T')[0];

const startOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split('T')[0];
};

const endOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + (6 - d.getDay()));
  return d.toISOString().split('T')[0];
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'Dikonfirmasi': return { bg: 'var(--emerald)', text: '#fff' };
    case 'Menunggu':     return { bg: 'var(--amber)',   text: '#fff' };
    case 'Dibatalkan':   return { bg: 'var(--accent)',  text: '#fff' };
    case 'Selesai':      return { bg: 'var(--cyan)',    text: '#fff' };
    default:             return { bg: 'var(--text-dim)', text: '#fff' };
  }
};

const getStatusTag = (status) => {
  switch (status) {
    case 'Dikonfirmasi': return 'tag tag-confirmed';
    case 'Menunggu':     return 'tag tag-pending';
    case 'Dibatalkan':   return 'tag tag-cancelled';
    case 'Selesai':      return 'tag tag-completed';
    default:             return 'tag';
  }
};

const toHour = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h + m / 60;
};

const TIMELINE_START = 12;
const TIMELINE_HOURS = 24;
const HOUR_LABELS = Array.from({ length: 13 }, (_, i) => {
  const h = (TIMELINE_START + i * 2) % 24;
  return `${String(h).padStart(2, '0')}:00`;
});

const blockPosition = (timeStart, timeEnd) => {
  let start = toHour(timeStart);
  let end   = toHour(timeEnd);
  if (start < TIMELINE_START) start += 24;
  if (end   < TIMELINE_START) end   += 24;
  if (end <= start) end += 24;
  const left  = ((start - TIMELINE_START) / TIMELINE_HOURS) * 100;
  const width = ((end - start) / TIMELINE_HOURS) * 100;
  return {
    left:  `${Math.max(0, left).toFixed(2)}%`,
    width: `${Math.min(width, 100 - Math.max(0, left)).toFixed(2)}%`,
  };
};

const FILTER_TABS = ['Semua', 'Hari Ini', 'Minggu Ini', 'Bulan Ini'];

export default function JadwalPage() {
  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [sortCol, setSortCol]   = useState('date');
  const [sortDir, setSortDir]   = useState('asc');
  const [searchQ, setSearchQ]   = useState('');

  /* ── filtered bookings for table ── */
  const filteredBookings = useMemo(() => {
    let list = [...BOOKINGS];
    if (activeFilter === 'Hari Ini') {
      list = list.filter(b => b.date === today);
    } else if (activeFilter === 'Minggu Ini') {
      const sw = startOfWeek(today);
      const ew = endOfWeek(today);
      list = list.filter(b => b.date >= sw && b.date <= ew);
    } else if (activeFilter === 'Bulan Ini') {
      const ym = today.slice(0, 7);
      list = list.filter(b => b.date.startsWith(ym));
    }
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(b =>
        b.objectName.toLowerCase().includes(q) ||
        b.observer.toLowerCase().includes(q) ||
        b.station.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let av = a[sortCol] ?? '';
      let bv = b[sortCol] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1  : -1;
      return 0;
    });
    return list;
  }, [activeFilter, sortCol, sortDir, searchQ, today]);

  /* ── bookings for selected date (timeline) ── */
  const timelineBookings = useMemo(() =>
    BOOKINGS.filter(b => b.date === selectedDate),
  [selectedDate]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) =>
    sortCol !== col
      ? <span style={{ opacity: 0.3 }}>↕</span>
      : <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;

  const stats = useMemo(() => ({
    total:        BOOKINGS.length,
    dikonfirmasi: BOOKINGS.filter(b => b.status === 'Dikonfirmasi').length,
    menunggu:     BOOKINGS.filter(b => b.status === 'Menunggu').length,
    dibatalkan:   BOOKINGS.filter(b => b.status === 'Dibatalkan').length,
    selesai:      BOOKINGS.filter(b => b.status === 'Selesai').length,
  }), []);

  return (
    <div className="page-content fade-in-up">

      {/* ── Page Title ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>
          Admin / Jadwal
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>
            Jadwal Pengamatan
          </h1>
          <button className="btn btn-primary btn-sm">+ Tambah Sesi</button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="kpi-grid stagger" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 28 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Jadwal</div>
          <div className="kpi-value" style={{ fontSize: 36 }}>{stats.total}</div>
          <div className="kpi-note">semua waktu</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dikonfirmasi</div>
          <div className="kpi-value" style={{ fontSize: 36, color: 'var(--emerald)' }}>{stats.dikonfirmasi}</div>
          <div className="kpi-note" style={{ color: 'var(--emerald)' }}>siap observasi</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Menunggu</div>
          <div className="kpi-value" style={{ fontSize: 36, color: 'var(--amber)' }}>{stats.menunggu}</div>
          <div className="kpi-note" style={{ color: 'var(--amber)' }}>perlu konfirmasi</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dibatalkan</div>
          <div className="kpi-value" style={{ fontSize: 36, color: 'var(--accent)' }}>{stats.dibatalkan}</div>
          <div className="kpi-note" style={{ color: 'var(--accent)' }}>tidak terlaksana</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Selesai</div>
          <div className="kpi-value" style={{ fontSize: 36, color: 'var(--cyan)' }}>{stats.selesai}</div>
          <div className="kpi-note" style={{ color: 'var(--cyan)' }}>berhasil</div>
        </div>
      </div>

      {/* ── Timeline Card ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <span className="card-title">⏱ Linimasa Stasiun</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(d => addDays(d, -1))}>
              ← Kemarin
            </button>
            <div style={{
              padding: '6px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 13,
              whiteSpace: 'nowrap',
              minWidth: 220,
              textAlign: 'center',
            }}>
              {fmt(selectedDate)}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedDate(d => addDays(d, 1))}>
              Besok →
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDate(today)}>
              Hari Ini
            </button>
          </div>
        </div>

        {/* Info bar */}
        <div style={{
          padding: '10px 22px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          fontSize: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            📅 {fmtShort(selectedDate)}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {timelineBookings.length} sesi pengamatan terjadwal
          </span>
          <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {[
              { label: 'Dikonfirmasi', color: 'var(--emerald)' },
              { label: 'Menunggu',     color: 'var(--amber)'   },
              { label: 'Dibatalkan',   color: 'var(--accent)'  },
              { label: 'Selesai',      color: 'var(--cyan)'    },
            ].map(({ label, color }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: color, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 22px 22px', overflowX: 'auto' }}>
          {/* Hour labels row */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', minWidth: 700 }}>
            <div />
            <div style={{ position: 'relative', height: 20, marginBottom: 8, borderBottom: '1px solid var(--border)' }}>
              {HOUR_LABELS.map((label, i) => (
                <span key={label} style={{
                  position: 'absolute',
                  left: `${(i / (HOUR_LABELS.length - 1)) * 100}%`,
                  transform: i === 0 ? 'none' : i === HOUR_LABELS.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  color: 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                  bottom: 4,
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Station rows */}
          <div style={{ minWidth: 700 }}>
            {STATION_DATA.map((station) => {
              const stationBookings = timelineBookings.filter(b =>
                b.station.toLowerCase().includes(station.short.toLowerCase()) ||
                station.name.toLowerCase().includes(b.station.toLowerCase())
              );
              return (
                <div key={station.short} className="timeline-row">
                  <div className="timeline-station" style={{ borderRight: '1px solid var(--border)', paddingRight: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-primary)' }}>
                      {station.short}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>
                      {station.status === 'online'
                        ? <span style={{ color: 'var(--emerald)' }}>● Online</span>
                        : <span style={{ color: 'var(--text-dim)' }}>○ Offline</span>}
                    </div>
                  </div>
                  <div className="timeline-track" style={{ background: 'var(--bg-primary)' }}>
                    {HOUR_LABELS.slice(1, -1).map((_, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        left: `${((i + 1) / (HOUR_LABELS.length - 1)) * 100}%`,
                        top: 0, bottom: 0, width: 1,
                        background: 'var(--border-subtle)',
                      }} />
                    ))}
                    {stationBookings.length === 0 && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', paddingLeft: 10,
                        fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em',
                      }}>
                        — tidak ada sesi
                      </div>
                    )}
                    {stationBookings.map((booking) => {
                      const pos = blockPosition(booking.timeStart, booking.timeEnd);
                      const { bg, text } = getStatusStyle(booking.status);
                      return (
                        <div
                          key={booking.id}
                          className="timeline-block"
                          title={`${booking.objectName} | ${booking.observer} | ${booking.timeStart}–${booking.timeEnd} | ${booking.status}`}
                          style={{ left: pos.left, width: pos.width, background: bg, color: text, fontSize: 10, minWidth: 4 }}
                        >
                          {parseFloat(pos.width) > 4 && (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {booking.objectName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {timelineBookings.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔭</div>
              <h3>Tidak Ada Sesi</h3>
              <p>Tidak ada pengamatan terjadwal untuk tanggal ini. Navigasi ke tanggal lain atau tambah sesi baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Booking Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <span className="card-title">📋 Daftar Pemesanan</span>
          <div className="filter-bar">
            {FILTER_TABS.map(tab => (
              <button
                key={tab}
                className={`chip${activeFilter === tab ? ' active' : ''}`}
                onClick={() => setActiveFilter(tab)}
              >
                {tab}
                {tab === 'Hari Ini' && (
                  <span style={{
                    marginLeft: 4,
                    background: activeFilter === tab ? 'rgba(255,255,255,0.25)' : 'var(--accent-muted)',
                    color: activeFilter === tab ? '#fff' : 'var(--accent)',
                    fontSize: 9, fontWeight: 700, padding: '1px 4px',
                  }}>
                    {BOOKINGS.filter(b => b.date === today).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="search-bar" style={{ marginLeft: 'auto', maxWidth: 280 }}>
            <input
              type="text"
              placeholder="Cari objek, observer, stasiun…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        <div style={{
          padding: '8px 22px',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border)',
          fontSize: 12, color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{filteredBookings.length}</strong> dari {BOOKINGS.length} sesi</span>
          <span style={{ fontSize: 11 }}>Filter aktif: <strong>{activeFilter}</strong></span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                {[
                  { label: 'Tanggal',   col: 'date'       },
                  { label: 'Objek',     col: 'objectName' },
                  { label: 'Jenis',     col: 'objectType' },
                  { label: 'Observer',  col: 'observer'   },
                  { label: 'Stasiun',   col: 'station'    },
                  { label: 'Waktu',     col: 'timeStart'  },
                  { label: 'Teleskop',  col: 'telescope'  },
                  { label: 'Prioritas', col: 'priority'   },
                  { label: 'Status',    col: 'status'     },
                ].map(({ label, col }) => (
                  <th key={col} onClick={() => handleSort(col)}>
                    {label} <SortIcon col={col} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                    Tidak ada data yang cocok.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const isToday = b.date === today;
                  return (
                    <tr key={b.id} style={{ background: isToday ? 'rgba(229,28,28,0.03)' : undefined }}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{fmtShort(b.date)}</div>
                        {isToday && <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.08em' }}>HARI INI</div>}
                      </td>
                      <td className="name-cell">
                        <div>{b.objectName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 400 }}>{b.designation} · mag {b.magnitude}</div>
                      </td>
                      <td>
                        <span className={`tag tag-${b.objectType === 'Planet Kerdil' ? 'dwarf' : b.objectType.toLowerCase()}`}>
                          {b.objectType}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.observer}</td>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{b.station}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.timeStart} – {b.timeEnd}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.telescope}</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: b.priority === 'Tinggi' ? 'var(--accent)' : b.priority === 'Sedang' ? 'var(--amber)' : 'var(--text-muted)',
                        }}>
                          {b.priority === 'Tinggi' ? '▲' : b.priority === 'Sedang' ? '●' : '▼'} {b.priority}
                        </span>
                      </td>
                      <td><span className={getStatusTag(b.status)}>{b.status}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap', gap: 8,
        }}>
          <span>{filteredBookings.length} sesi ditemukan</span>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, flexWrap: 'wrap' }}>
            {[
              { label: 'Dikonfirmasi', color: 'var(--emerald)', status: 'Dikonfirmasi' },
              { label: 'Menunggu',     color: 'var(--amber)',   status: 'Menunggu'     },
              { label: 'Dibatalkan',   color: 'var(--accent)',  status: 'Dibatalkan'   },
              { label: 'Selesai',      color: 'var(--cyan)',    status: 'Selesai'      },
            ].map(({ label, color, status }) => (
              <span key={status}>
                <span style={{ display: 'inline-block', width: 8, height: 8, background: color, marginRight: 4 }} />
                {label}: {filteredBookings.filter(b => b.status === status).length}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
