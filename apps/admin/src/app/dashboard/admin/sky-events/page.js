'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

const EMPTY_EVENT = {
  title: '',
  eventType: 'astronomy',
  startsAt: '',
  endsAt: '',
  description: '',
  sourceName: 'NASA GSFC / IAU',
  sourceUrl: '',
  visibility: 'both',
  packageId: '',
  observationSpot: '',
  capacity: '',
  priceOverrideUsd: '',
  imageUrl: '',
  status: 'published',
};

const EMPTY_LOCATION = { name: '', latitude: null, longitude: null, timezone: '', observationSpots: '' };

function formatDate(value, language) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function eventFormValue(event) {
  return {
    title: event.title,
    eventType: event.eventType,
    startsAt: event.startsAt?.slice(0, 16) || '',
    endsAt: event.endsAt?.slice(0, 16) || '',
    description: event.description || '',
    sourceName: event.sourceName || '',
    sourceUrl: event.sourceUrl || '',
    visibility: event.visibility || 'both',
    packageId: event.packageId || '',
    observationSpot: event.observationSpot || '',
    capacity: event.capacity ?? '',
    priceOverrideUsd: event.priceOverrideUsd ?? '',
    imageUrl: event.imageUrl || '',
    status: event.status || 'draft',
  };
}

export default function AdminSkyGuidePage() {
  const { language } = useAdminLanguage();
  const [resorts, setResorts] = useState([]);
  const [selectedResortId, setSelectedResortId] = useState('');
  const [events, setEvents] = useState([]);
  const [packages, setPackages] = useState([]);
  const [location, setLocation] = useState(EMPTY_LOCATION);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const notify = useCallback((text, type = 'success') => {
    setMessage({ text, type });
    window.setTimeout(() => setMessage(null), 3500);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/resorts', { cache: 'no-store' }),
      fetch('/api/packages?limit=100', { cache: 'no-store' }),
    ]).then(async ([resortResponse, packageResponse]) => {
      if (!resortResponse.ok || !packageResponse.ok) throw new Error('Gagal memuat data Sky Guide.');
      const [resortData, packageData] = await Promise.all([resortResponse.json(), packageResponse.json()]);
      if (!alive) return;
      setResorts(resortData.resorts || []);
      setPackages(packageData.packages || []);
      setSelectedResortId((current) => current || resortData.resorts?.[0]?.id || '');
    }).catch((error) => {
      if (alive) notify(error.message, 'error');
    });
    return () => { alive = false; };
  }, [notify]);

  const loadResortData = useCallback(async () => {
    if (!selectedResortId) {
      setEvents([]);
      setLocation(EMPTY_LOCATION);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = new URLSearchParams({
        resortId: selectedResortId,
        from: '2020-01-01',
        to: '2035-12-31',
      });
      const [eventResponse, settingResponse] = await Promise.all([
        fetch('/api/sky-events?' + query, { cache: 'no-store' }),
        fetch(`/api/sky-settings?resortId=${encodeURIComponent(selectedResortId)}`, { cache: 'no-store' }),
      ]);
      const [eventData, settingData] = await Promise.all([eventResponse.json(), settingResponse.json()]);
      if (!eventResponse.ok) throw new Error(eventData.error || 'Gagal memuat event.');
      if (!settingResponse.ok) throw new Error(settingData.error || 'Gagal memuat resort.');
      setEvents(eventData.events || []);
      setLocation(settingData.location || EMPTY_LOCATION);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify, selectedResortId]);

  useEffect(() => {
    const timer = window.setTimeout(loadResortData, 0);
    return () => window.clearTimeout(timer);
  }, [loadResortData]);

  const resortPackages = useMemo(
    () => packages.filter((pkg) => pkg.resort_id === selectedResortId && pkg.is_active),
    [packages, selectedResortId]
  );
  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const query = search.trim().toLowerCase();
    return matchesStatus && (!query || event.title.toLowerCase().includes(query)
      || event.sourceName.toLowerCase().includes(query));
  }), [events, search, statusFilter]);

  const openCreate = () => {
    setEditingEvent(null);
    setEventForm(EMPTY_EVENT);
    setModalOpen(true);
  };

  const openEdit = (event) => {
    setEditingEvent(event);
    setEventForm(eventFormValue(event));
    setModalOpen(true);
  };

  const saveEvent = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    try {
      const url = editingEvent ? `/api/sky-events/${editingEvent.id}` : '/api/sky-events';
      const response = await fetch(url, {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventForm, resortId: selectedResortId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyimpan Sky Event.');
      setModalOpen(false);
      notify(editingEvent ? 'Sky Event diperbarui.' : 'Sky Event dibuat.');
      await loadResortData();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (event) => {
    const response = await fetch(`/api/sky-events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resortId: selectedResortId,
        status: event.isPublished ? 'draft' : 'published',
      }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || 'Gagal mengubah status event.', 'error');
    notify(event.isPublished ? 'Event dijadikan draft.' : 'Event dipublikasikan.');
    return loadResortData();
  };

  const removeEvent = async (event) => {
    if (!window.confirm(`Hapus event "${event.title}"?`)) return;
    const response = await fetch(`/api/sky-events/${event.id}?resortId=${encodeURIComponent(selectedResortId)}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || 'Gagal menghapus event.', 'error');
    notify('Sky Event dihapus.');
    return loadResortData();
  };

  const syncOfficial = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sky-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_official_calendar',
          resortId: selectedResortId,
          year: new Date().getFullYear(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sinkronisasi gagal.');
      notify(`${data.insertedCount} event resmi ditambahkan.`);
      await loadResortData();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  const saveObservationSpots = async () => {
    const response = await fetch('/api/sky-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resortId: selectedResortId, observationSpots: location.observationSpots }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || 'Gagal menyimpan titik observasi.', 'error');
    setLocation(data.location);
    return notify('Titik observasi disimpan.');
  };

  return (
    <div className="fade-in-up sky-events-page">
      {message && <div className={`toast toast-${message.type}`}>{message.text}</div>}

      <header className="page-header calendar-page-header">
        <div>
          <span className="calendar-kicker">NASA · IAU · IMO · ESA</span>
          <h1 className="page-title">Sky Guide Hub</h1>
          <p>Admin dan Internal mengelola Sky Event resort pada sumber data yang sama.</p>
        </div>
        <div className="calendar-header-actions">
          <button className="btn btn-secondary btn-sm" type="button" disabled={!selectedResortId || syncing} onClick={syncOfficial}>
            {syncing ? 'Menyinkronkan...' : 'Sinkronkan Event Resmi'}
          </button>
          <button className="btn btn-primary btn-sm" type="button" disabled={!selectedResortId} onClick={openCreate}>+ Tambah Event</button>
        </div>
      </header>

      <section className="card" style={{ padding: 18, marginBottom: 18 }}>
        <label className="input-group" style={{ maxWidth: 460 }}>
          <span className="input-label">Resort yang dikelola</span>
          <select className="input" value={selectedResortId} onChange={(event) => setSelectedResortId(event.target.value)}>
            {resorts.length === 0 && <option value="">Belum ada resort</option>}
            {resorts.map((resort) => <option key={resort.id} value={resort.id}>{resort.name}</option>)}
          </select>
        </label>
      </section>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi-card"><span>Total Event</span><strong>{events.length}</strong></div>
        <div className="kpi-card"><span>Published</span><strong>{events.filter((event) => event.isPublished).length}</strong></div>
        <div className="kpi-card"><span>Package Resort</span><strong>{resortPackages.length}</strong></div>
        <div className="kpi-card"><span>Lokasi</span><strong style={{ fontSize: 14 }}>{location.name || '-'}</strong></div>
      </div>

      <section className="card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 340 }} placeholder="Cari judul atau sumber..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="input" style={{ maxWidth: 180 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">Semua status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
            <option value="sold_out">Sold out</option>
          </select>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="table-container">
          <table>
            <thead><tr><th>Event</th><th>Resort</th><th>Waktu</th><th>Package</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Memuat Sky Event...</td></tr>}
              {!loading && filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td><strong>{event.title}</strong><small style={{ display: 'block' }}>{event.sourceName || event.eventType}</small></td>
                  <td>{event.resortName || location.name}</td>
                  <td>{formatDate(event.startsAt, language)}</td>
                  <td>{event.packageName || 'Tanpa package'}</td>
                  <td><span className={`tag ${event.isPublished ? 'tag-completed' : 'tag-pending'}`}>{event.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => togglePublished(event)}>{event.isPublished ? 'Jadikan Draft' : 'Publish'}</button>
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => openEdit(event)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeEvent(event)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredEvents.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>Belum ada Sky Event untuk resort ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" style={{ padding: 18 }}>
        <h2 style={{ marginTop: 0 }}>Titik Observasi Resort</h2>
        <p>{location.latitude ?? '-'}, {location.longitude ?? '-'} · {location.timezone || '-'}</p>
        <textarea className="input" rows={3} value={location.observationSpots} onChange={(event) => setLocation({ ...location, observationSpots: event.target.value })} placeholder="Pantai, rooftop, jetty..." />
        <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} type="button" disabled={!selectedResortId} onClick={saveObservationSpots}>Simpan Titik Observasi</button>
      </section>

      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingEvent ? 'Edit Sky Event' : 'Tambah Sky Event'}</h2>
              <button className="modal-close" type="button" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveEvent} style={{ padding: 22 }}>
              <div className="form-grid">
                <label className="input-group full-width"><span className="input-label">Judul *</span><input className="input" required maxLength={120} value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">Jenis</span><select className="input" value={eventForm.eventType} onChange={(event) => setEventForm({ ...eventForm, eventType: event.target.value })}><option value="astronomy">Astronomi</option><option value="meteor">Meteor</option><option value="resort">Event Resort</option></select></label>
                <label className="input-group"><span className="input-label">Status</span><select className="input" value={eventForm.status} onChange={(event) => setEventForm({ ...eventForm, status: event.target.value })}><option value="published">Published</option><option value="draft">Draft</option><option value="cancelled">Cancelled</option><option value="sold_out">Sold out</option></select></label>
                <label className="input-group"><span className="input-label">Mulai *</span><input className="input" type="datetime-local" required value={eventForm.startsAt} onChange={(event) => setEventForm({ ...eventForm, startsAt: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">Selesai</span><input className="input" type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm({ ...eventForm, endsAt: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">Package</span><select className="input" value={eventForm.packageId} onChange={(event) => setEventForm({ ...eventForm, packageId: event.target.value })}><option value="">Tanpa package</option>{resortPackages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name}</option>)}</select></label>
                <label className="input-group"><span className="input-label">Titik observasi</span><input className="input" list="admin-observation-spots" value={eventForm.observationSpot} onChange={(event) => setEventForm({ ...eventForm, observationSpot: event.target.value })} /><datalist id="admin-observation-spots">{location.observationSpots.split(',').map((spot) => spot.trim()).filter(Boolean).map((spot) => <option key={spot} value={spot} />)}</datalist></label>
                <label className="input-group"><span className="input-label">Kapasitas</span><input className="input" type="number" min="1" value={eventForm.capacity} onChange={(event) => setEventForm({ ...eventForm, capacity: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">Harga override USD</span><input className="input" type="number" min="0" step="0.01" value={eventForm.priceOverrideUsd} onChange={(event) => setEventForm({ ...eventForm, priceOverrideUsd: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">Sumber</span><input className="input" value={eventForm.sourceName} onChange={(event) => setEventForm({ ...eventForm, sourceName: event.target.value })} /></label>
                <label className="input-group"><span className="input-label">URL sumber</span><input className="input" type="url" value={eventForm.sourceUrl} onChange={(event) => setEventForm({ ...eventForm, sourceUrl: event.target.value })} /></label>
                <label className="input-group full-width"><span className="input-label">Deskripsi</span><textarea className="input" rows={3} maxLength={1500} value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} /></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
                <button className="btn btn-secondary" type="button" onClick={() => setModalOpen(false)}>Batal</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
