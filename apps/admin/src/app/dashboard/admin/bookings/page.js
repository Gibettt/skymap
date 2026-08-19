'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { OBJECT_TYPES, PACKAGE_CATALOG, STATIONS } from '@/data/bookings';
import { calculateBookingFinance, formatUsd } from '@/data/keuangan';
import { useBookingsQuery, useUpdateBookingMutation, queryKeys, fetchApi } from '@/lib/apiQueries';

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
    createdAt: row.created_at,
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
    resortName: row.resort_name,
    resortCode: row.resort_code,
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
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Tamu Utama</label>
                <input className="input" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Room / Villa</label>
                <input className="input" value={form.roomNumber} onChange={(e) => setField('roomNumber', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Nationality</label>
                <input className="input" value={form.nationality} onChange={(e) => setField('nationality', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Paket Observasi</label>
                <select className="input" value={form.packageName} onChange={(e) => setField('packageName', e.target.value)}>
                  {PACKAGE_CATALOG.map((p) => (
                    <option key={p.name} value={p.name}>{p.name} (${p.adultPriceUsd})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tanggal Observasi</label>
                <input type="date" className="input" value={form.date} onChange={(e) => setField('date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Jam (Start - End)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="time" className="input" value={form.timeStart} onChange={(e) => setField('timeStart', e.target.value)} required />
                  <input type="time" className="input" value={form.timeEnd} onChange={(e) => setField('timeEnd', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Adults (Dewasa)</label>
                <input type="number" min="1" className="input" value={form.adultCount} onChange={(e) => setField('adultCount', Number(e.target.value))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Children (Anak)</label>
                <input type="number" min="0" className="input" value={form.childCount} onChange={(e) => setField('childCount', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Staff Owner</label>
                <select className="input" value={form.staffName} onChange={(e) => setField('staffName', e.target.value)}>
                  {STAFF_OPTIONS.map((s) => (
                    <option key={s.staffId} value={s.staffName}>{s.staffName} ({s.staffRole})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  {STATUS_FILTERS.filter((s) => s !== 'Semua').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Catatan</label>
                <textarea className="input" rows={3} value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Catatan khusus..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary btn-sm">{booking ? 'Simpan Perubahan' : 'Tambah Booking'}</button>
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

function NotesPopupModal({ title, bookingCode, guestName, notes, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="notes-popup-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notes-popup-modal">
        <div className="notes-popup-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                {title || 'Catatan Lengkap Form & Log Intake'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                Kode: <strong>{bookingCode}</strong> &bull; Tamu: <strong>{guestName}</strong>
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} title="Tutup">x</button>
        </div>

        <div className="notes-popup-body">
          <pre className="notes-pre-content">
            {notes || 'Tidak ada catatan tambahan yang terlampir.'}
          </pre>
        </div>

        <div className="notes-popup-footer">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
          >
            {copied ? '✓ Berhasil Disalin!' : '📄 Salin Seluruh Catatan'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onClose}
          >
            Tutup Catatan
          </button>
        </div>
      </div>
    </div>
  );
}

function extractAdminGuestName(line, fallbackName) {
  if (!line) return fallbackName || '-';
  const cleaned = line.replace(/^(Tamu Utama|Tamu 2 \(Pasangan\/Pendamping\)|Tamu 2|Ayah|Ibu|Anak\s*\d*)\s*:\s*/i, '').trim();
  if (cleaned.includes('|')) {
    const firstPart = cleaned.split('|')[0].trim();
    const matchAge = cleaned.match(/Umur\s*:\s*(\d+\s*thn?|\d+)/i);
    if (matchAge && matchAge[1]) {
      return `${firstPart} (${matchAge[1].trim()})`;
    }
    return firstPart || fallbackName || '-';
  }
  return cleaned || fallbackName || '-';
}

function extractAdminChildName(line, defaultIndex) {
  if (!line) return `Anak #${defaultIndex}`;
  const cleaned = line.replace(/^Anak\s*\d*\s*:\s*/i, '').trim();
  if (cleaned.includes('|')) {
    const parts = cleaned.split('|').map((p) => p.trim());
    const name = parts[0] || `Anak #${defaultIndex}`;
    const agePart = parts.find((p) => /^Umur/i.test(p));
    if (agePart) {
      const ageVal = agePart.replace(/^Umur\s*:\s*/i, '').trim();
      return `${name} (${ageVal})`;
    }
    return name;
  }
  return cleaned || `Anak #${defaultIndex}`;
}

function BookingDetail({ booking, onClose, onEdit, onDelete, onReview, reviewingId }) {
  const [showNotesModal, setShowNotesModal] = useState(false);
  const finance = getFinance(booking);
  const notes = booking.packageNotes || booking.notes || '';
  const mainPkgName = booking.packageName || '-';

  // Parse Lead Guest
  const leadLine = familyLine(notes, 'Tamu Utama') || familyLine(notes, 'Ayah') || `Tamu Utama: ${booking.clientName}`;
  const rawPkgLead = packageLine(notes, 'Package Tamu Utama') !== '-'
    ? packageLine(notes, 'Package Tamu Utama')
    : (packageLine(notes, 'Package ayah') !== '-' ? packageLine(notes, 'Package ayah') : '');
  const packageLead = rawPkgLead || mainPkgName;

  // Parse Companion / Partner
  const companionLine = familyLine(notes, 'Tamu 2 (Pasangan/Pendamping)') || familyLine(notes, 'Tamu 2') || familyLine(notes, 'Ibu');
  const rawPkgCompanion = packageLine(notes, 'Package Tamu 2') !== '-'
    ? packageLine(notes, 'Package Tamu 2')
    : (packageLine(notes, 'Package ibu') !== '-' ? packageLine(notes, 'Package ibu') : '');
  const packageCompanion = rawPkgCompanion || mainPkgName;

  // Parse Child Lines
  const childLines = String(notes || '')
    .split('\n')
    .filter((line) => /^Anak\s*\d*:/i.test(line));

  const leadName = extractAdminGuestName(leadLine, booking.clientName);
  const companionName = extractAdminGuestName(companionLine, '-');

  const modal = (
    <div className="modal-backdrop family-view-backdrop">
      <div className="modal family-view-modal">
        {/* Hero Header */}
        <div className="family-view-hero">
          <div>
            <span>Detail Reservasi Tamu</span>
            <h2>{booking.clientName || '-'}</h2>
            <p>{booking.bookingCode} / {booking.packageName || 'Package belum ada'}</p>
          </div>
          <div className="family-view-hero-actions">
            <span className={`tag ${getStatusClass(booking.status)}`}>{booking.status}</span>
            <span className={`tag ${getTypeClass(booking.packageType)}`}>{booking.packageType}</span>
            <span className={`tag ${booking.signedByGuest ? 'tag-completed' : 'tag-pending'}`}>
              {booking.signedByGuest ? '✓ Signed' : '⏱ Not Signed'}
            </span>
            <button className="modal-close" onClick={onClose} title="Tutup">x</button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="modal-body family-view-body">
          {/* Quick Info Grid 8 columns */}
          <div className="family-view-grid">
            <ViewItem label="Tanggal" value={booking.date} />
            <ViewItem label="Jam" value={`${booking.timeStart} - ${booking.timeEnd}`} />
            <ViewItem label="Room / Villa" value={booking.roomNumber} />
            <ViewItem label="Nationality" value={booking.nationality} />
            <ViewItem label="WhatsApp" value={booking.guestPhone || '-'} />
            <ViewItem label="Dewasa" value={`${booking.adultCount} pax`} />
            <ViewItem label="Anak" value={`${booking.childCount} pax`} />
            <ViewItem label="Staff Owner" value={`${booking.staffRole} - ${booking.staffName}`} />
          </div>

          {/* Finance Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <KpiMini label="Base Total" value={formatUsd(finance.baseTotalUsd)} />
            <KpiMini label="Invoice (+Tax/Service)" value={formatUsd(finance.invoiceTotalUsd)} />
            <KpiMini label="Resort Share (50%)" value={formatUsd(finance.operationShareUsd)} />
            <KpiMini label="Komisi Staff" value={formatUsd(finance.staffCommissionUsd)} />
          </div>

          {/* Package Banner Card */}
          <div className="family-view-section family-view-package-card">
            <div>
              <h3>Package Observasi Terpilih</h3>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                {booking.packageName} ({booking.packageType} - {booking.experienceType})
              </p>
            </div>
            <span className={`tag ${getStatusClass(booking.status)}`}>{booking.status}</span>
          </div>

          {/* Dynamic Guest & Family Cards (Name + Package Only) */}
          <div className="family-view-family-grid">
            <FamilyDetailCard
              title="Tamu Utama (Lead Guest)"
              name={leadName}
              packageValue={packageLead}
            />

            {(Number(booking.adultCount) >= 2 || companionLine) && (
              <FamilyDetailCard
                title="Tamu 2 (Pasangan/Pendamping)"
                name={companionName}
                packageValue={packageCompanion}
              />
            )}

            {childLines.length > 0 ? (
              childLines.map((cLine, idx) => {
                const childNum = idx + 1;
                const cName = extractAdminChildName(cLine, childNum);
                const rawChildPkg = packageLine(notes, `Package Anak ${childNum}`) !== '-'
                  ? packageLine(notes, `Package Anak ${childNum}`)
                  : (packageLine(notes, 'Package anak') !== '-' ? packageLine(notes, 'Package anak') : '');
                const cPkg = rawChildPkg || mainPkgName;
                return (
                  <FamilyDetailCard
                    key={idx}
                    title={`Data Anak #${childNum}`}
                    name={cName}
                    packageValue={cPkg}
                  />
                );
              })
            ) : (
              <FamilyDetailCard
                title="Data Anak"
                name={Number(booking.childCount) > 0 ? `${booking.childCount} anak` : 'Tidak membawa anak (Couple / Dewasa saja)'}
                packageValue={Number(booking.childCount) > 0 ? mainPkgName : '-'}
              />
            )}
          </div>

          {/* Trigger Section for Catatan Lengkap Sub-Modal (Popup Overlay Niban) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
              border: '1px solid rgba(124, 58, 237, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 18 }}>
                📋
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                  Rincian Catatan Lengkap & Log Form
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Klik tombol di kanan untuk membuka popup tampilan teks catatan lengkap di depan layar.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ borderColor: 'var(--violet)', color: 'var(--violet)', fontWeight: 700, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowNotesModal(true)}
            >
              <span>🔍 Buka Catatan Lengkap (Popup)</span>
            </button>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button className="btn btn-secondary btn-sm" onClick={() => { onClose(); onDelete(booking.id); }} style={{ color: 'var(--accent)', borderColor: 'rgba(229,28,28,0.3)' }}>
              Hapus
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {booking.rawStatus === 'pending_review' && onReview && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--accent)', borderColor: 'rgba(229,28,28,0.3)' }}
                  disabled={reviewingId === booking.id}
                  onClick={() => onReview(booking, 'rejected')}
                >
                  Tolak
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: 'var(--emerald)', borderColor: 'var(--emerald)' }}
                  disabled={reviewingId === booking.id}
                  onClick={() => onReview(booking, 'accepted')}
                >
                  Terima Booking
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>Tutup</button>
            <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onEdit(booking); }}>Edit</button>
          </div>
        </div>
      </div>

      {/* Sub-modal Pop-up Catatan Lengkap */}
      {showNotesModal && (
        <NotesPopupModal
          title="Catatan Lengkap & Log Intake Form"
          bookingCode={booking.bookingCode}
          guestName={booking.clientName}
          notes={notes}
          onClose={() => setShowNotesModal(false)}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}

function ViewItem({ label, value }) {
  return (
    <div className="family-view-item">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function FamilyDetailCard({ title, name, packageValue }) {
  return (
    <div className="family-view-card">
      <h3>{title}</h3>
      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: '4px 0 10px', minHeight: 26, display: 'flex', alignItems: 'center' }}>
        {name || '-'}
      </div>
      <div>
        <span>Package</span>
        <strong>{packageValue || '-'}</strong>
      </div>
    </div>
  );
}

function AdminConfirmReviewModal({ modalData, onClose, onConfirm, loading }) {
  if (!modalData) return null;
  const isAccept = modalData.type === 'accepted';
  const { booking } = modalData;

  const content = (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: `1px solid ${isAccept ? 'rgba(5, 150, 105, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
          borderRadius: 12,
          width: 520,
          maxWidth: '94vw',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: isAccept ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isAccept ? '#059669' : '#dc2626',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: isAccept ? '0 0 14px rgba(5, 150, 105, 0.4)' : '0 0 14px rgba(220, 38, 38, 0.4)',
            }}
          >
            {isAccept ? '✓' : '✕'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isAccept ? 'Konfirmasi Persetujuan Booking' : 'Konfirmasi Penolakan Booking'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {isAccept
                ? 'Booking ini akan disetujui (Accepted) dan otomatis masuk ke jadwal operasional.'
                : 'Booking ini akan ditolak (Rejected) dan staf pembuat booking akan menerima notifikasi status.'}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Booking Details Summary */}
        <div style={{ padding: '20px 24px', background: 'var(--bg-card)' }}>
          <div
            style={{
              background: 'var(--bg-elevated, rgba(0, 0, 0, 0.03))',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <div>
                <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  Booking Code
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {booking.bookingCode}
                </div>
              </div>
              {booking.staffName && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: booking.staffRole === 'External' ? '#7c3aed18' : '#0891b218',
                    color: booking.staffRole === 'External' ? '#7c3aed' : '#0891b2',
                    border: `1px solid ${booking.staffRole === 'External' ? '#7c3aed40' : '#0891b240'}`,
                  }}
                >
                  {booking.staffRole === 'External' ? `External: ${booking.staffName}` : `Internal: ${booking.staffName}`}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>Tamu / Guest</span>
                <strong style={{ color: 'var(--text-primary)' }}>{booking.clientName}</strong>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Room {booking.roomNumber || '-'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>Paket / Package</span>
                <strong style={{ color: 'var(--text-primary)' }}>{booking.packageName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>Jadwal / Schedule</span>
                <strong style={{ color: 'var(--text-primary)' }}>{String(booking.date || '').slice(0, 10)}</strong>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{booking.timeStart} - {booking.timeEnd}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, display: 'block' }}>Pax</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {booking.adultCount} Dewasa / {booking.childCount} Anak
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 12,
            background: 'var(--bg-elevated, rgba(0, 0, 0, 0.02))',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ padding: '8px 16px', fontWeight: 600 }}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onConfirm(booking, modalData.type)}
            disabled={loading}
            style={{
              background: isAccept ? '#059669' : '#dc2626',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              fontWeight: 700,
              boxShadow: isAccept ? '0 2px 10px rgba(5, 150, 105, 0.35)' : '0 2px 10px rgba(220, 38, 38, 0.35)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? 'Memproses...'
              : isAccept
              ? '✓ Ya, Setujui Booking'
              : '✕ Ya, Tolak Booking'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

const PER_PAGE = 10;

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const { data: rawBookings = [], isLoading: loading, error: queryError } = useBookingsQuery();
  const updateMutation = useUpdateBookingMutation();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [confirmReviewModal, setConfirmReviewModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);

  const bookings = useMemo(() => (rawBookings || []).map(mapApiBooking), [rawBookings]);
  const error = queryError?.message || '';

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.onmessage = () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
        };
      }
    } catch {
      // ignore
    }

    return () => {
      if (channel) channel.close();
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    let list = [...bookings];
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((b) =>
        (b.bookingCode && b.bookingCode.toLowerCase().includes(q)) ||
        (b.packageName && b.packageName.toLowerCase().includes(q)) ||
        (b.clientName && b.clientName.toLowerCase().includes(q)) ||
        (b.roomNumber && String(b.roomNumber).toLowerCase().includes(q)) ||
        (b.staffName && b.staffName.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'Semua') list = list.filter((b) => b.packageType === typeFilter);
    if (statusFilter !== 'Semua') list = list.filter((b) => b.status === statusFilter);
    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date).getTime();
      const timeB = new Date(b.createdAt || b.date).getTime();
      return timeB - timeA;
    });
  }, [bookings, search, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSave = (data) => {
    if (editingBooking) {
      const normalized = normalizeBooking(data, editingBooking.id);
      showToast(`Booking ${normalized.bookingCode} diperbarui.`);
    } else {
      const newId = crypto.randomUUID?.() || String(Date.now());
      const normalized = normalizeBooking(data, newId);
      showToast(`Booking ${normalized.bookingCode} dibuat.`);
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.postMessage({ type: 'ADMIN_SAVED_BOOKING' });
        channel.close();
      }
    } catch {}
    setModalOpen(false);
    setEditingBooking(null);
  };

  const handleDelete = (id) => {
    const b = bookings.find((item) => item.id === id);
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    showToast(`Booking ${b?.bookingCode || id} dihapus.`, 'error');
  };

  const handleReview = async (booking, nextStatus) => {
    try {
      setReviewingId(booking.id);
      const data = await updateMutation.mutateAsync({ id: booking.id, status: nextStatus });
      const updated = mapApiBooking(data.booking);
      if (viewingBooking?.id === booking.id) setViewingBooking(updated);
      setConfirmReviewModal(null);
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const channel = new BroadcastChannel('ephemeris_sync_channel');
          channel.postMessage({ type: 'BOOKING_REVIEWED', bookingId: booking.id, status: nextStatus });
          channel.close();
        }
      } catch {}
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
        <div className="search-bar" style={{ maxWidth: 360, flex: '1 1 260px' }}>
          <input placeholder="Cari kode booking, nama paket, tamu, kamar, staf..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="filter-bar">
          {OBJECT_TYPES.map((type) => (
            <button key={type} className={`chip ${typeFilter === type ? 'active' : ''}`} onClick={() => { setTypeFilter(type); setPage(1); }}>{type}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.filter((status) => status !== 'Semua').map((status) => {
            const isPending = status === 'Menunggu Admin';
            const count = isPending ? bookings.filter((b) => b.status === 'Menunggu Admin' || b.status === 'pending_review' || b.status === 'Pending Review').length : 0;
            return (
              <button 
                key={status} 
                className={`chip ${statusFilter === status ? 'active' : ''}`} 
                onClick={() => { setStatusFilter(statusFilter === status ? 'Semua' : status); setPage(1); }}
              >
                {status}
                {isPending && count > 0 && (
                  <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: '12px', padding: '2px 6px', fontSize: '10px', fontWeight: 'bold' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
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
                    <td>
                      <strong>{b.clientName}</strong><br />
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Room {b.roomNumber || '-'}</span>
                      {b.resortName && (
                        <div style={{ marginTop: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: 'rgba(8, 145, 178, 0.08)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(8, 145, 178, 0.25)', display: 'inline-block' }}>
                            🏝️ {b.resortName}
                          </span>
                        </div>
                      )}
                    </td>
                    <td><span className={`tag ${getTypeClass(b.packageType)}`}>{b.packageName}</span></td>
                    <td>{b.adultCount} adult / {b.childCount} child</td>
                    <td><span className="tag tag-info">{b.staffRole}</span><br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{b.staffName}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(finance.baseTotalUsd)}</td>
                    <td><span className={`tag ${getStatusClass(b.status)}`}>{b.status}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {b.rawStatus === 'pending_review' && (
                          <>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--emerald, #059669)', color: 'white', border: 'none', fontWeight: 700, padding: '4px 8px', fontSize: 11 }}
                              title="Terima booking"
                              disabled={reviewingId === b.id}
                              onClick={() => setConfirmReviewModal({ type: 'accepted', booking: b })}
                            >
                              ✓ Terima
                            </button>
                            <button
                              className="btn btn-sm"
                              style={{ background: 'var(--accent, #dc2626)', color: 'white', border: 'none', fontWeight: 700, padding: '4px 8px', fontSize: 11 }}
                              title="Tolak booking"
                              disabled={reviewingId === b.id}
                              onClick={() => setConfirmReviewModal({ type: 'rejected', booking: b })}
                            >
                              ✕ Tolak
                            </button>
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
      {viewingBooking && (
        <BookingDetail
          booking={viewingBooking}
          onClose={() => setViewingBooking(null)}
          onEdit={(b) => { setEditingBooking(b); setModalOpen(true); }}
          onDelete={handleDelete}
          onReview={(b, type) => setConfirmReviewModal({ type, booking: b })}
          reviewingId={reviewingId}
        />
      )}

      {confirmReviewModal && (
        <AdminConfirmReviewModal
          modalData={confirmReviewModal}
          onClose={() => setConfirmReviewModal(null)}
          onConfirm={handleReview}
          loading={Boolean(reviewingId)}
        />
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}
