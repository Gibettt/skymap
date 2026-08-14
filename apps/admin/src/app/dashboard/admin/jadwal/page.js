'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

const WEEKDAYS = {
  id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function bookingDateKey(value) {
  return String(value || '').slice(0, 10);
}

function formatTime(value) {
  return String(value || '').slice(0, 5);
}

function localeFor(language) {
  return language === 'en' ? 'en-US' : 'id-ID';
}

function monthTitle(date, language) {
  return new Intl.DateTimeFormat(localeFor(language), { month: 'long', year: 'numeric' }).format(date);
}

function selectedDateTitle(key, language) {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(localeFor(language), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function buildMonthDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const today = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateKey(date);
    return {
      key,
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: key === today,
    };
  });
}

function groupBookings(bookings) {
  return bookings.reduce((acc, booking) => {
    const key = bookingDateKey(booking.event_date);
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(booking);
    return acc;
  }, {});
}

function bookingSort(a, b) {
  return `${a.event_date} ${a.time_start}`.localeCompare(`${b.event_date} ${b.time_start}`);
}

function statusLabel(status) {
  const labels = {
    accepted: 'Accepted',
    booked: 'Booked',
    finished_experience: 'Finished',
    cancelled: 'Cancelled',
  };
  return labels[status] || String(status || '-').replaceAll('_', ' ');
}

function staffRoleLabel(role) {
  if (role === 'internal') return 'Staff Internal';
  if (role === 'external') return 'Staff External';
  return 'Staff';
}

function staffRoleShort(role) {
  if (role === 'internal') return 'INT';
  if (role === 'external') return 'EXT';
  return 'ADM';
}

export default function AdminMonthlyCalendarPage() {
  const { language } = useAdminLanguage();
  const router = useRouter();
  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateKey(now));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;

    async function loadBookings() {
      setError('');
      try {
        const response = await fetch('/api/bookings');
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) throw new Error(language === 'en' ? 'Failed to load calendar bookings.' : 'Gagal memuat data booking kalender.');
        const data = await response.json();
        if (alive) setBookings((data.bookings || []).sort(bookingSort));
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadBookings();
    return () => {
      alive = false;
    };
  }, [router, language]);

  const grouped = useMemo(() => groupBookings(bookings), [bookings]);
  const days = useMemo(() => buildMonthDays(monthDate), [monthDate]);
  const yearOptions = useMemo(() => {
    const year = monthDate.getFullYear();
    return Array.from({ length: 9 }, (_, index) => year - 4 + index);
  }, [monthDate]);
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, month) => ({
    value: month,
    label: new Intl.DateTimeFormat(localeFor(language), { month: 'long' }).format(new Date(2026, month, 1)),
  })), [language]);
  const selectedBookings = grouped[selectedDate] || [];
  const monthBookingCount = days.reduce((total, day) => {
    if (!day.inMonth) return total;
    return total + (grouped[day.key]?.length || 0);
  }, 0);

  const moveMonth = (direction) => {
    setMonthDate((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + direction, 1);
      setSelectedDate(dateKey(next));
      return next;
    });
  };

  const selectMonth = (month) => {
    const next = new Date(monthDate.getFullYear(), Number(month), 1);
    setMonthDate(next);
    setSelectedDate(dateKey(next));
  };

  const selectYear = (year) => {
    const next = new Date(Number(year), monthDate.getMonth(), 1);
    setMonthDate(next);
    setSelectedDate(dateKey(next));
  };

  const goToday = () => {
    const today = new Date();
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateKey(today));
  };

  return (
    <div className="fade-in-up stagger">
      <header className="page-header calendar-page-header">
        <div>
          <h1 className="page-title">{language === 'en' ? 'Monthly Booking Calendar' : 'Kalender Booking Bulanan'}</h1>
          <p>{language === 'en' ? 'Showing bookings from internal and external staff based on database records.' : 'Menampilkan booking dari staff internal dan external berdasarkan data booking database.'}</p>
        </div>
        <div className="calendar-header-actions">
          <Link href="/dashboard/admin/bookings" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>{language === 'en' ? '+ Add Session' : '+ Tambah Sesi'}</Link>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => moveMonth(-1)}>Prev</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={goToday}>Today</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => moveMonth(1)}>Next</button>
        </div>
      </header>

      <section className="staff-calendar-shell">
        <div className="staff-calendar-main">
          <div className="staff-calendar-toolbar">
            <div>
              <div className="calendar-kicker">All Staff Calendar</div>
              <h2>{monthTitle(monthDate, language)}</h2>
            </div>
            <div className="calendar-filter-bar" aria-label={language === 'en' ? 'Filter calendar month and year' : 'Filter bulan dan tahun kalender'}>
              <label>
                <span>{language === 'en' ? 'Month' : 'Bulan'}</span>
                <select value={monthDate.getMonth()} onChange={(event) => selectMonth(event.target.value)}>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{language === 'en' ? 'Year' : 'Tahun'}</span>
                <select value={monthDate.getFullYear()} onChange={(event) => selectYear(event.target.value)}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="calendar-month-stats">
              <strong>{monthBookingCount}</strong>
              <span>{language === 'en' ? 'bookings this month' : 'booking bulan ini'}</span>
            </div>
          </div>

          {error && <div className="external-booking-note" style={{ color: 'var(--accent)' }}>{error}</div>}

          <div className="staff-month-grid">
            {WEEKDAYS[language].map((day) => (
              <div className="staff-calendar-weekday" key={day}>{day}</div>
            ))}

            {days.map((day) => {
              const dayBookings = grouped[day.key] || [];
              const shown = dayBookings.slice(0, 3);
              const extra = dayBookings.length - shown.length;

              return (
                <button
                  className={`staff-calendar-day ${day.inMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${selectedDate === day.key ? 'selected' : ''}`}
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDate(day.key)}
                >
                  <span className="staff-calendar-date-number">{day.day}</span>
                  <div className="staff-calendar-events">
                    {loading && day.inMonth && day.day <= 7 ? <span className="calendar-event skeleton">Loading</span> : null}
                    {!loading && shown.map((booking) => (
                      <span className="calendar-event" key={booking.id}>
                        <b>{formatTime(booking.time_start)}</b>
                        <span>{booking.guest_name} - {staffRoleShort(booking.staff_role)}</span>
                      </span>
                    ))}
                    {!loading && extra > 0 && <span className="calendar-event more">{language === 'en' ? `+${extra} more` : `+${extra} lainnya`}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="staff-calendar-side">
          <div className="calendar-side-head">
            <span>Selected Date</span>
            <h3>{selectedDateTitle(selectedDate, language)}</h3>
          </div>

          <div className="calendar-day-bookings">
            {loading && <div className="calendar-empty">{language === 'en' ? 'Loading bookings...' : 'Memuat booking...'}</div>}
            {!loading && selectedBookings.length === 0 && (
              <div className="calendar-empty">
                <strong>{language === 'en' ? 'No bookings' : 'Tidak ada booking'}</strong>
                <span>{language === 'en' ? 'This date is still empty.' : 'Tanggal ini masih kosong.'}</span>
              </div>
            )}
            {!loading && selectedBookings.map((booking) => (
              <article className="calendar-booking-card" key={booking.id}>
                <div className="calendar-booking-top">
                  <strong>{formatTime(booking.time_start)} - {formatTime(booking.time_end)}</strong>
                  <span>{statusLabel(booking.status)}</span>
                </div>
                <h4>{booking.guest_name}</h4>
                <div className="calendar-staff-source">
                  <span>{staffRoleLabel(booking.staff_role)}</span>
                  <strong>{booking.staff_name}</strong>
                </div>
                <div className="calendar-booking-meta">
                  <span>{booking.package_name}</span>
                  <span>{booking.location}</span>
                  <span>Room {booking.room_number}</span>
                  {booking.resort_name && <span>{booking.resort_name}</span>}
                </div>
                {booking.notes && <p>{booking.notes}</p>}
              </article>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
