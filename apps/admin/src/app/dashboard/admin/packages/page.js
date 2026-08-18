'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AttachmentUpload } from '@/components/motion/AttachmentUpload';
import { usePackagesQuery, useCreatePackageMutation, queryKeys, fetchApi } from '@/lib/apiQueries';

const EMPTY = {
  name: '',
  packageType: 'regular',
  experienceType: 'communal',
  location: '',
  description: '',
  adultPriceUsd: 0,
  childPriceUsd: '',
  childAgeRange: '',
  isActive: true,
};

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const { data: packages = [], isLoading, error } = usePackagesQuery();
  const createMutation = useCreatePackageMutation();

  const [form, setForm] = useState(EMPTY);
  const [imageItems, setImageItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  // Derived: the actual File object from the first (and only) attachment
  const imageFile = imageItems[0]?.file ?? null;

  const createPackage = async (event) => {
    event.preventDefault();
    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
      setMessage('Gambar maksimal 2MB.');
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, String(value ?? '')));
    if (imageFile) payload.append('image', imageFile);

    try {
      await createMutation.mutateAsync(payload);
      setForm(EMPTY);
      setImageItems([]);
      setShowForm(false);
      setMessage('Package berhasil dibuat.');
    } catch (err) {
      setMessage(err.message || 'Package gagal dibuat.');
    }
  };

  const toggleActive = async (pkg) => {
    try {
      await fetchApi(`/api/packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.is_active }),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
    } catch (err) {
      setMessage(err.message || 'Gagal mengubah status package.');
    }
  };

  return (
    <div className="fade-in-up">
      <div className="form-booking-toolbar" style={{ marginBottom: 18 }}>
        <div>
          <h1>Package & Harga</h1>
          <p>Kelola nama package, harga, status aktif, dan estimasi umur anak.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>
          {showForm ? 'Tutup Form' : '+ Tambah Package'}
        </button>
      </div>
      {message && <div className="external-booking-note" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{error.message}</div>}


      {showForm && (
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Tambah Package Baru</span>
        </div>
        <form className="card-body" onSubmit={createPackage}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
            <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Select label="Type" value={form.packageType} onChange={(value) => setForm({ ...form, packageType: value })} options={['regular', 'private', 'kids']} />
            <Select label="Experience" value={form.experienceType} onChange={(value) => setForm({ ...form, experienceType: value })} options={['communal', 'private', 'kids']} />
            <Input label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} required />
            <Input label="Adult Price USD" type="number" min="0" value={form.adultPriceUsd} onChange={(value) => setForm({ ...form, adultPriceUsd: value })} required />
            <Input label="Child Price USD" type="number" min="0" value={form.childPriceUsd} onChange={(value) => setForm({ ...form, childPriceUsd: value })} />
            <Input label="Estimasi Umur Anak" value={form.childAgeRange} onChange={(value) => setForm({ ...form, childAgeRange: value })} placeholder="Contoh: 6 - 15 tahun" />
            <div className="input-group">
              <span className="input-label">Gambar Package</span>
              <AttachmentUpload
                value={imageItems}
                onValueChange={setImageItems}
                onFilesRejected={(files, reason) => {
                  if (reason === 'too-large') setMessage('Gambar maksimal 2MB.');
                  else setMessage('Hanya 1 gambar yang diperbolehkan.');
                }}
                multiple={false}
                maxFiles={1}
                maxFileSize={MAX_IMAGE_SIZE}
                accept="image/jpeg,image/png,image/webp"
                title="Drag & drop atau pilih gambar"
                description="JPEG, PNG, WebP — maks 2MB"
                attachmentsLabel="Gambar dipilih"
              />
            </div>
            <label className="input-group" style={{ gridColumn: 'span 2' }}>
              <span className="input-label">Deskripsi Singkat</span>
              <textarea className="input" rows="2" maxLength="240" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ringkasan singkat isi package untuk staff." />
            </label>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Aktifkan package
            </label>
            <button className="btn btn-primary" type="submit">Tambah Package</button>
          </div>
        </form>
      </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Daftar Package</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{packages.length} package</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Image</th>
                <th>Type</th>
                <th>Experience</th>
                <th>Location</th>
                <th>Umur Anak</th>
                <th style={{ textAlign: 'right' }}>Adult</th>
                <th style={{ textAlign: 'right' }}>Child</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="name-cell">{pkg.name}</td>
                  <td>{pkg.image_url ? <Image src={pkg.image_url} alt={pkg.name} width={54} height={36} unoptimized style={{ objectFit: 'cover', border: '1px solid var(--border)' }} /> : '-'}</td>
                  <td>{pkg.package_type}</td>
                  <td>{pkg.experience_type}</td>
                  <td>{pkg.location}</td>
                  <td>{pkg.child_age_range || '-'}</td>
                  <td style={{ textAlign: 'right' }}>${pkg.adult_price_usd}</td>
                  <td style={{ textAlign: 'right' }}>{pkg.child_price_usd === null ? '-' : `$${pkg.child_price_usd}`}</td>
                  <td><span className={`tag ${pkg.is_active ? 'tag-completed' : 'tag-cancelled'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(pkg)}>
                      {pkg.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, min, placeholder = '' }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input className="input" type={type} min={min} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}
