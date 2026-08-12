'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { findPackageForSlug, getExperienceForPackage } from '@/data/observations';

const FAMILY_INTAKE_FIELDS = 21;
const DEFAULT_TIME_SLOT = '21:00 - 22:00';

function initialForm() {
  return {
    eventDate: '',
    timeSlot: '',
    preferredLanguage: 'English',
    roomNumber: '',
    nationality: '',
    adultCount: 2,
    childCount: 1,
    fatherName: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherOccupation: '',
    fatherPackages: [],
    motherName: '',
    motherPhone: '',
    motherEmail: '',
    motherOccupation: '',
    motherPackages: [],
    childName: '',
    childAge: '',
    childGender: '',
    childSchoolGrade: '',
    childAstronomyLevel: 'Beginner',
    childComfortNotes: '',
    childPackages: [],
    specialOccasion: '',
    seatingSetup: 'Family / guardian',
    photoRequest: 'Ask parents first',
    privacyPreference: 'Family / guardian',
    dietaryRestrictions: '',
    rescheduleConsent: 'Yes',
    slotStatus: 'available',
    paymentMethod: 'Room charge',
    packageNotes: '',
    notes: '',
  };
}

function splitTimeSlot(slot) {
  const [start = '21:00', end = '22:00'] = String(slot || DEFAULT_TIME_SLOT).split('-').map((part) => part.trim());
  return { start, end };
}

function packageNames(packages, ids) {
  return ids.map((id) => packages.find((pkg) => pkg.id === id)?.name).filter(Boolean);
}

function packageIdsFromNames(packages, names) {
  return names.map((name) => packages.find((pkg) => pkg.name === name)?.id).filter(Boolean);
}

function addOnNames(addOns, owner) {
  if (!Array.isArray(addOns)) return [];
  return addOns
    .filter((item) => String(item).startsWith(`${owner}: `))
    .map((item) => String(item).replace(`${owner}: `, '').trim())
    .filter(Boolean);
}

function noteLine(notes, label) {
  return String(notes || '').split('\n').find((line) => line.startsWith(`${label}:`)) || '';
}

function notePart(line, label) {
  const part = String(line || '').split('|').find((item) => item.trim().startsWith(`${label}:`));
  return part ? part.replace(`${label}:`, '').trim() : '';
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timeValue(value) {
  return value ? String(value).slice(0, 5) : '';
}

function statusLabel(status) {
  const labels = {
    pending_review: 'Menunggu Admin',
    accepted: 'Diterima',
    rejected: 'Ditolak',
    booked: 'Booked',
    finished_experience: 'Finished',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function statusClass(status) {
  if (['accepted', 'booked', 'finished_experience'].includes(status)) return 'tag-confirmed';
  if (['rejected', 'cancelled'].includes(status)) return 'tag-cancelled';
  return 'tag-pending';
}

function cleanPackageName(name) {
  return String(name || '').replace(/^(Ayah|Ibu|Anak):\s*/, '').trim();
}

function bookingPackageText(booking) {
  const names = [
    booking.package_name,
    ...(Array.isArray(booking.add_ons) ? booking.add_ons.map(cleanPackageName) : []),
  ].map(cleanPackageName).filter(Boolean);

  return [...new Set(names)].join(', ');
}

function noteValue(notes, label) {
  return noteLine(notes, label).replace(`${label}:`, '').trim() || '-';
}

export default function FamilyBookingForm({ basePath, fixedSlug = null, staticExperience = null, listMode = false }) {
  const [packages, setPackages] = useState([]);
  const [packagesLoaded, setPackagesLoaded] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoaded, setBookingsLoaded] = useState(!listMode);
  const [showForm, setShowForm] = useState(!listMode);
  const [form, setForm] = useState(initialForm);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fixedPackage = useMemo(() => {
    if (!fixedSlug) return null;
    return findPackageForSlug(packages, fixedSlug, staticExperience);
  }, [fixedSlug, packages, staticExperience]);

  const selectedPackageIds = [
    ...form.fatherPackages,
    ...form.motherPackages,
    ...form.childPackages,
  ];
  const selectedPackageId = selectedPackageIds[0] || '';
  const selectedPackage = fixedPackage || packages.find((pkg) => pkg.id === selectedPackageId);
  const canSubmitPackage = Boolean(fixedPackage || selectedPackageIds.length);
  const submitPackage = selectedPackage || packages.find((pkg) => selectedPackageIds.includes(pkg.id)) || packages[0];
  const experience = staticExperience || getExperienceForPackage(selectedPackage);
  const pageTitle = experience?.title || 'Form Booking';
  const pageTagline = experience?.tagline || 'Isi data keluarga dan package tambahan dalam satu form.';
  const selectedTimeSlot = form.timeSlot || experience?.schedule?.time || DEFAULT_TIME_SLOT;

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

  const loadBookings = () => {
    if (!listMode) return;
    fetch('/api/bookings')
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Gagal memuat booking.')))
      .then((data) => setBookings(data.bookings || []))
      .catch((error) => showToast('error', error.message))
      .finally(() => setBookingsLoaded(true));
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listMode]);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const togglePackage = (field, packageId) => {
    setForm((current) => {
      const currentIds = current[field];
      const nextIds = currentIds.includes(packageId)
        ? currentIds.filter((id) => id !== packageId)
        : [...currentIds, packageId];
      return { ...current, [field]: nextIds };
    });
  };

  const parentName = form.fatherName || form.motherName;
  const parentPhone = form.fatherPhone || form.motherPhone;
  const parentEmail = form.fatherEmail || form.motherEmail;
  const childAges = [form.childName, form.childAge ? `${form.childAge} years` : null, form.childGender].filter(Boolean).join(' - ');
  const fatherPackageNames = packageNames(packages, form.fatherPackages);
  const motherPackageNames = packageNames(packages, form.motherPackages);
  const childPackageNames = packageNames(packages, form.childPackages);
  const addOns = [
    ...fatherPackageNames.map((name) => `Ayah: ${name}`),
    ...motherPackageNames.map((name) => `Ibu: ${name}`),
    ...childPackageNames.map((name) => `Anak: ${name}`),
  ];

  const buildFamilyNotes = () => [
    `Package utama: ${selectedPackage?.name || pageTitle}`,
    `Ayah: ${form.fatherName} | WhatsApp: ${form.fatherPhone} | Email: ${form.fatherEmail || '-'} | Pekerjaan: ${form.fatherOccupation || '-'}`,
    `Package ayah: ${fatherPackageNames.join(', ') || '-'}`,
    `Ibu: ${form.motherName} | WhatsApp: ${form.motherPhone} | Email: ${form.motherEmail || '-'} | Pekerjaan: ${form.motherOccupation || '-'}`,
    `Package ibu: ${motherPackageNames.join(', ') || '-'}`,
    `Anak: ${form.childName} | Umur: ${form.childAge} | Gender: ${form.childGender || '-'} | Kelas: ${form.childSchoolGrade || '-'}`,
    `Package anak: ${childPackageNames.join(', ') || '-'}`,
    `Level astronomi anak: ${form.childAstronomyLevel}`,
    `Kenyamanan anak: ${form.childComfortNotes || '-'}`,
    form.packageNotes ? `Detail tambahan: ${form.packageNotes}` : null,
  ].filter(Boolean).join('\n');

  const handleBook = async (event) => {
    event.preventDefault();
    if (!form.eventDate) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    if (!canSubmitPackage || !submitPackage) {
      showToast('error', 'Pilih minimal satu package di data ayah, ibu, atau anak.');
      return;
    }
    if (!parentName || !parentPhone || !form.fatherName || !form.motherName || !form.childName || !form.childAge) {
      showToast('error', 'Lengkapi data ayah, ibu, dan anak terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    const { start, end } = splitTimeSlot(selectedTimeSlot);
    const response = await fetch(editingBooking ? `/api/bookings/${editingBooking.id}` : '/api/bookings', {
      method: editingBooking ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: submitPackage.id,
        eventDate: form.eventDate,
        timeStart: start,
        timeEnd: end,
        guestName: parentName,
        guestPhone: parentPhone,
        guestEmail: parentEmail,
        preferredLanguage: form.preferredLanguage,
        roomNumber: form.roomNumber,
        nationality: form.nationality,
        adultCount: Number(form.adultCount),
        childCount: Number(form.childCount),
        childAges,
        specialOccasion: form.specialOccasion,
        guardianName: parentName,
        guardianPhone: parentPhone,
        seatingSetup: form.seatingSetup,
        photoRequest: form.photoRequest,
        privacyPreference: form.privacyPreference,
        dietaryRestrictions: form.dietaryRestrictions,
        rescheduleConsent: form.rescheduleConsent,
        slotStatus: form.slotStatus,
        bookingSource: 'WhatsApp',
        paymentMethod: form.paymentMethod,
        addOns,
        packageNotes: buildFamilyNotes(),
        notes: form.notes,
      }),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      showToast('error', data.error || 'Booking gagal dibuat.');
      return;
    }

    showToast('success', `Booking ${data.booking.booking_code} berhasil ${editingBooking ? 'diperbarui' : 'dibuat'} dan menunggu persetujuan admin.`);
    setForm(initialForm());
    setEditingBooking(null);
    if (listMode) {
      setBookings((current) => editingBooking
        ? current.map((booking) => booking.id === data.booking.id ? data.booking : booking)
        : [data.booking, ...current]);
      setShowForm(false);
      setBookingsLoaded(false);
      loadBookings();
    }
  };

  const startCreate = () => {
    setEditingBooking(null);
    setForm(initialForm());
    setShowForm(true);
  };

  const startEdit = (booking) => {
    const notes = booking.package_notes || '';
    const fatherLine = noteLine(notes, 'Ayah');
    const motherLine = noteLine(notes, 'Ibu');
    const childLine = noteLine(notes, 'Anak');
    const fatherPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Ayah'));
    const motherPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Ibu'));
    const childPackageIds = packageIdsFromNames(packages, addOnNames(booking.add_ons, 'Anak'));

    setEditingBooking(booking);
    setForm({
      ...initialForm(),
      eventDate: dateValue(booking.event_date),
      timeSlot: `${timeValue(booking.time_start)} - ${timeValue(booking.time_end)}`,
      preferredLanguage: booking.preferred_language || 'English',
      roomNumber: booking.room_number || '',
      nationality: booking.nationality || '',
      adultCount: Number(booking.adult_count || 0),
      childCount: Number(booking.child_count || 0),
      fatherName: notePart(fatherLine, 'Ayah') || booking.guardian_name || booking.guest_name || '',
      fatherPhone: notePart(fatherLine, 'WhatsApp') || booking.guardian_phone || booking.guest_phone || '',
      fatherEmail: notePart(fatherLine, 'Email') || booking.guest_email || '',
      fatherOccupation: notePart(fatherLine, 'Pekerjaan'),
      fatherPackages: fatherPackageIds.length ? fatherPackageIds : [booking.package_id].filter(Boolean),
      motherName: notePart(motherLine, 'Ibu'),
      motherPhone: notePart(motherLine, 'WhatsApp'),
      motherEmail: notePart(motherLine, 'Email'),
      motherOccupation: notePart(motherLine, 'Pekerjaan'),
      motherPackages: motherPackageIds,
      childName: notePart(childLine, 'Anak') || String(booking.child_ages || '').split(' - ')[0] || '',
      childAge: notePart(childLine, 'Umur') || '',
      childGender: notePart(childLine, 'Gender') || '',
      childSchoolGrade: notePart(childLine, 'Kelas') || '',
      childPackages: childPackageIds,
      specialOccasion: booking.special_occasion || '',
      seatingSetup: booking.seating_setup || 'Family / guardian',
      photoRequest: booking.photo_request || 'Ask parents first',
      privacyPreference: booking.privacy_preference || 'Family / guardian',
      dietaryRestrictions: booking.dietary_restrictions || '',
      rescheduleConsent: booking.reschedule_consent || 'Yes',
      slotStatus: booking.slot_status || 'available',
      paymentMethod: booking.payment_method || 'Room charge',
      packageNotes: '',
      notes: booking.notes || '',
    });
    setShowForm(true);
  };

  const handleCheckAvailability = () => {
    if (!form.eventDate) {
      showToast('error', 'Pilih tanggal terlebih dahulu.');
      return;
    }
    showToast('info', 'Slot ini biasanya tersedia. Konfirmasi final tetap oleh admin.');
  };

  if (!packagesLoaded) {
    return <div className="external-booking-note">Memuat package...</div>;
  }

  if (listMode && !showForm) {
    return (
      <div className="fade-in-up">
        <div className="form-booking-toolbar">
          <div>
            <h1>Form Booking</h1>
            <p>Booking yang sudah dikirim ke admin untuk direview.</p>
          </div>
          <button type="button" className="btn btn-primary" style={{ background: '#7c3aed' }} onClick={startCreate}>
            Tambah Booking
          </button>
        </div>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Submitted Bookings</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{bookings.length} booking</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Guest</th>
                  <th>Package</th>
                  <th>Event</th>
                  <th>Room</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!bookingsLoaded && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>Memuat booking...</td></tr>
                )}
                {bookingsLoaded && bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="name-cell">{booking.booking_code}</td>
                    <td>
                      {booking.guest_name}
                      <br />
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{booking.guest_phone || '-'}</span>
                    </td>
                    <td><strong>{bookingPackageText(booking) || '-'}</strong></td>
                    <td>{dateValue(booking.event_date)}<br /><span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{timeValue(booking.time_start)} - {timeValue(booking.time_end)}</span></td>
                    <td>{booking.room_number || '-'}</td>
                    <td><span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setViewingBooking(booking)}>View</button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(booking)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {bookingsLoaded && bookings.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>Belum ada booking.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {toast && (
          <div className="toast-container">
            <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
          </div>
        )}

        {viewingBooking && <StaffBookingView booking={viewingBooking} onClose={() => setViewingBooking(null)} onEdit={() => { const booking = viewingBooking; setViewingBooking(null); startEdit(booking); }} />}
      </div>
    );
  }

  return (
    <div className="fade-in-up stagger">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {editingBooking ? `Edit ${editingBooking.booking_code}` : pageTitle}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>{pageTagline}</p>
        </div>
        {listMode && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowForm(false)}>
            Lihat List
          </button>
        )}
        <Link href={`${basePath}/jadwal`} className="btn btn-secondary btn-sm">
          View Calendar
        </Link>
      </div>

      <section className="card booking-form-card">
        <div className="card-header">
          <h2 className="card-title">Family Intake Form</h2>
        </div>
        <form className="card-body family-intake-form" onSubmit={handleBook}>
          <div className="booking-intake-strip">
            <div>
              <strong>{selectedPackage?.name || 'Pilih package di data keluarga'}</strong>
              <span>Data orang tua, data anak, dan package tambahan per orang</span>
            </div>
            <b>{FAMILY_INTAKE_FIELDS} data</b>
          </div>

          <section className="booking-form-section">
            <h3>Data Reservasi</h3>
            <div className="booking-form-grid">
              <Field label="Date">
                <input className="input" type="date" value={form.eventDate} onChange={(e) => setField('eventDate', e.target.value)} required />
              </Field>

              <Field label="Time">
                <input className="input" value={selectedTimeSlot} onChange={(e) => setField('timeSlot', e.target.value)} placeholder={DEFAULT_TIME_SLOT} required />
              </Field>

              <Field label="Room / Villa">
                <input className="input" value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)} placeholder="Contoh: 205 / Villa 3" required />
              </Field>

              <Field label="Family Nationality">
                <input className="input" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} placeholder="Nationality" required />
              </Field>

              <Field label="Preferred Language">
                <input className="input" value={form.preferredLanguage} onChange={(e) => setField('preferredLanguage', e.target.value)} />
              </Field>

              <Field label="Billing Method">
                <select className="input" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                  <option>Room charge</option>
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Resort billing</option>
                </select>
              </Field>

              <Field label="Adults">
                <input className="input" type="number" min="0" value={form.adultCount} onChange={(e) => setField('adultCount', e.target.value)} required />
              </Field>

              <Field label="Children">
                <input className="input" type="number" min="1" value={form.childCount} onChange={(e) => setField('childCount', e.target.value)} required />
              </Field>
            </div>
          </section>

          <section className="booking-form-section">
            <h3>Data Ayah</h3>
            <div className="booking-form-grid">
              <Field label="Father Name">
                <input className="input" value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} placeholder="Nama ayah" required />
              </Field>

              <Field label="Father WhatsApp">
                <input className="input" value={form.fatherPhone} onChange={(e) => setField('fatherPhone', e.target.value)} placeholder="+960..." required />
              </Field>

              <Field label="Father Email">
                <input className="input" type="email" value={form.fatherEmail} onChange={(e) => setField('fatherEmail', e.target.value)} placeholder="ayah@email.com" />
              </Field>

              <Field label="Father Occupation">
                <input className="input" value={form.fatherOccupation} onChange={(e) => setField('fatherOccupation', e.target.value)} placeholder="Opsional" />
              </Field>

              <PackagePicker label="Package Ayah" packages={packages} selectedIds={form.fatherPackages} onToggle={(packageId) => togglePackage('fatherPackages', packageId)} />
            </div>
          </section>

          <section className="booking-form-section">
            <h3>Data Ibu</h3>
            <div className="booking-form-grid">
              <Field label="Mother Name">
                <input className="input" value={form.motherName} onChange={(e) => setField('motherName', e.target.value)} placeholder="Nama ibu" required />
              </Field>

              <Field label="Mother WhatsApp">
                <input className="input" value={form.motherPhone} onChange={(e) => setField('motherPhone', e.target.value)} placeholder="+960..." required />
              </Field>

              <Field label="Mother Email">
                <input className="input" type="email" value={form.motherEmail} onChange={(e) => setField('motherEmail', e.target.value)} placeholder="ibu@email.com" />
              </Field>

              <Field label="Mother Occupation">
                <input className="input" value={form.motherOccupation} onChange={(e) => setField('motherOccupation', e.target.value)} placeholder="Opsional" />
              </Field>

              <PackagePicker label="Package Ibu" packages={packages} selectedIds={form.motherPackages} onToggle={(packageId) => togglePackage('motherPackages', packageId)} />
            </div>
          </section>

          <section className="booking-form-section">
            <h3>Data Anak</h3>
            <div className="booking-form-grid">
              <Field label="Child Name">
                <input className="input" value={form.childName} onChange={(e) => setField('childName', e.target.value)} placeholder="Nama anak" required />
              </Field>

              <Field label="Child Age">
                <input className="input" type="number" min="1" max="17" value={form.childAge} onChange={(e) => setField('childAge', e.target.value)} placeholder="Umur" required />
              </Field>

              <Field label="Gender">
                <select className="input" value={form.childGender} onChange={(e) => setField('childGender', e.target.value)} required>
                  <option value="">Pilih</option>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </Field>

              <Field label="School Grade">
                <input className="input" value={form.childSchoolGrade} onChange={(e) => setField('childSchoolGrade', e.target.value)} placeholder="Contoh: Grade 3" />
              </Field>

              <Field label="Astronomy Level">
                <select className="input" value={form.childAstronomyLevel} onChange={(e) => setField('childAstronomyLevel', e.target.value)}>
                  <option>Beginner</option>
                  <option>Already curious</option>
                  <option>Advanced for age</option>
                </select>
              </Field>

              <Field label="Allergy / Dietary">
                <input className="input" value={form.dietaryRestrictions} onChange={(e) => setField('dietaryRestrictions', e.target.value)} placeholder="Alergi makanan/minuman atau none" />
              </Field>

              <PackagePicker label="Package Anak" packages={packages} selectedIds={form.childPackages} onToggle={(packageId) => togglePackage('childPackages', packageId)} />

              <Field label="Comfort Notes">
                <textarea className="input" value={form.childComfortNotes} onChange={(e) => setField('childComfortNotes', e.target.value)} placeholder="Takut gelap, mudah bosan, perlu pendamping, dll." />
              </Field>

              <Field label="Occasion">
                <textarea className="input" value={form.specialOccasion} onChange={(e) => setField('specialOccasion', e.target.value)} placeholder="Birthday, school trip, family activity, dll." />
              </Field>
            </div>
          </section>

          <section className="booking-form-section">
            <h3>Consent & Catatan</h3>
            <div className="booking-form-grid">
              <Field label="Photo Consent">
                <select className="input" value={form.photoRequest} onChange={(e) => setField('photoRequest', e.target.value)}>
                  <option>Ask parents first</option>
                  <option>Allowed</option>
                  <option>Not allowed</option>
                </select>
              </Field>

              <Field label="Weather Reschedule">
                <select className="input" value={form.rescheduleConsent} onChange={(e) => setField('rescheduleConsent', e.target.value)}>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Ask guest first</option>
                </select>
              </Field>

              <Field label="Seating / Setup">
                <input className="input" value={form.seatingSetup} onChange={(e) => setField('seatingSetup', e.target.value)} placeholder="Family, guardian nearby, private, dll." />
              </Field>

              <Field label="Slot Status">
                <select className="input" value={form.slotStatus} onChange={(e) => setField('slotStatus', e.target.value)}>
                  <option value="available">Available</option>
                  <option value="needs_check">Needs check</option>
                  <option value="confirmed">Confirmed</option>
                </select>
              </Field>

              <Field label="Detail Tambahan" wide>
                <textarea className="input" value={form.packageNotes} onChange={(e) => setField('packageNotes', e.target.value)} placeholder="Request khusus dari orang tua/anak." />
              </Field>

              <Field label="Internal Notes" wide>
                <textarea className="input" maxLength={300} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Catatan untuk admin/internal..." />
                <div className="char-counter">{form.notes.length}/300</div>
              </Field>
            </div>
          </section>

          {!canSubmitPackage && (
            <div className="external-booking-note" style={{ color: 'var(--accent)' }}>
              Pilih minimal satu package di data ayah, ibu, atau anak sebelum booking.
            </div>
          )}

          <div className="booking-submit-row">
            <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed' }} disabled={submitting}>
              {submitting ? 'Saving...' : editingBooking ? 'Update Booking' : 'Submit Booking'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCheckAvailability}>
              Check Availability
            </button>
          </div>
        </form>
      </section>

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}

function StaffBookingView({ booking, onClose, onEdit }) {
  const fatherLine = noteValue(booking.package_notes, 'Ayah');
  const motherLine = noteValue(booking.package_notes, 'Ibu');
  const childLine = noteValue(booking.package_notes, 'Anak');
  const fatherPackages = addOnNames(booking.add_ons, 'Ayah').join(', ') || '-';
  const motherPackages = addOnNames(booking.add_ons, 'Ibu').join(', ') || '-';
  const childPackages = addOnNames(booking.add_ons, 'Anak').join(', ') || '-';
  const details = [
    noteValue(booking.package_notes, 'Level astronomi anak'),
    noteValue(booking.package_notes, 'Kenyamanan anak'),
    noteValue(booking.package_notes, 'Detail tambahan'),
  ].filter((item) => item !== '-');

  const modal = (
    <div className="modal-backdrop family-view-backdrop">
      <div className="modal family-view-modal">
        <div className="family-view-hero">
          <div>
            <span>Submitted Booking</span>
            <h2>{booking.guest_name || '-'}</h2>
            <p>{booking.booking_code} / {booking.package_name || 'Package belum ada'}</p>
          </div>
          <div className="family-view-hero-actions">
            <span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span>
            <button className="modal-close" onClick={onClose}>x</button>
          </div>
        </div>

        <div className="modal-body family-view-body">
          <div className="family-view-grid">
            <ViewItem label="Tanggal" value={dateValue(booking.event_date)} />
            <ViewItem label="Jam" value={`${timeValue(booking.time_start)} - ${timeValue(booking.time_end)}`} />
            <ViewItem label="Room" value={booking.room_number} />
            <ViewItem label="Nationality" value={booking.nationality} />
            <ViewItem label="WhatsApp" value={booking.guest_phone || '-'} />
            <ViewItem label="Adults" value={booking.adult_count} />
            <ViewItem label="Children" value={booking.child_count} />
            <ViewItem label="Billing" value={booking.payment_method || '-'} />
          </div>

          <div className="family-view-section family-view-package-card">
            <div>
              <h3>Package Booking</h3>
              <p>{bookingPackageText(booking) || '-'}</p>
            </div>
            <span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span>
          </div>

          <div className="family-view-family-grid">
            <FamilyViewCard title="Data Ayah" body={fatherLine} packageText={fatherPackages} />
            <FamilyViewCard title="Data Ibu" body={motherLine} packageText={motherPackages} />
            <FamilyViewCard title="Data Anak" body={childLine} packageText={childPackages} />
          </div>

          <div className="family-view-section">
            <h3>Catatan Penting</h3>
            <div className="family-view-note-list">
              <span>{details[0] || 'Level astronomi belum diisi.'}</span>
              <span>{details[1] || 'Kenyamanan anak belum diisi.'}</span>
              <span>{details[2] || booking.notes || 'Tidak ada catatan tambahan.'}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Tutup</button>
          <button type="button" className="btn btn-primary" style={{ background: '#7c3aed' }} onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function FamilyViewCard({ title, body, packageText }) {
  return (
    <div className="family-view-card">
      <h3>{title}</h3>
      <p>{body || '-'}</p>
      <div>
        <span>Package</span>
        <strong>{packageText || '-'}</strong>
      </div>
    </div>
  );
}

function ViewItem({ label, value }) {
  return (
    <div className="family-view-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`input-group ${wide ? 'booking-form-wide' : ''}`}>
      <span className="input-label">{label}</span>
      {children}
    </label>
  );
}

function PackagePicker({ label, packages, selectedIds, onToggle }) {
  return (
    <div className="input-group booking-form-wide">
      <span className="input-label">{label}</span>
      <div className="package-pick-grid">
        {packages.map((pkg) => (
          <label className="package-pick-row" key={pkg.id}>
            <input type="checkbox" checked={selectedIds.includes(pkg.id)} onChange={() => onToggle(pkg.id)} />
            <span>{pkg.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
