'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';

const EMPTY_EVENT = {
  title: '',
  eventType: 'astronomy',
  startsAt: '',
  endsAt: '',
  description: '',
  sourceName: 'NASA GSFC / IAU',
  sourceUrl: '',
  visibility: 'both',
  isPublished: true,
};

const DEFAULT_LOCATION = {
  name: 'Jakarta, Indonesia',
  latitude: -6.2088,
  longitude: 106.8456,
  timezone: 'Asia/Jakarta',
};

const LOCATION_PRESETS = [
  { name: 'Jakarta (Ephemeris Pilot HQ)', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  { name: 'Bosscha Observatory, Lembang', latitude: -6.8247, longitude: 107.6167, timezone: 'Asia/Jakarta' },
  { name: 'Bali Coastal Observatory', latitude: -8.7482, longitude: 115.1672, timezone: 'Asia/Makassar' },
  { name: 'Le Meridien Maldives (Thilamaafushi)', latitude: 5.3725, longitude: 73.4912, timezone: 'Indian/Maldives' },
];

const METEOR_CATALOG = [
  { name: 'Quadrantids', peakDate: '03–04 Jan', zhr: '110 meteor/jam', radiant: 'Boötes', parent: 'Asteroid 2003 EH1', active: '28 Des – 12 Jan', desc: 'Hujan meteor awal tahun berintensitas sangat tinggi dengan durasi puncak singkat.', source: 'IMO / IAU' },
  { name: 'Lyrids', peakDate: '22–23 Apr', zhr: '18 meteor/jam', radiant: 'Lyra (dekat Vega)', parent: 'Komet C/1861 G1 (Thatcher)', active: '16 – 25 Apr', desc: 'Hujan meteor tertua dalam catatan sejarah astronomi, terkenal dengan jejak debu bercahaya.', source: 'IAU Meteor Data Center' },
  { name: 'Eta Aquariids', peakDate: '05–06 Mei', zhr: '50 meteor/jam', radiant: 'Aquarius', parent: 'Komet 1P/Halley', active: '19 Apr – 28 Mei', desc: 'Berasal dari debu Komet Halley, sangat ideal diamati dari wilayah tropis & khatulistiwa.', source: 'NASA Meteoroid Environment' },
  { name: 'Southern Delta Aquariids', peakDate: '29–30 Jul', zhr: '25 meteor/jam', radiant: 'Aquarius', parent: 'Komet 96P/Machholz', active: '12 Jul – 23 Agu', desc: 'Membuka musim pengamatan langit malam pertengahan tahun sebelum puncak Perseids.', source: 'IMO' },
  { name: 'Perseids', peakDate: '12–13 Agu', zhr: '100 meteor/jam', radiant: 'Perseus', parent: 'Komet 109P/Swift-Tuttle', active: '17 Jul – 24 Agu', desc: 'Ratu hujan meteor musim panas dunia, terkenal dengan bola api (fireball) terang spektakuler.', source: 'NASA GSFC / IMO' },
  { name: 'Orionids', peakDate: '21–22 Okt', zhr: '20 meteor/jam', radiant: 'Orion (Betelgeuse)', parent: 'Komet 1P/Halley', active: '2 Okt – 7 Nov', desc: 'Lintasan kedua debu Komet Halley berkecepatan 66 km/detik dengan pijaran tajam.', source: 'NASA / IAU' },
  { name: 'Leonids', peakDate: '17–18 Nov', zhr: '15 meteor/jam', radiant: 'Leo', parent: 'Komet 55P/Tempel-Tuttle', active: '6 – 30 Nov', desc: 'Terkenal dengan siklus badai meteor periodik dan kilatan warna kehijauan/kebiruan.', source: 'IAU / NASA' },
  { name: 'Geminids', peakDate: '13–14 Des', zhr: '150 meteor/jam', radiant: 'Gemini (Castor)', parent: 'Asteroid 3200 Phaethon', active: '4 – 20 Des', desc: 'Raja hujan meteor tahunan dengan laju tertinggi, multi-warna, dan pergerakan lambat anggun.', source: 'NASA GSFC / IMO' },
  { name: 'Ursids', peakDate: '22–23 Des', zhr: '10 meteor/jam', radiant: 'Ursa Minor (Polaris)', parent: 'Komet 8P/Tuttle', active: '17 – 26 Des', desc: 'Hujan meteor penutup akhir tahun di sekitar Bintang Kutub Utara.', source: 'IMO / IAU' },
];

const SPACE_DAYS_CATALOG = [
  { date: '12 April', title: "Yuri's Night & Human Space Flight Day", org: 'PBB / UN & NASA', desc: 'Peringatan penerbangan manusia pertama ke antariksa oleh Yuri Gagarin (1961) dan misi STS-1.' },
  { date: '24 April', title: 'Hubble Space Telescope Launch Anniversary', org: 'NASA & ESA', desc: 'Perayaan peluncuran Teleskop Luar Angkasa Hubble yang merevolusi sains astronomi dunia.' },
  { date: '15 Mei', title: 'International Astronomy Day (Spring)', org: 'Astronomical League / IAU', desc: 'Hari Astronomi Internasional musim semi untuk edukasi publik dan pengamatan teleskop.' },
  { date: '30 Juni', title: 'International Asteroid Day (UN Sanctioned)', org: 'PBB / UN & ESA', desc: 'Hari Asteroid Internasional untuk kesadaran global terhadap pertahanan dan sains asteroid.' },
  { date: '20 Juli', title: 'International Moon Day (Apollo 11 Landing)', org: 'PBB / UN & NASA', desc: 'Peringatan bersejarah pendaratan manusia pertama di Bulan (Apollo 11, 1969).' },
  { date: '04–10 Okt', title: 'UN World Space Week (Pekan Antariksa Sedunia)', org: 'United Nations General Assembly', desc: 'Pekan perayaan teknologi dan eksplorasi antariksa sedunia terbesar di planet Bumi.' },
  { date: '12 Oktober', title: 'International Astronomy Day (Autumn)', org: 'Astronomical League / IAU', desc: 'Hari Astronomi Internasional musim gugur untuk menyambut konstelasi langit akhir tahun.' },
  { date: '25 Desember', title: 'James Webb Space Telescope (JWST) Launch Day', org: 'NASA / ESA / CSA', desc: 'Peringatan peluncuran observatori inframerah antariksa tercanggih dalam sejarah manusia.' },
];

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatDateShort(value) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return String(value).slice(0, 10);
  }
}

export default function SkyEventsAdminPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Forms
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventRes, settingsRes] = await Promise.all([
        fetch('/api/sky-events?scope=admin&from=2020-01-01&to=2035-12-31', { cache: 'no-store' }),
        fetch('/api/sky-settings', { cache: 'no-store' }),
      ]);
      const eventData = eventRes.ok ? await eventRes.json() : { events: [] };
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};
      
      setEvents(eventData.events || []);
      if (settingsData.location) {
        setLocation(settingsData.location);
      }
    } catch {
      showToast('Gagal memuat data kalender langit.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quick 1-Click Sync from NASA / IAU / IMO
  const handleSyncOfficialCalendar = async () => {
    try {
      setSyncing(true);
      const currentYear = new Date().getFullYear();
      const response = await fetch('/api/sky-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_official_calendar',
          year: currentYear,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyinkronkan kalender.');
      }
      showToast(data.message || `Berhasil menyinkronkan event resmi NASA/IAU untuk tahun ${currentYear}!`, 'success');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAddModal = (preset = null) => {
    if (preset) {
      const now = new Date();
      const starts = `${now.getFullYear()}-08-12T21:00`;
      setEventForm({
        ...EMPTY_EVENT,
        title: preset.name ? `Pengamatan Hujan Meteor ${preset.name}` : preset.title || '',
        eventType: preset.name ? 'meteor' : 'astronomy',
        startsAt: starts,
        description: preset.desc || preset.description || '',
        sourceName: preset.source || preset.org || 'NASA / IAU',
      });
    } else {
      setEventForm(EMPTY_EVENT);
    }
    setEditingEvent(null);
    setEventModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingEvent(item);
    setEventForm({
      title: item.title,
      eventType: item.eventType || 'astronomy',
      startsAt: item.startsAt ? item.startsAt.slice(0, 16) : '',
      endsAt: item.endsAt ? item.endsAt.slice(0, 16) : '',
      description: item.description || '',
      sourceName: item.sourceName || '',
      sourceUrl: item.sourceUrl || '',
      visibility: item.visibility || 'both',
      isPublished: item.isPublished !== false,
    });
    setEventModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.startsAt) {
      showToast('Judul dan waktu mulai wajib diisi.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const url = editingEvent ? `/api/sky-events/${editingEvent.id}` : '/api/sky-events';
      const method = editingEvent ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan event langit.');
      }

      showToast(editingEvent ? 'Event berhasil diperbarui.' : 'Event langit berhasil ditambahkan.', 'success');
      setEventModalOpen(false);
      setEditingEvent(null);
      setEventForm(EMPTY_EVENT);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (item) => {
    try {
      const response = await fetch(`/api/sky-events/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      if (!response.ok) throw new Error('Gagal memperbarui status event.');
      
      setEvents((prev) => prev.map((evt) => evt.id === item.id ? { ...evt, isPublished: !evt.isPublished } : evt));
      showToast(item.isPublished ? 'Event disembunyikan dari tamu.' : 'Event berhasil dipublikasikan ke tamu.');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteEvent = async (item) => {
    if (!window.confirm(`Hapus event "${item.title}"?`)) return;
    try {
      const response = await fetch(`/api/sky-events/${item.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Gagal menghapus event.');
      setEvents((prev) => prev.filter((evt) => evt.id !== item.id));
      showToast(`Event "${item.title}" berhasil dihapus.`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/sky-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan lokasi.');
      setLocation(data.location);
      showToast('Koordinat observatori pilot berhasil disimpan.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (categoryFilter !== 'all') {
      list = list.filter((e) => e.eventType === categoryFilter);
    }
    if (statusFilter === 'published') {
      list = list.filter((e) => e.isPublished);
    } else if (statusFilter === 'draft') {
      list = list.filter((e) => !e.isPublished);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.sourceName && e.sourceName.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  }, [events, categoryFilter, statusFilter, searchQuery]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = events.length;
    const published = events.filter((e) => e.isPublished).length;
    const meteors = events.filter((e) => e.eventType === 'meteor').length;
    const astronomy = events.filter((e) => e.eventType === 'astronomy').length;
    return { total, published, meteors, astronomy };
  }, [events]);

  return (
    <div className="fade-in-up">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      {/* Top Header & Observatory Meta */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Pusat Intelijen Astronomi & Kalender Langit
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(8, 145, 178, 0.12)', color: '#0891b2', border: '1px solid rgba(8, 145, 178, 0.25)' }}>
              🛰️ NASA · IAU · IMO · ESA
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Sky Guide Hub
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            Kelola peristiwa astronomi resmi, gerhana matahari/bulan, hujan meteor tahunan, dan jadwal pengamatan resort.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSyncOfficialCalendar}
            disabled={syncing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
          >
            {syncing ? '⚡ Menyinkronkan...' : '⚡ 1-Click Sync NASA/IAU (2026)'}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenAddModal()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            + Tambah Event Baru
          </button>
          <a
            href={process.env.NEXT_PUBLIC_LANDING_URL || '/sky'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            🌐 Buka PWA Tamu ↗
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #0891b2' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Event Dikelola
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11, color: 'var(--emerald, #059669)', marginTop: 2 }}>
            ✓ {stats.published} tayang di PWA publik
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hujan Meteor Dunia
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {stats.meteors} <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>/ 9 Besar IMO</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            Perseids, Geminids, Quadrantids
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fenomena NASA / IAU
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
            {stats.astronomy}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            Gerhana, Oposisi, Bulan Baru
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Observatori Pilot Aktif
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📍 {location.name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
            Lat: {Number(location.latitude).toFixed(3)}°, Lon: {Number(location.longitude).toFixed(3)}°
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          type="button"
          className={`staff-filter-tab ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: '6px 6px 0 0', borderBottom: activeTab === 'calendar' ? '2px solid var(--accent, #e11d48)' : 'none' }}
        >
          📅 Kalender & Event Terdaftar ({filteredEvents.length})
        </button>
        <button
          type="button"
          className={`staff-filter-tab ${activeTab === 'meteors' ? 'active' : ''}`}
          onClick={() => setActiveTab('meteors')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: '6px 6px 0 0', borderBottom: activeTab === 'meteors' ? '2px solid var(--accent, #e11d48)' : 'none' }}
        >
          ☄️ Katalog Hujan Meteor (IMO)
        </button>
        <button
          type="button"
          className={`staff-filter-tab ${activeTab === 'spacedays' ? 'active' : ''}`}
          onClick={() => setActiveTab('spacedays')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: '6px 6px 0 0', borderBottom: activeTab === 'spacedays' ? '2px solid var(--accent, #e11d48)' : 'none' }}
        >
          🚀 Hari Antariksa Sedunia (UN & Space Days)
        </button>
        <button
          type="button"
          className={`staff-filter-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, borderRadius: '6px 6px 0 0', borderBottom: activeTab === 'settings' ? '2px solid var(--accent, #e11d48)' : 'none' }}
        >
          ⚙️ Koordinat & Lokasi Observasi
        </button>
      </div>

      {/* TAB 1: CALENDAR & MANAGED EVENTS */}
      {activeTab === 'calendar' && (
        <div>
          {/* Filter & Search Bar */}
          <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="🔍 Cari fenomena, sumber NASA/IAU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: 240, padding: '6px 12px', fontSize: 13 }}
                />
                <select
                  className="input"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                >
                  <option value="all">Semua Kategori</option>
                  <option value="astronomy">🔭 Astronomi & Gerhana (NASA/IAU)</option>
                  <option value="meteor">☄️ Hujan Meteor (IMO)</option>
                  <option value="resort">🏝️ Event Khusus Resort</option>
                </select>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
                >
                  <option value="all">Semua Status</option>
                  <option value="published">Publik (Tayang di PWA)</option>
                  <option value="draft">Draft (Tersembunyi)</option>
                </select>
              </div>

              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Menampilkan <b>{filteredEvents.length}</b> dari {events.length} event
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nama Peristiwa & Fenomena</th>
                    <th>Jadwal / Puncak</th>
                    <th>Kategori</th>
                    <th>Sumber Ilmiah</th>
                    <th>Arah Langit</th>
                    <th>Status PWA</th>
                    <th style={{ textAlign: 'center', minWidth: 150 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        Memuat data kalender langit...
                      </td>
                    </tr>
                  )}
                  {!loading && filteredEvents.map((item) => (
                    <tr key={item.id}>
                      <td className="name-cell">
                        <strong style={{ fontSize: 14 }}>{item.title}</strong>
                        {item.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3, maxWidth: 360, lineHeight: 1.4 }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        <strong>{formatDate(item.startsAt)}</strong>
                        {item.endsAt && (
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                            s/d {formatDateShort(item.endsAt)}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`tag ${item.eventType === 'meteor' ? 'tag-info' : item.eventType === 'resort' ? 'tag-pending' : 'tag-completed'}`}>
                          {item.eventType === 'meteor' ? '☄️ Meteor' : item.eventType === 'resort' ? '🏝️ Resort' : '🔭 Astronomi'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {item.sourceName || 'NASA / IAU'}
                        </span>
                        {item.sourceUrl && (
                          <div style={{ marginTop: 2 }}>
                            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#0891b2', textDecoration: 'none' }}>
                              Dokumen Resmi ↗
                            </a>
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 11, textTransform: 'capitalize', color: 'var(--text-dim)' }}>
                          {item.visibility === 'both' ? 'Utara & Selatan' : item.visibility === 'north' ? 'Langit Utara' : 'Langit Selatan'}
                        </span>
                      </td>
                      <td>
                        <span className={`tag ${item.isPublished ? 'tag-completed' : 'tag-cancelled'}`}>
                          {item.isPublished ? '✓ Publik' : '✕ Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleTogglePublish(item)}
                          >
                            {item.isPublished ? 'Sembunyikan' : 'Publikasikan'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleOpenEditModal(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px', color: 'var(--accent, #e11d48)' }}
                            onClick={() => handleDeleteEvent(item)}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🌌</div>
                        Belum ada event langit yang sesuai. Klik tombol <b>&quot;⚡ 1-Click Sync NASA/IAU&quot;</b> di atas untuk memuat kalender resmi secara otomatis.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METEORS CATALOG */}
      {activeTab === 'meteors' && (
        <div>
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'linear-gradient(135deg, rgba(8,145,178,0.06), rgba(124,58,237,0.06))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                  ☄️ Katalog Resmi Hujan Meteor Tahunan (IMO & IAU Meteor Center)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  Data referensi standar internasional untuk perencanaan malam pengamatan bintang dan event spesial di resort mitra.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSyncOfficialCalendar}
                disabled={syncing}
              >
                ⚡ Sinkronkan Semua ke Kalender Tamu
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {METEOR_CATALOG.map((m, idx) => (
              <div key={idx} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>{m.name}</h4>
                      <span style={{ fontSize: 11, color: '#0891b2', fontWeight: 600 }}>Rasi: {m.radiant}</span>
                    </div>
                    <span className="tag tag-info" style={{ fontWeight: 800 }}>{m.zhr}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, margin: '8px 0' }}>
                    {m.desc}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface-sunken)', padding: '8px 10px', borderRadius: 6, marginTop: 10 }}>
                    <div><b>Periode Aktif:</b> {m.active}</div>
                    <div><b>Malam Puncak:</b> <span style={{ color: 'var(--accent, #e11d48)', fontWeight: 700 }}>{m.peakDate}</span></div>
                    <div><b>Asal Debu:</b> {m.parent}</div>
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sumber: {m.source}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11 }}
                    onClick={() => handleOpenAddModal(m)}
                  >
                    + Buat Event Resort
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: INTERNATIONAL SPACE DAYS */}
      {activeTab === 'spacedays' && (
        <div>
          <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(16,185,129,0.06))' }}>
            <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
              🚀 Kalender Hari Antariksa & Misi Bersejarah Dunia (PBB / NASA / ESA)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Momen perayaan global ilmu antariksa yang dapat digunakan sebagai tema edukasi dan promosi program astronomi resort.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {SPACE_DAYS_CATALOG.map((sd, idx) => (
              <div key={idx} className="card" style={{ padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>{sd.title}</h4>
                    <span className="tag tag-completed" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{sd.date}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, margin: '8px 0' }}>
                    {sd.desc}
                  </p>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                    <b>Organisasi Resmi:</b> {sd.org}
                  </div>
                </div>
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: 11 }}
                    onClick={() => handleOpenAddModal(sd)}
                  >
                    + Jadwalkan di Kalender
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: OBSERVATORY COORDINATES SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 780 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">📍 Titik Koordinat Observatori Pilot</span>
            </div>
            <form className="card-body" onSubmit={handleSaveLocation}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Koordinat GPS ini digunakan oleh mesin kalkulasi astronomi (Astronomy Engine & NASA Algorithms) untuk menghitung waktu terbit/terbenam matahari, sudut iluminasi bulan, serta elevasi benda langit secara presisi.
              </p>

              {/* Preset Selector */}
              <div style={{ marginBottom: 16 }}>
                <label className="input-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>
                  Pilih Preset Observatori / Resort:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {LOCATION_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => setLocation(p)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <label className="input-group">
                  <span className="input-label">Nama Lokasi</span>
                  <input
                    className="input"
                    value={location.name}
                    onChange={(e) => setLocation({ ...location, name: e.target.value })}
                    required
                  />
                </label>
                <label className="input-group">
                  <span className="input-label">Latitude (Lintang)</span>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={location.latitude}
                    onChange={(e) => setLocation({ ...location, latitude: Number(e.target.value) })}
                    required
                  />
                </label>
                <label className="input-group">
                  <span className="input-label">Longitude (Bujur)</span>
                  <input
                    className="input"
                    type="number"
                    step="any"
                    value={location.longitude}
                    onChange={(e) => setLocation({ ...location, longitude: Number(e.target.value) })}
                    required
                  />
                </label>
                <label className="input-group">
                  <span className="input-label">Zona Waktu (IANA)</span>
                  <input
                    className="input"
                    value={location.timezone}
                    onChange={(e) => setLocation({ ...location, timezone: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div style={{ marginTop: 20 }}>
                <button className="btn btn-primary" type="submit">
                  Simpan Koordinat Observatori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT EVENT MODAL */}
      {eventModalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>
                {editingEvent ? '✏️ Edit Event Langit' : '✨ Tambah Event Astronomi / Resort'}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEventModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ padding: '18px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label className="input-group">
                  <span className="input-label">Judul Event / Fenomena *</span>
                  <input
                    className="input"
                    placeholder="Contoh: Puncak Hujan Meteor Perseids 2026"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    required
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <label className="input-group">
                    <span className="input-label">Jenis Kategori</span>
                    <select
                      className="input"
                      value={eventForm.eventType}
                      onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                    >
                      <option value="astronomy">🔭 Astronomi & Gerhana</option>
                      <option value="meteor">☄️ Hujan Meteor</option>
                      <option value="resort">🏝️ Event Khusus Resort</option>
                    </select>
                  </label>

                  <label className="input-group">
                    <span className="input-label">Arah Panduan Langit</span>
                    <select
                      className="input"
                      value={eventForm.visibility}
                      onChange={(e) => setEventForm({ ...eventForm, visibility: e.target.value })}
                    >
                      <option value="both">Utara & Selatan (Seluruh Langit)</option>
                      <option value="north">Langit Utara</option>
                      <option value="south">Langit Selatan</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <label className="input-group">
                    <span className="input-label">Waktu Mulai / Puncak *</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={eventForm.startsAt}
                      onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                      required
                    />
                  </label>
                  <label className="input-group">
                    <span className="input-label">Waktu Selesai (Opsional)</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={eventForm.endsAt}
                      onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <label className="input-group">
                    <span className="input-label">Sumber Ilmiah</span>
                    <input
                      className="input"
                      placeholder="NASA GSFC / IAU / IMO"
                      value={eventForm.sourceName}
                      onChange={(e) => setEventForm({ ...eventForm, sourceName: e.target.value })}
                    />
                  </label>
                  <label className="input-group">
                    <span className="input-label">URL Referensi / Sumber</span>
                    <input
                      className="input"
                      placeholder="https://science.nasa.gov/..."
                      value={eventForm.sourceUrl}
                      onChange={(e) => setEventForm({ ...eventForm, sourceUrl: e.target.value })}
                    />
                  </label>
                </div>

                <label className="input-group">
                  <span className="input-label">Deskripsi Edukasi & Pengamatan</span>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Tuliskan keterangan fenomena langit, tips pengamatan di teleskop, atau panduan untuk tamu..."
                    value={eventForm.description}
                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  />
                </label>

                <div style={{ padding: '8px 0' }}>
                  <label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={eventForm.isPublished}
                      onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })}
                    />
                    <span>Tampilkan ke tamu di aplikasi publik (PWA Sky Guide)</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEventModalOpen(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Menyimpan...' : editingEvent ? 'Simpan Perubahan' : 'Tambah Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

