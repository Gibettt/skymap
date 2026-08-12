'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, notFound } from 'next/navigation';
import { findPackageForSlug, getExperienceForPackage, getObservationBySlug } from '@/data/observations';

const COMMON_CUSTOMER_DATA = [
  'Nama tamu utama sesuai reservasi',
  'Nomor WhatsApp aktif',
  'Nomor kamar atau villa',
  'Kebangsaan dan bahasa preferensi',
  'Jumlah dewasa dan anak',
  'Tanggal dan jam yang diminta',
  'Metode billing: room charge, cash, card, atau resort billing',
];

const CATEGORY_CUSTOMER_DATA = {
  'sun-observation': [
    'Apakah ada anak ikut sesi solar viewing',
    'Konfirmasi tamu nyaman dengan observasi siang hari',
    'Permintaan foto matahari untuk dikirim ke WhatsApp',
  ],
  'beach-stargazing': [
    'Apakah tamu ingin astro-portrait',
    'Preferensi minuman atau alergi ringan',
    'Permintaan seating: couple, family, atau group',
  ],
  'private-beach-stargazing': [
    'Occasion khusus: honeymoon, birthday, anniversary',
    'Preferensi setup private dan tingkat privasi',
    'Persetujuan astro-portrait',
  ],
  'celestial-dining': [
    'Jumlah pax dining dan nama pasangan/tamu',
    'Dietary restriction atau alergi makanan',
    'Occasion dan request dekorasi meja',
    'Waktu dining sebelum telescope viewing',
  ],
  'kids-stargazing': [
    'Nama dan umur setiap anak',
    'Nama guardian dan nomor WhatsApp guardian',
    'Alergi makanan/minuman anak',
    'Apakah orang tua ikut mendampingi sesi',
  ],
  'moon-observation': [
    'Fase bulan atau tanggal yang tamu incar',
    'Apakah tamu ingin foto bulan',
    'Level penjelasan: basic, family, atau advanced',
  ],
  'night-sky': [
    'Objek langit yang ingin dilihat: planet, rasi, bintang terang',
    'Preferensi bahasa narasi',
    'Persetujuan reschedule jika cuaca buruk',
  ],
  'deep-sky': [
    'Level pengalaman tamu dalam astronomi',
    'Objek target: nebula, cluster, atau galaxy',
    'Ekspektasi sesi remote observatory dan live feed',
  ],
};

function initialForm(experience) {
  const isKids = experience?.slug === 'kids-stargazing';
  return {
    eventDate: '',
    timeSlot: experience?.schedule.time ?? '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    preferredLanguage: 'English',
    roomNumber: '',
    nationality: '',
    adultCount: isKids ? 0 : 2,
    childCount: isKids ? 1 : 0,
    childAges: '',
    specialOccasion: '',
    guardianName: '',
    guardianPhone: '',
    seatingSetup: '',
    photoRequest: '',
    privacyPreference: isKids ? 'Family / guardian' : 'Family / group',
    dietaryRestrictions: '',
    rescheduleConsent: 'Yes',
    slotStatus: 'available',
    paymentMethod: 'Room charge',
    packageNotes: '',
    notes: '',
  };
}

function splitTimeSlot(slot) {
  const [start = '21:00', end = '22:00'] = String(slot || '').split('-').map((part) => part.trim());
  return { start, end };
}

export default function ObservationDetailPage() {
  const { slug } = useParams();
  const pathname = usePathname();
  const staticExperience = getObservationBySlug(slug);
  const [packages, setPackages] = useState([]);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [form, setForm] = useState(() => initialForm(staticExperience));
  const [activeDay, setActiveDay] = useState(staticExperience?.schedule.days[0] ?? null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [moreGuestOpen, setMoreGuestOpen] = useState(false);
  const basePath = pathname.startsWith('/dashboard/internal') ? '/dashboard/internal' : '/dashboard/external';
  const bookingFormId = 'observation-booking-form';

  const selectedPackage = useMemo(() => {
    return findPackageForSlug(packages, slug, staticExperience);
  }, [packages, slug, staticExperience]);

  const experience = useMemo(() => {
    return staticExperience || getExperienceForPackage(selectedPackage);
  }, [selectedPackage, staticExperience]);

  const customerData = useMemo(
    () => experience ? [...COMMON_CUSTOMER_DATA, ...(CATEGORY_CUSTOMER_DATA[experience.slug] ?? [])] : COMMON_CUSTOMER_DATA,
    [experience]
  );

  useEffect(() => {
    fetch('/api/packages')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Gagal memuat package aktif.')))
      .then((data) => setPackages(data.packages || []))
      .catch((error) => {
        setToast({ type: 'error', msg: error.message });
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => {
        setPackagesLoaded(true);
      });
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleBook = async (event) => {
    event.preventDefault();
    if (!form.eventDate) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    if (!selectedPackage) {
      showToast('error', 'Package untuk kategori ini belum ada di database.');
      return;
    }

    setSubmitting(true);
    const timeSlot = form.timeSlot === experience.schedule.time ? form.timeSlot : experience.schedule.time;
    const { start, end } = splitTimeSlot(timeSlot);
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: selectedPackage.id,
        eventDate: form.eventDate,
        timeStart: start,
        timeEnd: end,
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        guestEmail: form.guestEmail,
        preferredLanguage: form.preferredLanguage,
        roomNumber: form.roomNumber,
        nationality: form.nationality,
        adultCount: Number(form.adultCount),
        childCount: Number(form.childCount),
        childAges: form.childAges,
        specialOccasion: form.specialOccasion,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        seatingSetup: form.seatingSetup,
        photoRequest: form.photoRequest,
        privacyPreference: form.privacyPreference,
        dietaryRestrictions: form.dietaryRestrictions,
        rescheduleConsent: form.rescheduleConsent,
        slotStatus: form.slotStatus,
        bookingSource: 'WhatsApp',
        paymentMethod: form.paymentMethod,
        packageNotes: `Kategori: ${experience.title}\n${form.packageNotes}`.trim(),
        notes: form.notes,
      }),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      showToast('error', data.error || 'Booking gagal dibuat.');
      return;
    }

    showToast('success', `Booking ${data.booking.booking_code} berhasil dibuat dan menunggu persetujuan admin.`);
    setForm(initialForm(experience));
  };

  const handleCheckAvailability = () => {
    if (!form.eventDate) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    showToast('info', 'Slot ini biasanya tersedia. Konfirmasi final tetap oleh admin.');
  };

  if (!experience) {
    if (packagesLoaded) notFound();
    return <div className="external-booking-note">Memuat package...</div>;
  }

  const selectedDay = experience.schedule.days.includes(activeDay) ? activeDay : experience.schedule.days[0];
  const selectedTimeSlot = form.timeSlot === experience.schedule.time ? form.timeSlot : experience.schedule.time;

  return (
    <div className="fade-in-up stagger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{experience.icon}</span> {experience.title}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>{experience.tagline}</p>
        </div>
        <Link href={`${basePath}/jadwal`} className="btn btn-secondary btn-sm">
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

      <div className="observation-layout" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 0.95fr', gap: '20px', alignItems: 'start' }}>
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

        <section className="card booking-card">
          <div className="card-header">
            <h2 className="card-title">Book {experience.title}</h2>
          </div>
          <form id={bookingFormId} className="card-body booking-compact-form" onSubmit={handleBook}>
            <div className="booking-intake-strip">
              <div>
                <strong>WhatsApp Intake</strong>
                <span>Menunggu persetujuan admin</span>
              </div>
              <b>{customerData.length} data</b>
            </div>

            <Field label="Guest Name">
              <input className="input" value={form.guestName} onChange={(e) => setField('guestName', e.target.value)} placeholder="Nama pelanggan" required />
            </Field>

            <Field label="WhatsApp / Phone">
              <input className="input" value={form.guestPhone} onChange={(e) => setField('guestPhone', e.target.value)} placeholder="+960..." required />
            </Field>

            <div className="booking-inline-grid">
              <Field label="Date">
                <input className="input" type="date" value={form.eventDate} onChange={(e) => setField('eventDate', e.target.value)} required />
              </Field>

              <Field label="Time">
                <select className="input" value={selectedTimeSlot} onChange={(e) => setField('timeSlot', e.target.value)}>
                  <option value={experience.schedule.time}>{experience.schedule.time}</option>
                </select>
              </Field>
            </div>

            <div className="booking-inline-grid">
              <Field label="Room / Villa">
                <input className="input" value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)} required />
              </Field>

              <Field label="Nationality">
                <input className="input" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} required />
              </Field>
            </div>

            <Field label="Guests">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" type="number" min="0" value={form.adultCount} onChange={(e) => setField('adultCount', e.target.value)} placeholder="Adult" required />
                <input className="input" type="number" min="0" value={form.childCount} onChange={(e) => setField('childCount', e.target.value)} placeholder="Child" required />
              </div>
            </Field>

            <button type="button" className="booking-more-button" onClick={() => setMoreGuestOpen(true)}>
              More Guest Data
              <span>Open landscape intake</span>
            </button>

            {!selectedPackage && (
              <div className="external-booking-note" style={{ color: 'var(--accent)' }}>
                Package database untuk kategori ini belum tersedia. Tambahkan package aktif sebelum booking.
              </div>
            )}

            <div className="booking-submit-row">
              <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed' }} disabled={submitting || !selectedPackage}>
                {submitting ? 'Saving...' : 'Book Now'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCheckAvailability}>
                Check
              </button>
            </div>

            {typeof document !== 'undefined' && moreGuestOpen && createPortal((
              <div className="booking-landscape-overlay" role="dialog" aria-modal="true" aria-label="More guest data">
                <div className="booking-landscape-panel">
                  <div className="booking-landscape-head">
                    <div>
                      <span>Guest Intake</span>
                      <h3>{experience.title}</h3>
                    </div>
                    <button type="button" className="booking-landscape-close" onClick={() => setMoreGuestOpen(false)} aria-label="Close more guest data">
                      x
                    </button>
                  </div>

                  <div className="booking-landscape-body">
                    <section className="booking-landscape-section">
                      <h4>Guest Details</h4>
                      <div className="booking-landscape-grid">
                        <Field label="Email">
                          <input className="input" type="email" value={form.guestEmail} onChange={(e) => setField('guestEmail', e.target.value)} placeholder="guest@email.com" />
                        </Field>

                        <Field label="Preferred Language">
                          <input className="input" value={form.preferredLanguage} onChange={(e) => setField('preferredLanguage', e.target.value)} />
                        </Field>

                        <Field label="Child Ages">
                          <input className="input" value={form.childAges} onChange={(e) => setField('childAges', e.target.value)} placeholder="Contoh: 6, 8, 10" />
                        </Field>

                        <Field label="Guardian Name">
                          <input className="input" value={form.guardianName} onChange={(e) => setField('guardianName', e.target.value)} placeholder="Jika ada anak" />
                        </Field>

                        <Field label="Guardian WhatsApp">
                          <input className="input" value={form.guardianPhone} onChange={(e) => setField('guardianPhone', e.target.value)} placeholder="+960..." />
                        </Field>

                        <Field label="Occasion">
                          <input className="input" value={form.specialOccasion} onChange={(e) => setField('specialOccasion', e.target.value)} placeholder="Birthday, honeymoon, anniversary" />
                        </Field>

                        <Field label="Billing Method">
                          <select className="input" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                            <option>Room charge</option>
                            <option>Cash</option>
                            <option>Card</option>
                            <option>Resort billing</option>
                          </select>
                        </Field>

                        <Field label="Slot Status">
                          <select className="input" value={form.slotStatus} onChange={(e) => setField('slotStatus', e.target.value)}>
                            <option value="available">Available</option>
                            <option value="needs_check">Needs check</option>
                            <option value="confirmed">Confirmed</option>
                          </select>
                        </Field>
                      </div>
                    </section>

                    <section className="booking-landscape-section">
                      <h4>Category Notes</h4>
                      <div className="booking-landscape-grid">
                        <Field label="Seating / Setup">
                          <input className="input" value={form.seatingSetup} onChange={(e) => setField('seatingSetup', e.target.value)} placeholder="Couple, family, private beach, dining table" />
                        </Field>

                        <Field label="Photo Request">
                          <input className="input" value={form.photoRequest} onChange={(e) => setField('photoRequest', e.target.value)} placeholder="Astro portrait, moon photo, sun photo" />
                        </Field>

                        <Field label="Privacy / Group">
                          <input className="input" value={form.privacyPreference} onChange={(e) => setField('privacyPreference', e.target.value)} />
                        </Field>

                        <Field label="Dietary / Allergy">
                          <input className="input" value={form.dietaryRestrictions} onChange={(e) => setField('dietaryRestrictions', e.target.value)} />
                        </Field>

                        <Field label="Weather Reschedule">
                          <select className="input" value={form.rescheduleConsent} onChange={(e) => setField('rescheduleConsent', e.target.value)}>
                            <option>Yes</option>
                            <option>No</option>
                            <option>Ask guest first</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="Detail Jawaban Customer">
                        <textarea
                          className="input"
                          style={{ minHeight: '132px' }}
                          value={form.packageNotes}
                          onChange={(e) => setField('packageNotes', e.target.value)}
                          placeholder="Isi jawaban customer dari checklist kategori."
                        />
                      </Field>

                      <Field label="Internal Notes">
                        <textarea
                          className="input"
                          style={{ minHeight: '86px' }}
                          maxLength={300}
                          value={form.notes}
                          onChange={(e) => setField('notes', e.target.value)}
                          placeholder="Catatan untuk admin/internal..."
                        />
                        <div className="char-counter">{form.notes.length}/300</div>
                      </Field>
                    </section>

                    <section className="booking-landscape-section">
                      <h4>Data To Ask</h4>
                      <div className="booking-landscape-checklist">
                        {customerData.map((item) => (
                          <label className="booking-check-row" key={item}>
                            <input type="checkbox" />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="booking-landscape-foot">
                    <button type="button" className="btn btn-secondary" onClick={() => setMoreGuestOpen(false)}>
                      Done
                    </button>
                    <button type="submit" form={bookingFormId} className="btn btn-primary" style={{ background: '#7c3aed' }} disabled={submitting || !selectedPackage}>
                      {submitting ? 'Saving...' : 'Book Now'}
                    </button>
                  </div>
                </div>
              </div>
            ), document.body)}
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">
          <h2 className="card-title">Data Customer Untuk Booking Ini</h2>
        </div>
        <div className="card-body">
          <div className="customer-data-grid">
            {customerData.map((item) => (
              <div className="booking-checkbox" key={item}>
                <span style={{ color: '#7c3aed', fontWeight: 900 }}>+</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                className={`slot-card ${selectedDay === day ? 'active' : ''}`}
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

function Field({ label, children }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      {children}
    </label>
  );
}
