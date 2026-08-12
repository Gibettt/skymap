'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OBJECT_TYPES, PACKAGE_CATALOG, STATIONS } from '@/data/bookings';
import { calculateBookingFinance, formatUsd } from '@/data/keuangan';

const STATUS_FILTERS = ['Semua', 'Menunggu Admin', 'Diterima', 'Ditolak', 'Booked', 'Finished Experience', 'Cancelled'];

const STAFF_OPTIONS = [
  { staffId: 'INT-001', staffName: 'Ahmad Fauzi', staffRole: 'Internal' },
  { staffId: 'INT-002', staffName: 'Siti Nurhaliza', staffRole: 'Internal' },
  { staffId: 'EXT-001', staffName: 'Budi Santoso', staffRole: 'External' },
];

const EMPTY_FORM = {
  bookingCode: '',
  bookingDate: '',
  date: '',
  timeStart: '21:00',
  timeEnd: '22:00',
  clientName: '',
  roomNumber: '',
  nationality: '',
  adultCount: 2,
  childCount: 0,
  childAges: '',
  packageName: 'Beach Stargazing',
  packageType: 'Regular',
  experienceType: 'Communal',
  location: 'Palm Beach',
  adultPriceUsd: 90,
  childPriceUsd: 45,
  staffId: 'INT-001',
  staffName: 'Ahmad Fauzi',
  staffRole: 'Internal',
  status: 'Booked',
  signedByGuest: false,
  tipIncentiveUsd: 0,
  feedbackToken: '',
  feedbackSubmittedAt: '',
  rating: '',
  comment: '',
  notes: '',
};

function getStatusClass(status) {
  const map = {
    pending_review: 'tag-pending',
    accepted: 'tag-confirmed',
    rejected: 'tag-cancelled',
    booked: 'tag-confirmed',
    finished_experience: 'tag-completed',
    cancelled: 'tag-cancelled',
    'Menunggu Admin': 'tag-pending',
    Diterima: 'tag-confirmed',
    Ditolak: 'tag-cancelled',
    Booked: 'tag-pending',
    'Finished Experience': 'tag-completed',
    Cancelled: 'tag-cancelled',
  };
  return map[status] || '';
}

function getTypeClass(type) {
  const map = {
    Regular: 'tag-planet',
    Private: 'tag-asteroid',
    Kids: 'tag-bulan',
  };
  return map[type] || '';
}

function statusLabel(status) {
  const labels = {
    pending_review: 'Menunggu Admin',
    accepted: 'Diterima',
    rejected: 'Ditolak',
    booked: 'Booked',
    finished_experience: 'Finished Experience',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

function familyLine(notes, label) {
  return String(notes || '').split('\n').find((line) => line.startsWith(`${label}:`)) || '';
}

function packageLine(notes, label) {
  const line = familyLine(notes, label);
  return line ? line.replace(`${label}:`, '').trim() : '-';
}

function titleCase(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function dateValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timeValue(value) {
  return value ? String(value).slice(0, 5) : '';
}

function mapApiBooking(row) {
  const status = statusLabel(row.status);
  return {
    id: row.id,
    rawStatus: row.status,
    bookingCode: row.booking_code,
    bookingDate: dateValue(row.booking_date),
    date: dateValue(row.event_date),
    timeStart: timeValue(row.time_start),
    timeEnd: timeValue(row.time_end),
    clientName: row.guest_name,
    roomNumber: row.room_number,
    nationality: row.nationality,
    adultCount: Number(row.adult_count || 0),
    childCount: Number(row.child_count || 0),
    childAges: row.child_ages || '',
    packageName: row.package_name,
    packageType: titleCase(row.package_type),
    experienceType: titleCase(row.experience_type),
    location: row.location,
    staffId: row.staff_id,
    staffName: row.staff_name,
    staffRole: titleCase(row.staff_role),
    status,
    signedByGuest: Boolean(row.signed_by_guest),
    tipIncentiveUsd: Number(row.field_tip_incentive_usd || 0),
    feedbackToken: row.feedback_token || '',
    feedbackSubmittedAt: row.feedback_status === 'submitted' ? row.updated_at : '',
    rating: row.rating ? Number(row.rating) : null,
    comment: row.comment || '',
    notes: row.notes || '',
    addOns: Array.isArray(row.add_ons) ? row.add_ons : [],
    packageNotes: row.package_notes || '',
    guestPhone: row.guest_phone || '',
    guestEmail: row.guest_email || '',
    guardianName: row.guardian_name || '',
    guardianPhone: row.guardian_phone || '',
    dietaryRestrictions: row.dietary_restrictions || '',
    baseTotalUsd: Number(row.base_total_usd || 0),
    invoiceTotalUsd: Number(row.invoice_total_usd || 0),
    operationShareUsd: Number(row.operation_share_50_usd || 0),
    staffCommissionUsd: Number(row.staff_commission_5_usd || 0),
    objectName: row.package_name,
    objectType: titleCase(row.package_type),
    designation: row.booking_code,
    observer: row.staff_name,
    station: row.location,
    telescope: row.package_name,
    filter: titleCase(row.experience_type),
    exposure: `Room ${row.room_number}`,
    priority: row.staff_role === 'external' ? 'VIP' : 'Normal',
    magnitude: '',
    altitude: '',
    azimuth: '',
    distance: '',
    createdAt: row.created_at || '',
  };
}

function getFinance(booking) {
  const calculated = calculateBookingFinance(booking);
  return {
    ...calculated,
    baseTotalUsd: Number(booking.baseTotalUsd || calculated.baseTotalUsd),
    invoiceTotalUsd: Number(booking.invoiceTotalUsd || calculated.invoiceTotalUsd),
    operationShareUsd: Number(booking.operationShareUsd || calculated.operationShareUsd),
    staffCommissionUsd: Number(booking.staffCommissionUsd || calculated.staffCommissionUsd),
  };
}

function normalizeBooking(data, id) {
  return {
    ...data,
    id,
    bookingCode: data.bookingCode || `LM-SKY-${String(id).padStart(3, '0')}`,
    adultCount: Number(data.adultCount || 0),
    childCount: Number(data.childCount || 0),
    adultPriceUsd: Number(data.adultPriceUsd || 0),
    childPriceUsd: Number(data.childPriceUsd || 0),
    tipIncentiveUsd: Number(data.tipIncentiveUsd || 0),
    rating: data.rating ? Number(data.rating) : null,
    signedByGuest: Boolean(data.signedByGuest),
    feedbackToken: data.feedbackToken || `fb-lm-sky-${String(id).padStart(3, '0')}`,
    objectName: data.packageName,
    objectType: data.packageType,
    designation: data.bookingCode || `LM-SKY-${String(id).padStart(3, '0')}`,
    observer: data.staffName,
    station: data.location,
    telescope: data.packageName,
    filter: data.experienceType,
    exposure: `Room ${data.roomNumber}`,
    priority: data.staffRole === 'External' ? 'VIP' : 'Normal',
    magnitude: '',
    altitude: '',
    azimuth: '',
    distance: '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

function BookingModal({ booking, onClose, onSave }) {
  const [form, setForm] = useState(booking ? { ...booking } : { ...EMPTY_FORM });
  const finance = calculateBookingFinance(form);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const selectPackage = (packageName) => {
    const pkg = PACKAGE_CATALOG.find((item) => item.name === packageName);
    if (!pkg) return;
    setForm((prev) => ({
      ...prev,
      packageName: pkg.name,
      packageType: pkg.type,
      experienceType: pkg.experienceType,
      location: pkg.location,
      adultPriceUsd: pkg.adultPriceUsd,
      childPriceUsd: pkg.childPriceUsd ?? pkg.adultPriceUsd * 0.5,
      adultCount: pkg.type === 'Kids' ? 0 : prev.adultCount,
    }));
  };

  const selectStaff = (staffId) => {
    const staff = STAFF_OPTIONS.find((item) => item.staffId === staffId);
    if (!staff) return;
    setForm((prev) => ({ ...prev, ...staff }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 760 }}>
        <div className="modal-header">
          <span className="modal-title">{booking ? 'Edit Booking' : 'Booking Baru'}</span>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              <div className="input-group">
                <label className="input-label">Booking Date</label>
                <input className="input" type="date" required value={form.bookingDate} onChange={(e) => set('bookingDate', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Event Date</label>
                <input className="input" type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Guest Name</label>
                <input className="input" required value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Room Number</label>
                <input className="input" required value={form.roomNumber} onChange={(e) => set('roomNumber', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Nationality</label>
                <input className="input" required value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Package</label>
                <select className="input" value={form.packageName} onChange={(e) => selectPackage(e.target.value)}>
                  {PACKAGE_CATALOG.map((pkg) => <option key={pkg.name}>{pkg.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Adult Pax</label>
                <input className="input" type="number" min="0" value={form.adultCount} onChange={(e) => set('adultCount', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Child Pax</label>
                <input className="input" type="number" min="0" value={form.childCount} onChange={(e) => set('childCount', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Child Ages</label>
                <input className="input" value={form.childAges} onChange={(e) => set('childAges', e.target.value)} placeholder="cth. 8, 10" />
              </div>
              <div className="input-group">
                <label className="input-label">Location</label>
                <select className="input" value={form.location} onChange={(e) => set('location', e.target.value)}>
                  {STATIONS.map((station) => <option key={station}>{station}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Start Time</label>
                <input className="input" type="time" required value={form.timeStart} onChange={(e) => set('timeStart', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">End Time</label>
                <input className="input" type="time" required value={form.timeEnd} onChange={(e) => set('timeEnd', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label">Commission Owner</label>
                <select className="input" value={form.staffId} onChange={(e) => selectStaff(e.target.value)}>
                  {STAFF_OPTIONS.map((staff) => <option key={staff.staffId} value={staff.staffId}>{staff.staffId} - {staff.staffName}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Status</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUS_FILTERS.filter((status) => status !== 'Semua').map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Field Tip / Incentive</label>
                <input className="input" type="number" min="0" step="0.01" value={form.tipIncentiveUsd} onChange={(e) => set('tipIncentiveUsd', e.target.value)} />
              </div>
              <label className="input-group" style={{ justifyContent: 'end', gap: 10 }}>
                <span className="input-label">Signed by Guest</span>
                <input type="checkbox" checked={form.signedByGuest} onChange={(e) => set('signedByGuest', e.target.checked)} style={{ width: 22, height: 22 }} />
              </label>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Notes</label>
                <textarea className="input" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18 }}>
              <KpiMini label="Base" value={formatUsd(finance.baseTotalUsd)} />
              <KpiMini label="Invoice" value={formatUsd(finance.invoiceTotalUsd)} />
              <KpiMini label="Resort 50%" value={formatUsd(finance.operationShareUsd)} />
              <KpiMini label="Staff 5%" value={formatUsd(finance.staffCommissionUsd)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">{booking ? 'Simpan' : 'Book Now'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KpiMini({ label, value }) {
  return (
    <div style={{ padding: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function BookingDetail({ booking, onClose, onEdit, onDelete }) {
  const finance = getFinance(booking);
  const feedbackUrl = `/feedback/${booking.feedbackToken}`;
  const fatherData = familyLine(booking.packageNotes, 'Ayah') || 'Ayah: -';
  const motherData = familyLine(booking.packageNotes, 'Ibu') || 'Ibu: -';
  const childData = familyLine(booking.packageNotes, 'Anak') || 'Anak: -';
  const packageFather = packageLine(booking.packageNotes, 'Package ayah');
  const packageMother = packageLine(booking.packageNotes, 'Package ibu');
  const packageChild = packageLine(booking.packageNotes, 'Package anak');

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 700 }}>
        <div className="modal-header">
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              Detail Booking #{booking.id}
            </div>
            <span className="modal-title">{booking.clientName} - {booking.packageName}</span>
          </div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <span className={`tag ${getStatusClass(booking.status)}`}>{booking.status}</span>
            <span className={`tag ${getTypeClass(booking.packageType)}`}>{booking.packageType}</span>
            <span className={`tag ${booking.signedByGuest ? 'tag-completed' : 'tag-pending'}`}>{booking.signedByGuest ? 'Signed' : 'Not Signed'}</span>
          </div>

          <div className="detail-grid" style={{ border: '1px solid var(--border)', marginBottom: 18 }}>
            {[
              ['Kepala Keluarga', booking.clientName],
              ['Room', booking.roomNumber],
              ['Nationality', booking.nationality],
              ['Pax', `${booking.adultCount} adult / ${booking.childCount} child`],
              ['Event Date', booking.date],
              ['Time', `${booking.timeStart} - ${booking.timeEnd}`],
              ['Location', booking.location],
              ['Staff Owner', `${booking.staffRole} - ${booking.staffName}`],
            ].map(([label, value]) => (
              <div key={label} className="detail-stat">
                <div className="detail-stat-label">{label}</div>
                <div className="detail-stat-value" style={{ fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
            <KpiMini label="Base" value={formatUsd(finance.baseTotalUsd)} />
            <KpiMini label="Invoice" value={formatUsd(finance.invoiceTotalUsd)} />
            <KpiMini label="Resort 50%" value={formatUsd(finance.operationShareUsd)} />
            <KpiMini label="Staff 5%" value={formatUsd(finance.staffCommissionUsd)} />
          </div>

          <div style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)', marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              Family Intake Data
            </div>
            <div className="admin-family-detail-grid">
              <FamilyDetailCard title="Data Ayah" value={fatherData.replace(/^Ayah:\s*/, '')} packageValue={packageFather} />
              <FamilyDetailCard title="Data Ibu" value={motherData.replace(/^Ibu:\s*/, '')} packageValue={packageMother} />
              <FamilyDetailCard title="Data Anak" value={childData.replace(/^Anak:\s*/, '')} packageValue={packageChild} />
              <FamilyDetailCard title="Kontak & Consent" value={`Phone: ${booking.guestPhone || '-'}\nEmail: ${booking.guestEmail || '-'}\nGuardian WA: ${booking.guardianPhone || '-'}\nAllergy/Dietary: ${booking.dietaryRestrictions || '-'}`} packageValue={booking.addOns.length ? booking.addOns.join(', ') : '-'} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6 }}>Catatan Lengkap</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {booking.packageNotes || booking.notes || 'Tidak ada catatan family intake.'}
              </pre>
            </div>
          </div>

          <div style={{ padding: 14, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              WhatsApp Feedback Link
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{feedbackUrl}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Token one-time: {booking.feedbackSubmittedAt ? 'Expired / submitted' : 'Available'}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={() => { onClose(); onDelete(booking.id); }} style={{ color: 'var(--accent)', borderColor: 'rgba(229,28,28,0.3)' }}>Hapus</button>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Tutup</button>
          <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onEdit(booking); }}>Edit</button>
        </div>
      </div>
    </div>
  );
}

function FamilyDetailCard({ title, value, packageValue }) {
  return (
    <div className="admin-family-detail-card">
      <h4>{title}</h4>
      <p>{value || '-'}</p>
      <strong>Package: {packageValue || '-'}</strong>
    </div>
  );
}

const PER_PAGE = 10;

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadBookings = useCallback(async () => {
    setError('');
    const response = await fetch('/api/bookings');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Gagal memuat booking.');
    }
    setBookings((data.bookings || []).map(mapApiBooking));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBookings()
        .catch((err) => {
          setError(err.message);
          showToast(err.message, 'error');
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [loadBookings, showToast]);

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.clientName.toLowerCase().includes(q) ||
        b.packageName.toLowerCase().includes(q) ||
        b.roomNumber.toLowerCase().includes(q) ||
        b.staffName.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'Semua') list = list.filter((b) => b.packageType === typeFilter);
    if (statusFilter !== 'Semua') list = list.filter((b) => b.status === statusFilter);
    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [bookings, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSave = (data) => {
    if (editingBooking) {
      const normalized = normalizeBooking(data, editingBooking.id);
      setBookings((prev) => prev.map((b) => b.id === editingBooking.id ? normalized : b));
      showToast(`Booking ${normalized.bookingCode} diperbarui.`);
    } else {
      const newId = crypto.randomUUID?.() || String(Date.now());
      const normalized = normalizeBooking(data, newId);
      setBookings((prev) => [normalized, ...prev]);
      showToast(`Booking ${normalized.bookingCode} dibuat.`);
    }
    setModalOpen(false);
    setEditingBooking(null);
  };

  const handleDelete = (id) => {
    const b = bookings.find((item) => item.id === id);
    setBookings((prev) => prev.filter((item) => item.id !== id));
    showToast(`Booking ${b?.bookingCode || id} dihapus.`, 'error');
  };

  const handleReview = async (booking, nextStatus) => {
    try {
      setReviewingId(booking.id);
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Review booking gagal.', 'error');
        return;
      }
      const updated = mapApiBooking(data.booking);
      setBookings((prev) => prev.map((item) => item.id === booking.id ? updated : item));
      if (viewingBooking?.id === booking.id) setViewingBooking(updated);
      showToast(`Booking ${booking.bookingCode} ${nextStatus === 'accepted' ? 'diterima' : 'ditolak'}.`);
    } catch (err) {
      showToast(err.message || 'Review booking gagal.', 'error');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="fade-in-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '16px 20px', marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="search-bar" style={{ maxWidth: 320 }}>
          <input placeholder="Cari tamu, paket, kamar, staff..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="filter-bar">
          {OBJECT_TYPES.map((type) => (
            <button key={type} className={`chip ${typeFilter === type ? 'active' : ''}`} onClick={() => { setTypeFilter(type); setPage(1); }}>{type}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.filter((status) => status !== 'Semua').map((status) => (
            <button key={status} className={`chip ${statusFilter === status ? 'active' : ''}`} onClick={() => { setStatusFilter(statusFilter === status ? 'Semua' : status); setPage(1); }}>{status}</button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingBooking(null); setModalOpen(true); }}>+ Booking Baru</button>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Staff-Driven Booking</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{filtered.length} dari {bookings.length} booking</span>
        </div>
        {error && (
          <div style={{ padding: '12px 20px', color: 'var(--accent)', borderBottom: '1px solid var(--border)' }}>
            {error}
          </div>
        )}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Booking</th>
                <th>Guest</th>
                <th>Package</th>
                <th>Pax</th>
                <th>Staff Owner</th>
                <th style={{ textAlign: 'right' }}>Base</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Memuat booking...</td></tr>
              )}
              {!loading && paginated.map((b) => {
                const finance = getFinance(b);
                return (
                  <tr key={b.id}>
                    <td className="name-cell" onClick={() => setViewingBooking(b)}>{b.bookingCode}</td>
                    <td>{b.clientName}</td>
                    <td><span className={`tag ${getTypeClass(b.packageType)}`}>{b.packageName}</span></td>
                    <td>{b.adultCount} adult / {b.childCount} child</td>
                    <td><span className="tag tag-info">{b.staffRole}</span><br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.staffName}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(finance.baseTotalUsd)}</td>
                    <td><span className={`tag ${getStatusClass(b.status)}`}>{b.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {b.rawStatus === 'pending_review' && (
                          <>
                            <button className="btn-icon" style={{ width: 'auto', padding: '0 8px', fontSize: 12, color: 'var(--emerald)' }} title="Terima booking" disabled={reviewingId === b.id} onClick={() => handleReview(b, 'accepted')}>Terima</button>
                            <button className="btn-icon" style={{ width: 'auto', padding: '0 8px', fontSize: 12, color: 'var(--accent)' }} title="Tolak booking" disabled={reviewingId === b.id} onClick={() => handleReview(b, 'rejected')}>Tolak</button>
                          </>
                        )}
                        <button className="btn-icon" style={{ fontSize: 12 }} title="Lihat" onClick={() => setViewingBooking(b)}>View</button>
                        <button className="btn-icon" style={{ fontSize: 12 }} title="Edit" onClick={() => { setEditingBooking(b); setModalOpen(true); }}>Edit</button>
                        <button className="btn-icon" style={{ fontSize: 12, color: 'var(--accent)' }} title="Hapus" onClick={() => handleDelete(b.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Tidak ada data ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{ padding: '16px 20px' }}>
          <span className="pagination-info">Menampilkan {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}-{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>First</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <button className="page-btn active">{page}</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>Last</button>
          </div>
        </div>
      </div>

      {modalOpen && <BookingModal booking={editingBooking} onClose={() => { setModalOpen(false); setEditingBooking(null); }} onSave={handleSave} />}
      {viewingBooking && <BookingDetail booking={viewingBooking} onClose={() => setViewingBooking(null)} onEdit={(b) => { setEditingBooking(b); setModalOpen(true); }} onDelete={handleDelete} />}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
