'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { ROLE_CONFIG } from '@/data/pengguna';

/* ── helpers ── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatLastSeen(dateStr) {
  if (!dateStr) return 'Belum terdeteksi';
  const elapsed = Math.max(0, Date.now() - new Date(dateStr).getTime());
  if (elapsed < 60_000) return 'Baru saja';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} menit lalu`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} jam lalu`;
  return formatDate(dateStr);
}

function getInitials(nama) {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/* ── sub-components ── */
function Avatar({ user, size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: user.warna || '#6b6b6b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-heading)',
        fontWeight: 800,
        fontSize: size * 0.35,
        color: '#fff',
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {user.avatar || getInitials(user.nama)}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { warna: '#6b6b6b', bg: 'rgba(107,107,107,0.1)', label: role };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        border: `1px solid ${cfg.warna}`,
        background: cfg.bg,
        color: cfg.warna,
      }}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const isAktif = status === 'Aktif';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        border: isAktif ? '1px solid var(--emerald)' : '1px solid var(--border)',
        background: isAktif ? 'var(--emerald-muted)' : 'var(--bg-elevated)',
        color: isAktif ? 'var(--emerald)' : 'var(--text-dim)',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: isAktif ? 'var(--emerald)' : 'var(--text-dim)',
          display: 'inline-block',
        }}
      />
      {status}
    </span>
  );
}

function PresenceBadge({ presence }) {
  if (!presence) return <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Tidak dipantau</span>;
  const config = {
    online: { label: 'Online', color: 'var(--emerald)', background: 'var(--emerald-muted)' },
    idle: { label: 'Idle', color: 'var(--amber)', background: 'var(--amber-muted)' },
    offline: { label: 'Offline', color: 'var(--text-dim)', background: 'var(--bg-elevated)' },
  }[presence];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px',
        border: `1px solid ${config.color}`,
        background: config.background,
        color: config.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.color }} />
      {config.label}
    </span>
  );
}

/* ── toast ── */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          style={{ cursor: 'pointer' }}
          onClick={() => onRemove(t.id)}
        >
          <span style={{ fontSize: 16 }}>
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── role radio card ── */
function RoleCard({ role, selected, onSelect }) {
  const cfg = ROLE_CONFIG[role];
  const isSelected = selected === role;
  return (
    <label
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 12px',
        border: isSelected ? `2px solid ${cfg.warna}` : '2px solid var(--border)',
        background: isSelected ? cfg.bg : 'var(--bg-primary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="radio"
        name="role"
        value={role}
        checked={isSelected}
        onChange={() => onSelect(role)}
        style={{ display: 'none' }}
      />
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: isSelected ? cfg.warna : 'var(--text-dim)',
          display: 'block',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 800,
          fontSize: 13,
          color: isSelected ? cfg.warna : 'var(--text-secondary)',
        }}
      >
        {cfg.label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        {role === 'Admin'
          ? 'Akses penuh sistem'
          : role === 'Internal'
          ? 'Staf observatorium'
          : 'Peneliti eksternal'}
      </span>
    </label>
  );
}

/* ── EMPTY FORM ── */
const EMPTY_FORM = {
  nama: '',
  email: '',
  phone: '',
  institusi: '',
  kota: '',
  role: 'Internal',
  status: 'Aktif',
  warna: '#0891b2',
  avatar: '',
  resortId: '',
};

/* ════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════ */
export default function PenggunaPage() {
  const [users, setUsers] = useState([]);
  const [resorts, setResorts] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('Semua');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedResort, setSelectedResort] = useState('all');
  const [presenceConnection, setPresenceConnection] = useState('polling');

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  // toasts
  const [toasts, setToasts] = useState([]);

  const loadUsers = useCallback(async () => {
    const response = await fetch('/api/users', { cache: 'no-store' });
    if (!response.ok) throw new Error('Gagal memuat pengguna');
    const data = await response.json();
    setResorts(data.resorts || []);
    setUsers((data.users || []).map((user) => ({
      id: user.id,
      nama: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role[0].toUpperCase() + user.role.slice(1),
      status: user.status === 'active' ? 'Aktif' : 'Nonaktif',
      resortId: user.resort_id || '',
      institusi: user.resort_name || 'SpaceCat ASTROTOURISM',
      kota: user.resort_location || '-',
      createdAt: user.created_at,
      presence: user.presence,
      lastSeenAt: user.last_seen_at,
      totalBooking: user.total_booking || 0,
    })));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers().catch(() => setToasts((prev) => [...prev, {
        id: Date.now(), message: 'Gagal memuat data pengguna', type: 'error',
      }]));
    }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    let pollInterval;
    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = window.setInterval(() => loadUsers().catch(() => {}), 15_000);
    };

    if (!('EventSource' in window)) {
      startPolling();
      return () => window.clearInterval(pollInterval);
    }

    const source = new EventSource('/api/presence/stream');
    source.onopen = () => {
      setPresenceConnection('live');
      if (pollInterval) {
        window.clearInterval(pollInterval);
        pollInterval = undefined;
      }
    };
    source.addEventListener('presence', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!Array.isArray(data.users)) return;
        const presenceById = new Map(data.users.map((user) => [user.id, user]));
        setUsers((current) => current.map((user) => {
          const update = presenceById.get(user.id);
          return update ? {
            ...user,
            presence: update.presence,
            lastSeenAt: update.last_seen_at,
          } : user;
        }));
      } catch {
        // Abaikan event yang tidak lengkap dan tunggu snapshot berikutnya.
      }
    });
    source.onerror = () => {
      setPresenceConnection('polling');
      startPolling();
    };

    return () => {
      source.close();
      if (pollInterval) window.clearInterval(pollInterval);
    };
  }, [loadUsers]);

  /* ── toast helpers ── */
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ── KPI counts ── */
  const kpiData = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((u) => u.role === 'Admin').length,
      internal: users.filter((u) => u.role === 'Internal').length,
      external: users.filter((u) => u.role === 'External').length,
    }),
    [users]
  );

  const resortPresence = useMemo(() => {
    const staff = users.filter((user) => ['Internal', 'External'].includes(user.role));
    const summarize = (members) => ({
      total: members.length,
      online: members.filter((user) => user.presence === 'online').length,
      idle: members.filter((user) => user.presence === 'idle').length,
      offline: members.filter((user) => user.presence === 'offline').length,
      activeInternal: members.filter((user) => user.role === 'Internal' && user.status === 'Aktif').length,
      activeExternal: members.filter((user) => user.role === 'External' && user.status === 'Aktif').length,
    });
    return [
      { id: 'all', name: 'Semua Resort', ...summarize(staff) },
      ...resorts.map((resort) => ({
        ...resort,
        ...summarize(staff.filter((user) => user.resortId === resort.id)),
      })),
    ];
  }, [resorts, users]);

  /* ── filtering ── */
  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.nama.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.institusi.toLowerCase().includes(q) ||
        u.kota.toLowerCase().includes(q);
      const matchRole = roleFilter === 'Semua' || u.role === roleFilter;
      const matchStatus = statusFilter === 'Semua' || u.status === statusFilter;
      const matchResort = selectedResort === 'all' || u.resortId === selectedResort;
      return matchSearch && matchRole && matchStatus && matchResort;
    });
  }, [users, search, roleFilter, statusFilter, selectedResort]);

  /* ── form handlers ── */
  const openAdd = () => {
    setModalMode('add');
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setModalMode('edit');
    setEditingUser(user);
    setForm({
      nama: user.nama,
      email: user.email,
      phone: user.phone || '',
      institusi: user.institusi,
      kota: user.kota,
      role: user.role,
      status: user.status,
      warna: user.warna || '#0891b2',
      avatar: user.avatar || '',
      resortId: user.resortId || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errs = {};
    if (!form.nama.trim()) errs.nama = 'Nama wajib diisi';
    if (!form.email.trim()) errs.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Format email tidak valid';
    if (form.role !== 'Admin' && !form.resortId) errs.resortId = 'Resort wajib dipilih untuk staff';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (modalMode === 'add') {
      addToast('Pembuatan akun baru belum tersedia di halaman ini', 'error');
      return;
    }
    const response = await fetch(`/api/users/${editingUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.nama,
        email: form.email,
        phone: form.phone || null,
        role: form.role.toLowerCase(),
        status: form.status === 'Aktif' ? 'active' : 'inactive',
        resortId: form.role === 'Admin' ? null : form.resortId,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      addToast(data.error || 'Gagal memperbarui pengguna', 'error');
      return;
    }
    await loadUsers();
    addToast(`Data "${form.nama}" berhasil diperbarui`, 'success');
    closeModal();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    addToast(`Pengguna "${deleteTarget.nama}" telah dihapus`, 'error');
    setDeleteTarget(null);
  };

  const handleRoleChange = (role) => {
    const roleWarna = { Admin: '#e51c1c', Internal: '#0891b2', External: '#7c3aed' };
    setForm((f) => ({ ...f, role, warna: roleWarna[role] }));
  };

  /* ── filter chip lists ── */
  const roleChips = ['Semua', 'Admin', 'Internal', 'External'];
  const statusChips = ['Semua', 'Aktif', 'Nonaktif'];
  const roleChipLabel = { Semua: 'Semua', Admin: 'Admin', Internal: 'Staff Internal', External: 'Staff External' };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="page-content fade-in-up">
        {/* ── Page Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                marginBottom: 6,
              }}
            >
              Admin / Manajemen
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              Manajemen Pengguna
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
              Kelola akun, peran, dan hak akses seluruh pengguna sistem SpaceCat ASTROTOURISM.
            </p>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="kpi-grid stagger" style={{ marginBottom: 24 }}>
          {/* Total */}
          <div className="kpi-card" style={{ borderTop: '3px solid var(--text-primary)' }}>
            <div className="kpi-label">Total Pengguna</div>
            <div className="kpi-value">{kpiData.total}</div>
            <div className="kpi-note" style={{ color: 'var(--text-muted)' }}>
              Terdaftar dalam sistem
            </div>
          </div>
          {/* Admin */}
          <div className="kpi-card" style={{ borderTop: '3px solid var(--accent)' }}>
            <div className="kpi-label">Admin</div>
            <div className="kpi-value" style={{ color: 'var(--accent)' }}>
              {kpiData.admin}
            </div>
            <div className="kpi-note">
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                }}
              >
                Akses Penuh
              </span>
            </div>
          </div>
          {/* Internal */}
          <div className="kpi-card" style={{ borderTop: '3px solid var(--cyan)' }}>
            <div className="kpi-label">Staff Internal</div>
            <div className="kpi-value" style={{ color: 'var(--cyan)' }}>
              {kpiData.internal}
            </div>
            <div className="kpi-note">
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--cyan)',
                  background: 'var(--cyan-muted)',
                  color: 'var(--cyan)',
                }}
              >
                Staf Obs.
              </span>
            </div>
          </div>
          {/* External */}
          <div className="kpi-card" style={{ borderTop: '3px solid var(--violet)' }}>
            <div className="kpi-label">Staff External</div>
            <div className="kpi-value" style={{ color: 'var(--violet)' }}>
              {kpiData.external}
            </div>
            <div className="kpi-note">
              <span
                style={{
                  padding: '2px 8px',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: '1px solid var(--violet)',
                  background: 'var(--violet-muted)',
                  color: 'var(--violet)',
                }}
              >
                Peneliti Luar
              </span>
            </div>
          </div>
        </div>

        <section className="card" style={{ marginBottom: 24 }} aria-labelledby="presence-title">
          <div className="card-header">
            <div>
              <span className="card-title" id="presence-title">Presence Staff per Resort</span>
              <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 11 }}>
                Pilih resort untuk memfilter staff internal dan external.
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: presenceConnection === 'live' ? 'var(--emerald)' : 'var(--amber)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor' }} />
              {presenceConnection === 'live' ? 'Realtime tersambung' : 'Mode polling'}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 10,
              padding: 16,
            }}
          >
            {resortPresence.map((resort) => {
              const selected = selectedResort === resort.id;
              return (
                <button
                  aria-pressed={selected}
                  key={resort.id}
                  onClick={() => setSelectedResort(resort.id)}
                  type="button"
                  style={{
                    minHeight: 94,
                    padding: '14px 16px',
                    border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: selected ? 'var(--accent-muted)' : 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
                    {resort.name}
                  </span>
                  <span style={{ display: 'block', marginTop: 3, color: 'var(--text-dim)', fontSize: 10 }}>
                    {resort.total} staff terdaftar
                  </span>
                  {resort.id !== 'all' && (
                    <span style={{ display: 'block', marginTop: 7, color: resort.activeInternal > 0 && resort.activeExternal > 0 ? 'var(--emerald)' : 'var(--amber)', fontSize: 10, fontWeight: 700 }}>
                      {resort.activeInternal} Internal · {resort.activeExternal} External
                      {' · '}{resort.activeInternal > 0 && resort.activeExternal > 0 ? 'Coverage Ready' : 'Butuh Staff'}
                    </span>
                  )}
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 10 }}>
                    <span style={{ color: 'var(--emerald)' }}>● {resort.online} Online</span>
                    <span style={{ color: 'var(--amber)' }}>● {resort.idle} Idle</span>
                    <span style={{ color: 'var(--text-dim)' }}>● {resort.offline} Offline</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Search + Filters ── */}
        <div className="card" style={{ marginBottom: 2 }}>
          <div style={{ padding: '16px 22px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)',
                    fontSize: 14,
                    pointerEvents: 'none',
                  }}
                >
                  ⌕
                </span>
                <input
                  className="input"
                  type="text"
                  placeholder="Cari nama, email, institusi…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: 36, width: 300 }}
                />
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

              {/* Role chips */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    marginRight: 4,
                  }}
                >
                  Peran
                </span>
                {roleChips.map((chip) => (
                  <button
                    key={chip}
                    className={`chip${roleFilter === chip ? ' active' : ''}`}
                    onClick={() => setRoleFilter(chip)}
                  >
                    {roleChipLabel[chip]}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

              {/* Status chips */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    marginRight: 4,
                  }}
                >
                  Status
                </span>
                {statusChips.map((chip) => (
                  <button
                    key={chip}
                    className={`chip${statusFilter === chip ? ' active' : ''}`}
                    onClick={() => setStatusFilter(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Result count */}
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filtered.length} dari {users.length} pengguna
              </div>
            </div>
          </div>
        </div>

        {/* ── User Table ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Daftar Pengguna</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Terakhir diperbarui: {formatDate(new Date().toISOString().split('T')[0])}
            </span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Nama &amp; Email</th>
                  <th>Institusi</th>
                  <th>Peran</th>
                  <th>Akun</th>
                  <th>Presence</th>
                  <th style={{ textAlign: 'center' }}>Booking</th>
                  <th>Terakhir Aktif</th>
                  <th style={{ textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        <h3>Tidak Ada Pengguna</h3>
                        <p>
                          Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter saat ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, idx) => (
                    <tr key={user.id}>
                      {/* Index */}
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{idx + 1}</td>

                      {/* Avatar + Nama + Email */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar user={user} size={38} />
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                fontSize: 14,
                                lineHeight: 1.3,
                              }}
                            >
                              {user.nama}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted)',
                                fontWeight: 400,
                                marginTop: 1,
                              }}
                            >
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Institusi */}
                      <td>
                        <div style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                            {user.institusi}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                            {user.kota}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td>
                        <RoleBadge role={user.role} />
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Realtime Presence */}
                      <td>
                        <PresenceBadge presence={user.presence} />
                      </td>

                      {/* Total Booking */}
                      <td style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 36,
                            height: 36,
                            background:
                              user.totalBooking > 5 ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                            color:
                              user.totalBooking > 5 ? 'var(--accent)' : 'var(--text-secondary)',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            fontSize: 15,
                            border:
                              user.totalBooking > 5
                                ? '1px solid var(--accent)'
                                : '1px solid var(--border)',
                          }}
                        >
                          {user.totalBooking}
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {user.lastSeenAt ? (
                          <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {formatLastSeen(user.lastSeenAt)}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                            {user.role === 'Admin' ? 'Tidak dipantau' : 'Belum terdeteksi'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <ActionButton
                            title="Edit Pengguna"
                            icon="✎"
                            hoverBg="var(--cyan-muted)"
                            hoverBorder="var(--cyan)"
                            hoverColor="var(--cyan)"
                            onClick={() => openEdit(user)}
                          />
                          <ActionButton
                            title="Hapus Pengguna"
                            icon="✕"
                            hoverBg="var(--accent-muted)"
                            hoverBorder="var(--accent)"
                            hoverColor="var(--accent)"
                            onClick={() => addToast('Nonaktifkan akun melalui Edit Pengguna agar riwayat booking tetap aman', 'info')}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {filtered.length > 0 && (
            <div
              style={{
                padding: '14px 22px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Menampilkan{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong>{' '}
                pengguna
                {filtered.length < users.length && (
                  <>
                    {' '}dari{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{users.length}</strong> total
                  </>
                )}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                  const count = filtered.filter((u) => u.role === key).length;
                  return count > 0 ? (
                    <span
                      key={key}
                      style={{
                        fontSize: 11,
                        color: cfg.warna,
                        background: cfg.bg,
                        border: `1px solid ${cfg.warna}`,
                        padding: '2px 8px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                      }}
                    >
                      {cfg.label}: {count}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════
          ADD / EDIT MODAL
          ════════════════════════════════ */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="modal" style={{ width: 600 }}>
            {/* Header */}
            <div className="modal-header">
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--text-dim)',
                    marginBottom: 4,
                  }}
                >
                  {modalMode === 'add' ? 'Tambah Baru' : 'Edit Data'}
                </div>
                <h2 className="modal-title">
                  {modalMode === 'add' ? 'Tambah Pengguna' : `Edit — ${editingUser?.nama}`}
                </h2>
              </div>
              <button className="modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="modal-body">
              {/* Role selector */}
              <div style={{ marginBottom: 24 }}>
                <div className="input-label" style={{ marginBottom: 10 }}>
                  Peran Pengguna <span style={{ color: 'var(--accent)' }}>*</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {Object.keys(ROLE_CONFIG).map((role) => (
                    <RoleCard
                      key={role}
                      role={role}
                      selected={form.role}
                      onSelect={handleRoleChange}
                    />
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginBottom: 20 }} />

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Nama — full width */}
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">
                    Nama Lengkap <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Dr. Nama Lengkap"
                    value={form.nama}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, nama: e.target.value }));
                      setFormErrors((fe) => ({ ...fe, nama: '' }));
                    }}
                    style={{ borderColor: formErrors.nama ? 'var(--accent)' : undefined }}
                  />
                  {formErrors.nama && (
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>{formErrors.nama}</span>
                  )}
                </div>

                {/* Email */}
                <div className="input-group">
                  <label className="input-label">
                    Email <span style={{ color: 'var(--accent)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="nama@institusi.id"
                    value={form.email}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, email: e.target.value }));
                      setFormErrors((fe) => ({ ...fe, email: '' }));
                    }}
                    style={{ borderColor: formErrors.email ? 'var(--accent)' : undefined }}
                  />
                  {formErrors.email && (
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>{formErrors.email}</span>
                  )}
                </div>

                {/* Phone */}
                <div className="input-group">
                  <label className="input-label">Nomor Telepon</label>
                  <input
                    className="input"
                    placeholder="+62-8xx-xxxx-xxxx"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>

                {/* Resort assignment */}
                <div className="input-group">
                  <label className="input-label">
                    Resort Staff {form.role !== 'Admin' && <span style={{ color: 'var(--accent)' }}>*</span>}
                  </label>
                  <select
                    className="input"
                    value={form.resortId}
                    disabled={form.role === 'Admin'}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, resortId: e.target.value }));
                      setFormErrors((fe) => ({ ...fe, resortId: '' }));
                    }}
                    style={{ borderColor: formErrors.resortId ? 'var(--accent)' : undefined }}
                  >
                    <option value="">Pilih resort</option>
                    {resorts.map((resort) => (
                      <option value={resort.id} key={resort.id}>
                        {resort.name}{resort.status === 'inactive' ? ' (Persiapan)' : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.resortId && (
                    <span style={{ fontSize: 11, color: 'var(--accent)' }}>{formErrors.resortId}</span>
                  )}
                </div>

                {/* Kota */}
                <div className="input-group">
                  <label className="input-label">Kota</label>
                  <input
                    className="input"
                    placeholder="Mengikuti resort"
                    value={form.kota}
                    readOnly
                  />
                </div>
              </div>

              {/* Status toggle */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                      Status Akun
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {form.status === 'Aktif'
                        ? 'Pengguna dapat login dan menggunakan sistem.'
                        : 'Akun dinonaktifkan — pengguna tidak dapat login.'}
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={form.status === 'Aktif'}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.checked ? 'Aktif' : 'Nonaktif' }))
                      }
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
                <div style={{ marginTop: 10 }}>
                  <StatusBadge status={form.status} />
                </div>
              </div>

              {/* Live Avatar Preview */}
              {form.nama && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <Avatar
                    user={{
                      avatar: getInitials(form.nama),
                      warna: ROLE_CONFIG[form.role]?.warna || '#6b6b6b',
                    }}
                    size={44}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {form.nama}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {form.email || 'email@institusi.id'}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <RoleBadge role={form.role} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {modalMode === 'add' ? '+ Tambah Pengguna' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          DELETE CONFIRMATION MODAL
          ════════════════════════════════ */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}
        >
          <div className="modal" style={{ width: 440 }}>
            <div className="modal-header" style={{ borderLeft: '4px solid var(--accent)' }}>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--accent)',
                    marginBottom: 4,
                  }}
                >
                  Konfirmasi Hapus
                </div>
                <h2 className="modal-title">Hapus Pengguna</h2>
              </div>
              <button className="modal-close" onClick={() => setDeleteTarget(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* User preview */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: 16,
                  background: 'var(--accent-muted)',
                  border: '1px solid var(--border-accent)',
                  marginBottom: 20,
                }}
              >
                <Avatar user={deleteTarget} size={44} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {deleteTarget.nama}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {deleteTarget.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <RoleBadge role={deleteTarget.role} />
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Apakah Anda yakin ingin menghapus pengguna{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.nama}</strong>?
                Tindakan ini tidak dapat dibatalkan.
              </p>

              {deleteTarget.totalBooking > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 14px',
                    background: 'var(--amber-muted)',
                    border: '1px solid var(--amber)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: 'var(--amber)', fontSize: 16, marginTop: 1 }}>⚠</span>
                  <div>
                    <div
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 2 }}
                    >
                      Perhatian
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Pengguna ini memiliki{' '}
                      <strong>{deleteTarget.totalBooking} riwayat booking</strong> yang terkait.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDelete}
                style={{ background: 'var(--accent)' }}
              >
                Ya, Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── ActionButton helper ── */
function ActionButton({ title, icon, hoverBg, hoverBorder, hoverColor, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? hoverBg : 'var(--bg-elevated)',
        border: `1px solid ${hovered ? hoverBorder : 'var(--border)'}`,
        cursor: 'pointer',
        color: hovered ? hoverColor : 'var(--text-secondary)',
        fontSize: 14,
        transition: 'all 0.15s',
        fontFamily: 'var(--font-body)',
      }}
    >
      {icon}
    </button>
  );
}
