'use client';

import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useResortsQuery, queryKeys } from '@/lib/apiQueries';

const EMPTY_RESORT = {
  name: '',
  code: '',
  location: '',
  timezone: 'Indian/Maldives',
  latitude: 5.2893,
  longitude: 73.5358,
  observationSpots: 'Sunset Beach, Helipad, Main Jetty',
  contactName: '',
  contactPhone: '',
  status: 'active',
};

const TIMEZONES = [
  'Indian/Maldives',
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Dubai',
  'UTC',
];

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

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);


  const stats = useMemo(() => {
    return resorts.reduce((acc, r) => {
      acc.total += 1;
      acc.active += r.status === 'active' ? 1 : 0;
      acc.staff += Number(r.active_staff_count || 0);
      acc.bookings += Number(r.total_bookings_count || 0);
      return acc;
    }, { total: 0, active: 0, staff: 0, bookings: 0 });
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
      timezone: resort.timezone || 'Indian/Maldives',
      latitude: resort.latitude ?? 5.2893,
      longitude: resort.longitude ?? 73.5358,
      observationSpots: resort.observation_spots || 'Sunset Beach, Helipad, Main Jetty',
      contactName: resort.contact_name || '',
      contactPhone: resort.contact_phone || '',
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
    const nextStatus = resort.status === 'active' ? 'suspended' : 'active';
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
        <KpiCard label="Total Staf External" value={stats.staff} accent="#7c3aed" />
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
            className={`chip ${statusFilter === 'suspended' ? 'active' : ''}`}
            onClick={() => setStatusFilter('suspended')}
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
                    <span style={{ fontWeight: 700, color: '#7c3aed' }}>{r.active_staff_count || 0}</span> Staf<br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.total_bookings_count || 0} Booking</span>
                  </td>
                  <td>
                    <span className={`tag ${r.status === 'active' ? 'tag-completed' : 'tag-cancelled'}`}>
                      {r.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
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
                        style={{
                          color: r.status === 'active' ? 'var(--accent)' : 'var(--emerald)',
                          borderColor: r.status === 'active' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(5, 150, 105, 0.3)',
                        }}
                        onClick={() => handleToggleStatus(r)}
                        title={r.status === 'active' ? 'Nonaktifkan Resort' : 'Aktifkan Resort'}
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

function ResortModal({ formData, setFormData, isEditing, onClose, onSave, saving }) {
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
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
                <select
                  className="input"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Latitude GPS (°)</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input"
                  placeholder="Contoh: 5.2893"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Longitude GPS (°)</label>
                <input
                  type="number"
                  step="0.000001"
                  className="input"
                  placeholder="Contoh: 73.5358"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>

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
                <label className="input-label">Nomor WhatsApp / Kontak PIC</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contoh: +960-000-0100"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
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
                <option value="active">Aktif (Menerima Reservasi)</option>
                <option value="suspended">Nonaktif (Suspended)</option>
              </select>
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
