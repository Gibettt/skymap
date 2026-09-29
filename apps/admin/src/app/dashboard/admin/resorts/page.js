'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useResortsQuery, queryKeys } from '@/lib/apiQueries';
import { worldTimezones } from '@/lib/resort-location';

const EMPTY_RESORT = {
  name: '',
  code: '',
  location: '',
  timezone: 'UTC',
  latitude: '',
  longitude: '',
  observationSpots: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  whatsappNumber: '',
  status: 'inactive',
};

const TIMEZONES = worldTimezones();

function hasStaffCoverage(resort) {
  return Number(resort.active_internal_count) > 0 && Number(resort.active_external_count) > 0;
}

function hasOperationalCoverage(resort) {
  return hasStaffCoverage(resort) && Number(resort.active_package_count) > 0;
}

function CoverageBadge({ resort }) {
  const ready = hasOperationalCoverage(resort);
  const label = ready
    ? (resort.status === 'active' ? 'Coverage Ready' : 'Siap Diaktifkan')
    : hasStaffCoverage(resort) ? 'Butuh Package' : 'Butuh Staff';
  const color = ready ? 'var(--emerald)' : 'var(--amber)';
  return (
    <span
      title={ready ? 'Staff dan package aktif tersedia' : hasStaffCoverage(resort) ? 'Tambahkan minimal 1 package aktif' : 'Lengkapi staff Internal dan External aktif'}
      style={{
        display: 'inline-flex',
        marginTop: 6,
        padding: '3px 7px',
        border: `1px solid ${color}`,
        color,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}

export default function ResortsPage() {
  const queryClient = useQueryClient();
  const { data: resorts = [], isLoading: loading, error: queryError } = useResortsQuery();
  const error = queryError?.message || '';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResort, setEditingResort] = useState(null);
  const [formData, setFormData] = useState(EMPTY_RESORT);
  const [saving, setSaving] = useState(false);

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [staffModal, setStaffModal] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);


  const stats = useMemo(() => {
    return resorts.reduce((acc, r) => {
      acc.total += 1;
      acc.active += r.status === 'active' ? 1 : 0;
      acc.ready += hasOperationalCoverage(r) ? 1 : 0;
      acc.needsSetup += hasOperationalCoverage(r) ? 0 : 1;
      acc.bookings += Number(r.total_bookings_count || 0);
      return acc;
    }, { total: 0, active: 0, ready: 0, needsSetup: 0, bookings: 0 });
  }, [resorts]);

  const filtered = useMemo(() => {
    let list = [...resorts];
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.location && r.location.toLowerCase().includes(q)) ||
        (r.contact_name && r.contact_name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [resorts, statusFilter, search]);

  const handleOpenAdd = () => {
    setEditingResort(null);
    setFormData(EMPTY_RESORT);
    setModalOpen(true);
  };

  const handleOpenEdit = (resort) => {
    setEditingResort(resort);
    setFormData({
      name: resort.name || '',
      code: resort.code || '',
      location: resort.location || '',
      timezone: resort.timezone || 'UTC',
      latitude: resort.latitude ?? '',
      longitude: resort.longitude ?? '',
      observationSpots: resort.observation_spots || '',
      contactName: resort.contact_name || '',
      contactPhone: resort.contact_phone || '',
      contactEmail: resort.contact_email || '',
      whatsappNumber: resort.whatsapp_number || '',
      status: resort.status || 'active',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      showToast('Nama dan Kode resort wajib diisi.', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingResort ? `/api/resorts/${editingResort.id}` : '/api/resorts';
      const method = editingResort ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data resort.');

      showToast(editingResort ? `Resort ${formData.name} berhasil diperbarui.` : `Resort ${formData.name} berhasil ditambahkan!`);
      setModalOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (resort) => {
    const nextStatus = resort.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/resorts/${resort.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status.');
      showToast(`Status ${resort.name} diubah menjadi ${nextStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all });
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resorts/${deleteModal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus resort.');
      showToast(data.message || 'Resort berhasil diproses.');
      setDeleteModal(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all });
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fade-in-up">
      {/* Header & Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 24, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
            🏝️ Manajemen Resort & Lokasi Observasi
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '4px 0 0' }}>
            Kelola master resort mitra, titik pengamatan astronomi (observation spots), dan koordinat GPS.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>+ Tambah Resort Mitra</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
        <KpiCard label="Total Resort Mitra" value={stats.total} />
        <KpiCard label="Resort Aktif" value={stats.active} accent="#059669" />
        <KpiCard label="Coverage Ready" value={stats.ready} accent="#059669" />
        <KpiCard label="Butuh Setup" value={stats.needsSetup} accent="#d97706" />
        <KpiCard label="Total Booking Resort" value={stats.bookings} accent="#0891b2" />
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '16px 20px', marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="search-bar" style={{ maxWidth: 360, flex: '1 1 260px' }}>
          <input
            placeholder="Cari nama resort, kode, lokasi, PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-bar">
          <button
            type="button"
            className={`chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Semua Status ({resorts.length})
          </button>
          <button
            type="button"
            className={`chip ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Aktif ({stats.active})
          </button>
          <button
            type="button"
            className={`chip ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Nonaktif ({stats.total - stats.active})
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: 18, marginBottom: 18, color: 'var(--accent)' }}>
          {error}
        </div>
      )}

      {/* Resorts Table Card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Daftar Resort Mitra ({filtered.length})</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Menampilkan {filtered.length} resort
          </span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Resort & Kode</th>
                <th>Lokasi & Timezone</th>
                <th>Koordinat GPS</th>
                <th>Spot Observasi</th>
                <th>Kontak PIC</th>
                <th style={{ textAlign: 'center' }}>Staf & Booking</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', minWidth: 140 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Memuat data resort...
                  </td>
                </tr>
              )}
              {!loading && filtered.map((r) => (
                <tr key={r.id}>
                  <td className="name-cell">
                    <strong>{r.name}</strong>
                    <br />
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: 'rgba(8, 145, 178, 0.12)',
                        color: '#0891b2',
                        border: '1px solid rgba(8, 145, 178, 0.3)',
                        marginTop: 3,
                      }}
                    >
                      {r.code}
                    </span>
                  </td>
                  <td>
                    {r.location || '-'}<br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      🕒 {r.timezone}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <span>Lat: {Number(r.latitude || 0).toFixed(4)}°</span><br />
                    <span style={{ color: 'var(--text-dim)' }}>Long: {Number(r.longitude || 0).toFixed(4)}°</span>
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 220 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {String(r.observation_spots || 'Sunset Beach, Helipad, Main Jetty').split(',').map((spot, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'var(--bg-elevated, rgba(0,0,0,0.05))',
                            border: '1px solid var(--border)',
                          }}
                        >
                          📍 {spot.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <strong>{r.contact_name || '-'}</strong><br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.contact_phone || '-'}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)' }}>
                      {r.active_internal_count || 0} Internal
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: 'var(--violet)' }}>
                      {r.active_external_count || 0} External
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: 'var(--emerald)' }}>
                      {r.active_package_count || 0} Package
                    </div>
                    <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-dim)' }}>
                      {r.open_bookings_count || 0} terbuka · {r.total_bookings_count || 0} total
                    </div>
                  </td>
                  <td>
                    <span className={`tag ${r.status === 'active' ? 'tag-completed' : 'tag-cancelled'}`}>
                      {r.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <br />
                    <CoverageBadge resort={r} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(r)}
                        title="Edit Data Resort"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setStaffModal(r)}
                        title={`Kelola staff ${r.name}`}
                        style={{ color: 'var(--cyan)', borderColor: 'rgba(8, 145, 178, 0.35)' }}
                      >
                        Kelola Staff
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: r.status === 'active' ? 'var(--accent)' : 'var(--emerald)',
                          borderColor: r.status === 'active' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(5, 150, 105, 0.3)',
                        }}
                        onClick={() => handleToggleStatus(r)}
                        disabled={r.status !== 'active' && !hasOperationalCoverage(r)}
                        title={r.status === 'active'
                          ? 'Nonaktifkan Resort'
                          : hasOperationalCoverage(r)
                            ? 'Aktifkan Resort'
                            : !hasStaffCoverage(r)
                              ? 'Tambahkan minimal 1 Internal dan 1 External aktif'
                              : 'Tambahkan minimal 1 package aktif'}
                      >
                        {r.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--accent)', borderColor: 'rgba(220, 38, 38, 0.3)' }}
                        onClick={() => setDeleteModal(r)}
                        title="Hapus Resort"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Tidak ada resort ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Resort */}
      {modalOpen && (
        <ResortModal
          formData={formData}
          setFormData={setFormData}
          isEditing={Boolean(editingResort)}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {/* Modal Hapus Resort */}
      {deleteModal && (
        <DeleteConfirmModal
          resort={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {staffModal && (
        <StaffManagementModal
          resort={staffModal}
          onClose={() => setStaffModal(null)}
          onChanged={() => queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all })}
          showToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent = 'var(--accent)' }) {
  return (
    <div className="kpi-card" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: 26, color: accent }}>{value}</div>
    </div>
  );
}

function StaffManagementModal({ resort, onClose, onChanged, showToast }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState({ internal: '', external: '' });
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'internal',
    password: '',
  });

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/users', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat staff.');
      setUsers(data.users || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    modalRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, []);

  const assigned = useMemo(
    () => users.filter((user) => user.resort_id === resort.id && ['internal', 'external'].includes(user.role)),
    [resort.id, users]
  );
  const activeInternal = assigned.filter((user) => user.role === 'internal' && user.status === 'active').length;
  const activeExternal = assigned.filter((user) => user.role === 'external' && user.status === 'active').length;
  const ready = activeInternal > 0 && activeExternal > 0;

  const assignStaff = async (role) => {
    const user = users.find((item) => item.id === selected[role]);
    if (!user) return;
    setBusy(`assign-${role}`);
    setError('');
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone || null,
          role: user.role,
          status: user.status,
          resortId: resort.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menetapkan staff.');
      setSelected((current) => ({ ...current, [role]: '' }));
      await loadStaff();
      onChanged();
      showToast(`${user.name} ditetapkan ke ${resort.name}.`);
    } catch (assignError) {
      setError(assignError.message);
    } finally {
      setBusy('');
    }
  };

  const createStaff = async (event) => {
    event.preventDefault();
    setBusy('create');
    setError('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          phone: createForm.phone || null,
          status: 'active',
          resortId: resort.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal membuat akun staff.');
      setCreateForm({ name: '', email: '', phone: '', role: 'internal', password: '' });
      await loadStaff();
      onChanged();
      showToast(`Akun ${data.user.name} dibuat dan ditetapkan ke ${resort.name}.`);
    } catch (createError) {
      setError(createError.message);
    } finally {
      setBusy('');
    }
  };

  const content = (
    <div
      className="resort-staff-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="resort-staff-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-management-title"
        aria-describedby="staff-management-description"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !busy) onClose();
        }}
      >
        <header className="resort-staff-header">
          <div className="resort-staff-heading">
            <span className="resort-staff-kicker">Resort staffing</span>
            <h3 id="staff-management-title">Kelola Staff Resort</h3>
            <p id="staff-management-description">
              <span className="resort-staff-code">{resort.code}</span>
              {resort.name}
            </p>
          </div>
          <button type="button" className="resort-staff-close" onClick={onClose} disabled={Boolean(busy)} aria-label="Tutup modal">×</button>
        </header>

        <div className="resort-staff-body">
          <section className={`resort-staff-readiness ${ready ? 'is-ready' : 'is-pending'}`} aria-label="Status coverage staff">
            <div className="resort-staff-readiness-copy">
              <span className="resort-staff-readiness-icon" aria-hidden="true">{ready ? '✓' : '!'}</span>
              <div>
                <strong>{ready ? 'Coverage siap' : 'Coverage belum lengkap'}</strong>
                <p>{ready ? 'Tim resort lengkap dan siap menerima operasional.' : 'Lengkapi kedua peran agar resort dapat diaktifkan.'}</p>
              </div>
            </div>
            <div className="resort-staff-coverage-counts">
              <span className={activeInternal > 0 ? 'is-complete' : ''}>Internal <strong>{activeInternal}/1</strong></span>
              <span className={activeExternal > 0 ? 'is-complete' : ''}>External <strong>{activeExternal}/1</strong></span>
            </div>
          </section>

          {error && <div className="resort-staff-error" role="alert">{error}</div>}

          {loading ? (
            <div className="resort-staff-loading">Memuat staff...</div>
          ) : (
            <div className="resort-staff-role-grid">
              {['internal', 'external'].map((role) => {
                const members = assigned.filter((user) => user.role === role);
                const candidates = users.filter((user) => user.role === role && user.status === 'active' && user.resort_id !== resort.id);
                const label = role === 'internal' ? 'Staff Internal' : 'Staff External';
                return (
                  <section key={role} className={`resort-staff-role-card is-${role}`}>
                    <div className="resort-staff-role-heading">
                      <span className="resort-staff-role-mark" aria-hidden="true">{role === 'internal' ? 'IN' : 'EX'}</span>
                      <div>
                        <h4>{label}</h4>
                        <p>{role === 'internal' ? 'Pemandu dan tim operasional' : 'Tim reservasi dari pihak resort'}</p>
                      </div>
                      <span className="resort-staff-role-count">{members.filter((user) => user.status === 'active').length} aktif</span>
                    </div>

                    <div className="resort-staff-member-list">
                      {members.length === 0 ? (
                        <div className="resort-staff-empty">
                          <span aria-hidden="true">+</span>
                          <p>Belum ada staff yang ditetapkan</p>
                        </div>
                      ) : members.map((user) => (
                        <div className="resort-staff-member" key={user.id}>
                          <span className="resort-staff-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
                          <span className="resort-staff-member-copy"><strong>{user.name}</strong><small>{user.email}</small></span>
                          <span className={`resort-staff-member-status ${user.status === 'active' ? 'is-active' : ''}`}>{user.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                        </div>
                      ))}
                    </div>

                    <div className="resort-staff-assignment">
                      <label className="input-group">
                        <span className="input-label">Pindahkan staff aktif</span>
                        <select className="input" value={selected[role]} onChange={(event) => setSelected((current) => ({ ...current, [role]: event.target.value }))}>
                          <option value="">Pilih staff</option>
                          {candidates.map((user) => (
                            <option key={user.id} value={user.id}>{user.name} — {user.resort_name || 'Belum ada resort'}</option>
                          ))}
                        </select>
                      </label>
                      <button type="button" className="btn btn-secondary" disabled={!selected[role] || Boolean(busy)} onClick={() => assignStaff(role)}>
                        {busy === `assign-${role}` ? 'Menetapkan...' : 'Tetapkan'}
                      </button>
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <form className="resort-staff-create" onSubmit={createStaff}>
            <div className="resort-staff-create-heading">
              <div>
                <span className="resort-staff-kicker">Akun baru</span>
                <h4>Buat akun staff baru</h4>
                <p>Akun langsung aktif dan otomatis terhubung ke {resort.name}.</p>
              </div>
              <span className="resort-staff-create-badge">Login siap setelah aktivasi</span>
            </div>

            <div className="resort-staff-create-grid">
              <label className="input-group"><span className="input-label">Nama lengkap *</span><input className="input" placeholder="Nama staff" required value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="input-group"><span className="input-label">Email *</span><input className="input" type="email" placeholder="staff@resort.com" required value={createForm.email} onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))} /></label>
              <label className="input-group"><span className="input-label">Telepon</span><input className="input" type="tel" placeholder="+960..." value={createForm.phone} onChange={(event) => setCreateForm((current) => ({ ...current, phone: event.target.value }))} /></label>
              <label className="input-group"><span className="input-label">Role *</span><select className="input" value={createForm.role} onChange={(event) => setCreateForm((current) => ({ ...current, role: event.target.value }))}><option value="internal">Internal</option><option value="external">External</option></select></label>
              <label className="input-group"><span className="input-label">Password awal *</span><input className="input" type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Minimal 8 karakter" required value={createForm.password} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} /></label>
            </div>

            <div className="resort-staff-create-footer">
              <small>Password dapat diganti staff setelah login pertama.</small>
              <button type="submit" className="btn btn-primary" disabled={Boolean(busy)}>{busy === 'create' ? 'Membuat akun...' : 'Buat dan Tetapkan'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function ResortModal({ formData, setFormData, isEditing, onClose, onSave, saving }) {
  const [locationQuery, setLocationQuery] = useState(
    () => [formData.name, formData.location].filter(Boolean).join(', ')
  );
  const [locationResults, setLocationResults] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [timezoneFilter, setTimezoneFilter] = useState('');
  const filteredTimezones = TIMEZONES.filter((timezone) =>
    timezone.toLowerCase().includes(timezoneFilter.toLowerCase().trim())
  );
  const latitude = Number(formData.latitude);
  const longitude = Number(formData.longitude);
  const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    && formData.latitude !== '' && formData.longitude !== '';
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.02}%2C${latitude - 0.02}%2C${longitude + 0.02}%2C${latitude + 0.02}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : '';

  const searchLocation = async () => {
    const query = locationQuery.trim();
    if (query.length < 3) {
      setLocationError('Masukkan minimal 3 karakter lokasi.');
      return;
    }

    setSearchingLocation(true);
    setLocationError('');
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lokasi tidak dapat dicari.');
      setLocationResults(data.results || []);
      if (!data.results?.length) setLocationError('Lokasi tidak ditemukan. Coba nama kota atau negara yang lebih lengkap.');
    } catch (error) {
      setLocationResults([]);
      setLocationError(error.message);
    } finally {
      setSearchingLocation(false);
    }
  };

  const selectLocation = (result) => {
    setFormData((current) => ({
      ...current,
      location: result.location,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    }));
    setLocationQuery(result.label);
    setLocationResults([]);
    setLocationError('');
    setTimezoneOpen(false);
  };

  const content = (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: 600,
          maxWidth: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {isEditing ? '✏️ Edit Data Resort Mitra' : '🏝️ Tambah Resort Mitra Baru'}
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Lengkapi informasi resort, titik observasi lapangan, dan koordinat GPS.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} disabled={saving}>✕</button>
        </div>

        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Nama Resort Mitra *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: Le Meridien Maldives Resort & Spa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label className="input-label">Kode Resort (Singkatan) *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: LMM"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  maxLength={8}
                  required
                />
              </div>
            </div>

            <section className="resort-location-picker" aria-labelledby="resort-location-title">
              <div className="resort-location-heading">
                <div>
                  <strong id="resort-location-title">Cari lokasi resort</strong>
                  <span>Koordinat dan zona waktu akan terisi otomatis.</span>
                </div>
                <span className="resort-location-step">Disarankan</span>
              </div>
              <div className="resort-location-search-row">
                <input
                  type="search"
                  className="input"
                  value={locationQuery}
                  onChange={(event) => setLocationQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      searchLocation();
                    }
                  }}
                  placeholder="Contoh: Putrajaya Marriott Hotel, Malaysia"
                  aria-label="Cari nama resort, kota, atau negara"
                />
                <button type="button" className="btn btn-secondary" onClick={searchLocation} disabled={searchingLocation}>
                  {searchingLocation ? 'Mencari...' : 'Cari lokasi'}
                </button>
              </div>
              {locationError && <p className="resort-location-error" role="alert">{locationError}</p>}
              {locationResults.length > 0 && (
                <div className="resort-location-results" role="listbox" aria-label="Hasil pencarian lokasi">
                  {locationResults.map((result) => (
                    <button
                      key={`${result.latitude}-${result.longitude}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => selectLocation(result)}
                    >
                      <strong>{result.label}</strong>
                      <span>{result.latitude}, {result.longitude} · {result.timezone}</span>
                    </button>
                  ))}
                </div>
              )}
              <small>Data lokasi © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>
            </section>

            <div className="resort-location-grid">
              <div className="input-group">
                <label className="input-label">Lokasi / Pulau / Atoll</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: Thilamaafushi, Lhaviyani Atoll"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Zona Waktu (Timezone)</label>
                <div
                  className="resort-timezone-combobox"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setTimezoneOpen(false);
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    value={formData.timezone}
                    onFocus={() => {
                      setTimezoneFilter('');
                      setTimezoneOpen(true);
                    }}
                    onChange={(event) => {
                      setFormData({ ...formData, timezone: event.target.value });
                      setTimezoneFilter(event.target.value);
                      setTimezoneOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setTimezoneOpen(false);
                      if (event.key === 'Enter' && timezoneOpen && timezoneFilter && filteredTimezones[0]) {
                        event.preventDefault();
                        setFormData({ ...formData, timezone: filteredTimezones[0] });
                        setTimezoneOpen(false);
                      }
                    }}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={timezoneOpen}
                    aria-controls="resort-timezone-options"
                    required
                  />
                  {timezoneOpen && (
                    <div id="resort-timezone-options" className="resort-timezone-menu" role="listbox">
                      {filteredTimezones.length > 0 ? filteredTimezones.map((timezone) => (
                        <button
                          key={timezone}
                          type="button"
                          role="option"
                          aria-selected={formData.timezone === timezone}
                          onClick={() => {
                            setFormData({ ...formData, timezone });
                            setTimezoneOpen(false);
                          }}
                        >
                          <span>{timezone}</span>
                          {formData.timezone === timezone && <span aria-hidden="true">✓</span>}
                        </button>
                      )) : <p>Tidak ada zona waktu yang cocok.</p>}
                    </div>
                  )}
                </div>
                <span className="resort-field-hint">Pilih zona IANA dunia atau koreksi manual.</span>
              </div>
            </div>

            <div className="resort-location-grid">
              <div className="input-group">
                <label className="input-label">Latitude GPS (°)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  className="input"
                  placeholder="Terisi setelah memilih lokasi"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  required
                />
                <span className="resort-field-hint">Rentang -90 sampai 90.</span>
              </div>
              <div className="input-group">
                <label className="input-label">Longitude GPS (°)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  className="input"
                  placeholder="Terisi setelah memilih lokasi"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  required
                />
                <span className="resort-field-hint">Rentang -180 sampai 180.</span>
              </div>
            </div>

            {hasCoordinates && (
              <div className="resort-map-preview">
                <iframe title="Pratinjau lokasi resort" src={mapUrl} loading="lazy" />
                <a
                  href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=14/${latitude}/${longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka lokasi di peta ↗
                </a>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Titik Pengamatan Astronomi (Observation Spots)</label>
              <input
                type="text"
                className="input"
                placeholder="Pisahkan dengan koma. Contoh: Sunset Beach, Helipad, Main Jetty, Water Villa Deck"
                value={formData.observationSpots}
                onChange={(e) => setFormData({ ...formData, observationSpots: e.target.value })}
              />
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Titik kumpul observasi ini akan muncul sebagai opsi lokasi saat staf external membuat booking.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Nama PIC Resort (Concierge/FO)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: Resort Concierge"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Nomor Telepon PIC</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: +960-000-0100"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Email Reservasi</label>
                <input
                  type="email"
                  className="input"
                  placeholder="concierge@resort.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">WhatsApp (kode negara)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: 9607771234"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Status Operasional</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                    {isEditing && <option value="active">Aktif (Menerima Reservasi)</option>}
                    <option value="inactive">Nonaktif</option>
                  </select>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    Resort baru disimpan nonaktif. Tetapkan minimal 1 Internal dan 1 External aktif sebelum aktivasi.
                  </span>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Resort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function DeleteConfirmModal({ resort, onClose, onConfirm, deleting }) {
  const content = (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: 12,
          width: 480,
          maxWidth: '94vw',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(220, 38, 38, 0.08)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>
            ✕
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Hapus Resort Mitra?</h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Konfirmasi penghapusan data resort <strong>{resort.name} ({resort.code})</strong>.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
          <p style={{ margin: 0 }}>
            Jika resort ini telah memiliki riwayat booking atau staf terhubung, sistem akan otomatis mengubah statusnya menjadi <strong>Nonaktif (Suspended)</strong> demi menjaga integritas laporan keuangan.
          </p>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Batal
          </button>
          <button
            type="button"
            className="btn"
            style={{ background: '#dc2626', color: 'white', border: 'none', fontWeight: 700 }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Memproses...' : 'Ya, Hapus Resort'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
