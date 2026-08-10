'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { getObservationBySlug } from '@/data/observations';

export default function ObservationDetailPage() {
  const { slug } = useParams();
  const experience = getObservationBySlug(slug);

  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [activeDay, setActiveDay] = useState(experience?.schedule.days[0] ?? null);
  const [toast, setToast] = useState(null);

  if (!experience) {
    notFound();
  }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBook = (e) => {
    e.preventDefault();
    if (!date) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    showToast('success', `Booking ${experience.title} untuk ${guests} tamu berhasil diajukan.`);
    setNotes('');
  };

  const handleCheckAvailability = () => {
    if (!date) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    showToast('info', 'Slot ini biasanya tersedia — konfirmasi final tetap oleh admin.');
  };

  return (
    <div className="fade-in-up stagger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{experience.icon}</span> {experience.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>{experience.tagline}</p>
        </div>
        <Link href="/dashboard/external/jadwal" className="btn btn-secondary btn-sm">
          View Calendar
        </Link>
      </div>

      <div className="info-banner">
        <span className="info-banner-icon">{experience.tip.icon}</span>
        <div>
          <div className="info-banner-title">{experience.tip.title}</div>
          <div className="info-banner-body">{experience.tip.body}</div>
        </div>
      </div>

      <div className="observation-layout" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.9fr', gap: '20px', alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Experience Preview</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3' }}>
              <Image src={experience.image} alt={experience.title} fill sizes="(max-width: 900px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Experience Overview</h2>
          </div>
          <div className="card-body">
            {experience.overview.map((row) => (
              <div className="overview-row" key={row.label}>
                <span className="overview-row-icon">{row.icon}</span>
                <span className="overview-row-label">{row.label}</span>
                <span className="overview-row-value">{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Book {experience.title}</h2>
          </div>
          <form className="card-body" onSubmit={handleBook} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="input-group">
              <label className="input-label">Time Slot</label>
              <select className="input" defaultValue={experience.schedule.display}>
                <option value={experience.schedule.display}>{experience.schedule.time}</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Number of Guests</label>
              <div className="qty-stepper">
                <button type="button" className="btn-icon" onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                <span className="qty-stepper-value">{guests} {guests === 1 ? 'Guest' : 'Guests'}</span>
                <button type="button" className="btn-icon" onClick={() => setGuests((g) => Math.min(20, g + 1))}>+</button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Notes (Optional)</label>
              <textarea
                className="input"
                style={{ minHeight: '70px' }}
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
              />
              <div className="char-counter">{notes.length}/200</div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed' }}>
              Book Now
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCheckAvailability}>
              Check Availability
            </button>
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Recommended Days</h2>
        </div>
        <div className="card-body">
          <div className="slot-grid">
            {experience.schedule.days.map((day) => (
              <button
                type="button"
                key={day}
                className={`slot-card ${activeDay === day ? 'active' : ''}`}
                onClick={() => setActiveDay(day)}
              >
                <div className="slot-card-day">{day}</div>
                <div className="slot-card-time">{experience.schedule.time}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px', marginTop: '20px', alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">About {experience.title}</h2>
          </div>
          <div className="card-body">
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', lineHeight: 1.7, marginBottom: '16px' }}>
              {experience.description}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {experience.highlights.map((h) => (
                <span className="chip" key={h}>{h}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">What You Can See</h2>
          </div>
          <div className="card-body">
            <div className="see-grid">
              {experience.whatYouSee.map((item) => (
                <div className="see-card" key={item.label}>
                  <span className="see-card-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
