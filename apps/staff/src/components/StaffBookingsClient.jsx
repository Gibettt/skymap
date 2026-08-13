'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

const ROLE_STYLE = {
  internal: { color: '#0891b2', title: 'Booking Operasional', subtitle: 'Booking baru harus diterima admin sebelum bisa diproses operasional.' },
  external: { color: '#7c3aed', title: 'Booking Resort', subtitle: 'Input booking customer, lalu tunggu keputusan admin.' },
};

const ADD_ON_OPTIONS = ['Astro portrait', 'Dining setup', 'Beverages', 'Sky map', 'Private seating'];

const EMPTY_FORM = {
  packageId: '',
  eventDate: '',
  timeStart: '21:00',
  timeEnd: '22:00',
  guestName: '',
  guestPhone: '',
  guestEmail: '',
  preferredLanguage: 'English',
  roomNumber: '',
  nationality: '',
  adultCount: 2,
  childCount: 0,
  childAges: '',
  specialOccasion: '',
  guardianName: '',
  guardianPhone: '',
  seatingSetup: '',
  photoRequest: '',
  privacyPreference: 'Family / group',
  dietaryRestrictions: '',
  rescheduleConsent: 'Yes',
  slotStatus: 'available',
  bookingSource: 'WhatsApp',
  addOns: [],
  packageNotes: '',
  paymentMethod: 'Room charge',
  invoiceNumber: '',
  billingNotes: '',
  fieldTipIncentiveUsd: 0,
  tipRecipient: '',
  tipNotes: '',
  weatherCondition: '',
  equipmentNeeded: '',
  assignedAstronomer: '',
  assignedButler: '',
  setupStatus: 'not_started',
  notes: '',
};

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
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
  const classes = {
    pending_review: 'tag-pending',
    accepted: 'tag-confirmed',
    rejected: 'tag-cancelled',
    booked: 'tag-confirmed',
    finished_experience: 'tag-completed',
    cancelled: 'tag-cancelled',
  };
  return classes[status] || 'tag-pending';
}

function numberValue(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function calculatePreview(pkg, form, role) {
  if (!pkg) return null;
  const adultPrice = numberValue(pkg.adult_price_usd);
  const childPrice = numberValue(pkg.child_price_usd ?? (pkg.package_type === 'kids' ? adultPrice : adultPrice * 0.5));
  const baseTotal = (numberValue(form.adultCount) * adultPrice) + (numberValue(form.childCount) * childPrice);
  const serviceCharge = baseTotal * 0.1;
  const gst = baseTotal * 0.17;
  const invoiceTotal = baseTotal + serviceCharge + gst;
  const operationShare = baseTotal * 0.5;
  const commission = role === 'internal' ? baseTotal * 0.1 * 0.9 : operationShare * 0.05;

  return { adultPrice, childPrice, baseTotal, serviceCharge, gst, invoiceTotal, operationShare, commission };
}

function approvalRank(status) {
  const rank = {
    pending_review: 0,
    accepted: 1,
    booked: 1,
    rejected: 2,
    finished_experience: 3,
    cancelled: 4,
  };
  return rank[status] ?? 5;
}

function canOperate(booking) {
  return ['accepted', 'booked'].includes(booking.status);
}

function canToggleSigned(booking) {
  return ['accepted', 'booked', 'finished_experience'].includes(booking.status);
}

export default function StaffBookingsClient({ role }) {
  const router = useRouter();
  const config = ROLE_STYLE[role];
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const selectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === form.packageId),
    [packages, form.packageId]
  );
  const pricePreview = useMemo(
    () => calculatePreview(selectedPackage, form, role),
    [selectedPackage, form, role]
  );

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const loadData = useCallback(async () => {
    setError('');
    const meRes = await fetch('/api/me');
    if (!meRes.ok) {
      router.replace('/login');
      throw new Error('Session login tidak aktif. Silakan login ulang.');
    }
    const meData = await meRes.json();
    if (!meData.user) {
      router.replace('/login');
      throw new Error('Session login tidak aktif. Silakan login ulang.');
    }
    if (meData.user.role !== role) {
      router.replace(`/dashboard/${meData.user.role}/bookings`);
      throw new Error(`Session aktif adalah ${meData.user.role}. Mengalihkan ke dashboard yang sesuai.`);
    }

    const [bookingRes, packageRes] = await Promise.all([
      fetch('/api/bookings'),
      fetch('/api/packages'),
    ]);
    if (!bookingRes.ok || !packageRes.ok) {
      throw new Error('Gagal memuat data. Pastikan login dan database sudah aktif.');
    }
    const bookingData = await bookingRes.json();
    const packageData = await packageRes.json();
    setBookings([...(bookingData.bookings || [])].sort((a, b) => approvalRank(a.status) - approvalRank(b.status)));
    setPackages(packageData.packages || []);
    setForm((current) => ({
      ...current,
      packageId: current.packageId || packageData.packages?.[0]?.id || '',
    }));
  }, [role, router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const totals = useMemo(() => bookings.reduce((acc, booking) => {
    acc.commission += Number(booking.staff_commission_5_usd || 0);
    acc.pending += booking.status === 'pending_review' ? 1 : 0;
    acc.accepted += ['accepted', 'booked'].includes(booking.status) ? 1 : 0;
    acc.rejected += booking.status === 'rejected' ? 1 : 0;
    acc.invoice += Number(booking.invoice_total_usd || 0);
    acc.finished += booking.status === 'finished_experience' ? 1 : 0;
    acc.signed += booking.signed_by_guest ? 1 : 0;
    return acc;
  }, { commission: 0, pending: 0, accepted: 0, rejected: 0, invoice: 0, finished: 0, signed: 0 }), [bookings]);

  const submitBooking = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || 'Booking gagal dibuat.');
      return;
    }
    setModalOpen(false);
    setForm({ ...EMPTY_FORM, packageId: packages[0]?.id || '' });
    await loadData();
    showToast('Booking berhasil dibuat dan menunggu persetujuan admin.');
  };

  const updateBooking = async (booking, patch) => {
    const response = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await response.json();
    if (!response.ok) {
      showToast(data.error || 'Update gagal.');
      return;
    }
    setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, ...data.booking } : item));
    showToast('Booking diperbarui.');
  };

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{config.title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{config.subtitle}</p>
        </div>
        <button className="btn" style={{ background: config.color, color: 'white' }} onClick={() => setModalOpen(true)}>
          + Booking Baru
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <MiniCard label="Booking" value={bookings.length} />
        <MiniCard label="Menunggu Admin" value={totals.pending} />
        <MiniCard label="Diterima" value={totals.accepted} />
        <MiniCard label="Finished" value={totals.finished} />
      </div>

      <div className="external-booking-note" style={{ marginBottom: 18, borderColor: `${config.color}40`, background: `${config.color}14` }}>
        Booking baru berstatus Menunggu Admin. Setelah admin klik Terima, staff baru bisa menandai Finished atau Signed.
      </div>

      {error && (
        <div className="card" style={{ padding: 18, marginBottom: 18, color: 'var(--accent)' }}>{error}</div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Guest</th>
                <th>Package</th>
                <th>Event</th>
                <th>Pax</th>
                <th>Status</th>
                <th>Signed</th>
                <th style={{ textAlign: 'right' }}>Komisi</th>
                {role === 'internal' && <th style={{ textAlign: 'center' }}>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={role === 'internal' ? 9 : 8} style={{ textAlign: 'center', padding: 36 }}>Memuat...</td></tr>}
              {!loading && bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="name-cell">
                    {booking.booking_code}
                    {booking.booking_source && <br />}
                    {booking.booking_source && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{booking.booking_source}</span>}
                    {role === 'external' && booking.staff_name && <><br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>By {booking.staff_name}</span></>}
                  </td>
                  <td>
                    {booking.guest_name}<br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Room {booking.room_number}{booking.guest_phone ? ` - ${booking.guest_phone}` : ''}{booking.resort_name ? ` - ${booking.resort_name}` : ''}
                    </span>
                  </td>
                  <td>{booking.package_name}</td>
                  <td style={{ fontSize: 12 }}>{String(booking.event_date).slice(0, 10)}<br />{booking.time_start}-{booking.time_end}</td>
                  <td>{booking.adult_count} adult / {booking.child_count} child</td>
                  <td><span className={`tag ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span></td>
                  <td><span className={`tag ${booking.signed_by_guest ? 'tag-completed' : 'tag-pending'}`}>{booking.signed_by_guest ? 'Yes' : 'No'}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(booking.staff_commission_5_usd)}</td>
                  {role === 'internal' && (
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        {booking.status === 'pending_review' && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Menunggu admin</span>}
                        {booking.status === 'rejected' && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>Ditolak</span>}
                        {canOperate(booking) && <button className="btn btn-secondary btn-sm" onClick={() => updateBooking(booking, { status: 'finished_experience' })}>Finish</button>}
                        {canToggleSigned(booking) && <button className="btn btn-secondary btn-sm" onClick={() => updateBooking(booking, { signedByGuest: !booking.signed_by_guest })}>Signed</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && bookings.length === 0 && (
                <tr><td colSpan={role === 'internal' ? 9 : 8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada booking</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {typeof document !== 'undefined' && modalOpen && createPortal((
        <div className="modal-backdrop staff-booking-backdrop">
          <div className="modal staff-booking-modal" style={{ borderTop: `3px solid ${config.color}` }}>
            <div className="modal-header">
              <span className="modal-title">Booking Baru</span>
              <button className="modal-close" onClick={() => setModalOpen(false)}>x</button>
            </div>
            <form onSubmit={submitBooking}>
              <div className="modal-body staff-booking-modal-body">
                <div className="external-booking-note">
                  Booking baru masuk ke admin untuk diterima atau ditolak sebelum operasional.
                </div>

                <FormSection title="Data Tamu">
                  <Input label="Nama Tamu" value={form.guestName} onChange={(value) => setForm({ ...form, guestName: value })} required />
                  <Input label="WhatsApp / Telepon" value={form.guestPhone} onChange={(value) => setForm({ ...form, guestPhone: value })} required />
                  <Input label="Email" type="email" value={form.guestEmail} onChange={(value) => setForm({ ...form, guestEmail: value })} />
                  <Input label="Bahasa Preferensi" value={form.preferredLanguage} onChange={(value) => setForm({ ...form, preferredLanguage: value })} />
                  <Input label="Nomor Kamar" value={form.roomNumber} onChange={(value) => setForm({ ...form, roomNumber: value })} required />
                  <Input label="Kebangsaan" value={form.nationality} onChange={(value) => setForm({ ...form, nationality: value })} required />
                  <Input label="Dewasa" type="number" min="0" value={form.adultCount} onChange={(value) => setForm({ ...form, adultCount: value })} required />
                  <Input label="Anak" type="number" min="0" value={form.childCount} onChange={(value) => setForm({ ...form, childCount: value })} required />
                  <Input label="Umur Anak" value={form.childAges} onChange={(value) => setForm({ ...form, childAges: value })} placeholder="Contoh: 6, 8, 10" />
                  <Input label="Guardian Name" value={form.guardianName} onChange={(value) => setForm({ ...form, guardianName: value })} />
                  <Input label="Guardian WhatsApp" value={form.guardianPhone} onChange={(value) => setForm({ ...form, guardianPhone: value })} />
                  <Input label="Occasion" value={form.specialOccasion} onChange={(value) => setForm({ ...form, specialOccasion: value })} placeholder="Birthday, anniversary, honeymoon" />
                </FormSection>

                <FormSection title="Jadwal & Paket">
                  <SelectInput label="Paket" value={form.packageId} onChange={(value) => setForm({ ...form, packageId: value })} required>
                    {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} - {pkg.location}</option>)}
                  </SelectInput>
                  <SelectInput label="Sumber Booking" value={form.bookingSource} onChange={(value) => setForm({ ...form, bookingSource: value })}>
                    <option>WhatsApp</option>
                    <option>Phone Call</option>
                    <option>Walk-in</option>
                    <option>Concierge</option>
                    <option>Referral</option>
                  </SelectInput>
                  <Input label="Tanggal Event" type="date" value={form.eventDate} onChange={(value) => setForm({ ...form, eventDate: value })} required />
                  <Input label="Jam Mulai" type="time" value={form.timeStart} onChange={(value) => setForm({ ...form, timeStart: value })} required />
                  <Input label="Jam Selesai" type="time" value={form.timeEnd} onChange={(value) => setForm({ ...form, timeEnd: value })} required />
                  <CheckboxList
                    label="Add-on"
                    options={ADD_ON_OPTIONS}
                    value={form.addOns}
                    onChange={(value) => setForm({ ...form, addOns: value })}
                  />
                  <TextArea label="Catatan Paket" value={form.packageNotes} onChange={(value) => setForm({ ...form, packageNotes: value })} placeholder="Permintaan kursi, dekorasi, area pantai, atau detail lain." />
                </FormSection>

                <FormSection title="Kebutuhan Experience">
                  <Input label="Seating / Setup" value={form.seatingSetup} onChange={(value) => setForm({ ...form, seatingSetup: value })} placeholder="Couple, family, private beach, dining table" />
                  <Input label="Photo Request" value={form.photoRequest} onChange={(value) => setForm({ ...form, photoRequest: value })} placeholder="Astro portrait, moon photo, sun photo" />
                  <Input label="Privacy / Group" value={form.privacyPreference} onChange={(value) => setForm({ ...form, privacyPreference: value })} />
                  <Input label="Dietary / Allergy" value={form.dietaryRestrictions} onChange={(value) => setForm({ ...form, dietaryRestrictions: value })} />
                  <SelectInput label="Weather Reschedule" value={form.rescheduleConsent} onChange={(value) => setForm({ ...form, rescheduleConsent: value })}>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Ask guest first</option>
                  </SelectInput>
                  <SelectInput label="Slot Status" value={form.slotStatus} onChange={(value) => setForm({ ...form, slotStatus: value })}>
                    <option value="available">Available</option>
                    <option value="needs_check">Needs check</option>
                    <option value="confirmed">Confirmed</option>
                  </SelectInput>
                </FormSection>

                <FormSection title="Billing & Tip">
                  <SelectInput label="Metode Billing" value={form.paymentMethod} onChange={(value) => setForm({ ...form, paymentMethod: value })}>
                    <option>Room charge</option>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Resort billing</option>
                  </SelectInput>
                  <Input label="Invoice / Folio" value={form.invoiceNumber} onChange={(value) => setForm({ ...form, invoiceNumber: value })} />
                  <Input label="Tip / Insentif USD" type="number" min="0" value={form.fieldTipIncentiveUsd} onChange={(value) => setForm({ ...form, fieldTipIncentiveUsd: value })} />
                  <Input label="Penerima Tip" value={form.tipRecipient} onChange={(value) => setForm({ ...form, tipRecipient: value })} placeholder="Butler, Astronomer, atau team" />
                  <TextArea label="Catatan Billing" value={form.billingNotes} onChange={(value) => setForm({ ...form, billingNotes: value })} />
                  <TextArea label="Catatan Tip" value={form.tipNotes} onChange={(value) => setForm({ ...form, tipNotes: value })} />
                </FormSection>

                <FormSection title="Persiapan Operasional">
                  <Input label="Cuaca" value={form.weatherCondition} onChange={(value) => setForm({ ...form, weatherCondition: value })} placeholder="Clear, cloudy, windy" />
                  <Input label="Equipment" value={form.equipmentNeeded} onChange={(value) => setForm({ ...form, equipmentNeeded: value })} placeholder="Telescope, mat, laser pointer" />
                  <Input label="Astronomer" value={form.assignedAstronomer} onChange={(value) => setForm({ ...form, assignedAstronomer: value })} />
                  <Input label="Butler" value={form.assignedButler} onChange={(value) => setForm({ ...form, assignedButler: value })} />
                  <SelectInput label="Setup Status" value={form.setupStatus} onChange={(value) => setForm({ ...form, setupStatus: value })}>
                    <option value="not_started">Not started</option>
                    <option value="requested">Requested</option>
                    <option value="ready">Ready</option>
                  </SelectInput>
                  <TextArea label="Notes Internal" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
                </FormSection>

                {pricePreview && (
                  <div className="booking-price-preview">
                    <PreviewItem label="Adult" value={formatUsd(pricePreview.adultPrice)} />
                    <PreviewItem label="Child" value={formatUsd(pricePreview.childPrice)} />
                    <PreviewItem label="Base" value={formatUsd(pricePreview.baseTotal)} />
                    <PreviewItem label="SC 10%" value={formatUsd(pricePreview.serviceCharge)} />
                    <PreviewItem label="GST 17%" value={formatUsd(pricePreview.gst)} />
                    <PreviewItem label="Invoice" value={formatUsd(pricePreview.invoiceTotal)} strong />
                    <PreviewItem label="50% Ops" value={formatUsd(pricePreview.operationShare)} />
                    <PreviewItem label="Komisi" value={formatUsd(pricePreview.commission)} strong />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
                <button type="submit" className="btn" style={{ background: config.color, color: 'white' }}>Book Now</button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 28 }}>{value}</div>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section className="booking-form-section">
      <h3>{title}</h3>
      <div className="booking-form-grid">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, min, placeholder }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input className="input" type={type} min={min} required={required} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, onChange, required = false, children }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <select className="input" value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="input-group booking-form-wide">
      <span className="input-label">{label}</span>
      <textarea className="input" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CheckboxList({ label, options, value, onChange }) {
  const selected = new Set(value);

  return (
    <div className="input-group booking-form-wide">
      <span className="input-label">{label}</span>
      <div className="booking-checkbox-grid">
        {options.map((option) => (
          <label key={option} className="booking-checkbox">
            <input
              type="checkbox"
              checked={selected.has(option)}
              onChange={(event) => {
                const next = new Set(selected);
                if (event.target.checked) next.add(option);
                else next.delete(option);
                onChange([...next]);
              }}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function PreviewItem({ label, value, strong = false }) {
  return (
    <div>
      <span>{label}</span>
      <strong style={{ color: strong ? 'var(--text-primary)' : undefined }}>{value}</strong>
    </div>
  );
}
