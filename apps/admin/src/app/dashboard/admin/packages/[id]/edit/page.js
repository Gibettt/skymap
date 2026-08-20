'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AttachmentUpload } from '@/components/motion/AttachmentUpload';
import { usePackagesQuery, useResortsQuery, useUpdatePackageMutation } from '@/lib/apiQueries';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function packageToForm(pkg) {
  return {
    name: pkg.name,
    packageType: pkg.package_type,
    experienceType: pkg.experience_type,
    location: pkg.location,
    description: pkg.description || '',
    schedule: pkg.schedule || 'Upon request',
    adultPriceUsd: pkg.adult_price_usd,
    childPriceUsd: pkg.child_price_usd === null ? '' : pkg.child_price_usd,
    childAgeRange: pkg.child_age_range || '',
    inclusions: pkg.inclusions?.length ? pkg.inclusions : [''],
    resortId: pkg.resort_id || '',
    isChargeable: pkg.is_chargeable,
    isActive: pkg.is_active,
  };
}

export default function EditPackagePage() {
  const { id } = useParams();
  const { data: packages = [], isLoading, error } = usePackagesQuery();
  const { data: resorts = [], error: resortsError } = useResortsQuery();
  const pkg = packages.find((item) => String(item.id) === String(id));

  if (isLoading) {
    return <div className="external-booking-note">Memuat data package...</div>;
  }

  if (error) {
    return <PackageLoadError message={error.message || 'Gagal memuat data package.'} />;
  }

  if (!pkg) {
    return <PackageLoadError message="Package tidak ditemukan." />;
  }

  return <PackageEditForm key={pkg.id} pkg={pkg} resorts={resorts} resortsError={resortsError} />;
}

function PackageEditForm({ pkg, resorts, resortsError }) {
  const router = useRouter();
  const updateMutation = useUpdatePackageMutation();
  const [form, setForm] = useState(() => packageToForm(pkg));
  const [imageItems, setImageItems] = useState([]);
  const [message, setMessage] = useState('');

  const updateInclusion = (index, value) => {
    setForm((current) => ({
      ...current,
      inclusions: current.inclusions.map((item, itemIndex) => itemIndex === index ? value : item),
    }));
  };

  const addInclusion = () => {
    setForm((current) => current.inclusions.length >= 20
      ? current
      : { ...current, inclusions: [...current.inclusions, ''] });
  };

  const removeInclusion = (index) => {
    setForm((current) => ({
      ...current,
      inclusions: current.inclusions.length === 1
        ? ['']
        : current.inclusions.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const imageFile = imageItems[0]?.file ?? null;
    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
      setMessage('Gambar maksimal 2MB.');
      return;
    }

    const inclusions = form.inclusions.map((item) => item.trim()).filter(Boolean);
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key !== 'inclusions') payload.append(key, String(value ?? ''));
    });
    payload.append('inclusions', JSON.stringify(inclusions));
    if (imageFile) payload.append('image', imageFile);

    try {
      setMessage('');
      await updateMutation.mutateAsync({ id: pkg.id, formData: payload });
      router.push('/dashboard/admin/packages');
      router.refresh();
    } catch (updateError) {
      setMessage(updateError.message || 'Gagal memperbarui package.');
    }
  };

  return (
    <div className="fade-in-up package-create-page">
      <div className="form-booking-toolbar package-create-toolbar">
        <div>
          <Link className="package-create-back" href="/dashboard/admin/packages">Kembali ke daftar package</Link>
          <h1>Edit Package</h1>
          <p>Perbarui informasi {pkg.name} untuk landing dan staff.</p>
        </div>
      </div>

      {message && <div className="external-booking-note" style={{ marginBottom: 16 }}>{message}</div>}
      {resortsError && <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{resortsError.message}</div>}

      <section className="card">
        <div className="card-header">
          <span className="card-title">Informasi Package</span>
          <span className="package-create-required">Kolom bertanda wajib harus diisi</span>
        </div>

        <form className="card-body" onSubmit={handleSubmit}>
          <div className="package-create-grid">
            <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Select label="Type" value={form.packageType} onChange={(value) => setForm({ ...form, packageType: value })} options={['regular', 'private', 'kids']} />
            <Select label="Experience" value={form.experienceType} onChange={(value) => setForm({ ...form, experienceType: value })} options={['communal', 'private', 'kids']} />
            <Input label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} required />
            <Input label="Schedule" value={form.schedule} onChange={(value) => setForm({ ...form, schedule: value })} maxLength={120} placeholder="Contoh: Every Thursday | 19:30 - 20:30" required />
            <Select label="Resort" value={form.resortId} onChange={(value) => setForm({ ...form, resortId: value })} options={resorts.map((resort) => ({ value: resort.id, label: resort.name }))} placeholder="Pilih resort" />
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
                description="JPEG, PNG, WebP, maksimal 2MB"
                attachmentsLabel="Gambar dipilih"
              />
            </div>

            <label className="input-group package-create-span-2">
              <span className="input-label">Deskripsi Singkat</span>
              <textarea className="input" rows="2" maxLength="240" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ringkasan singkat isi package untuk staff." />
            </label>

            <div className="input-group package-create-full">
              <span className="input-label">Including</span>
              <span className="package-create-helper">Tambahkan fasilitas yang didapat tamu. Urutannya digunakan di landing dan staff.</span>
              <div className="package-inclusion-editor">
                {form.inclusions.map((item, index) => (
                  <div className="package-inclusion-row" key={index}>
                    <input
                      aria-label={`Including ${index + 1}`}
                      className="input"
                      maxLength="120"
                      value={item}
                      placeholder="Contoh: Beverages"
                      onChange={(event) => updateInclusion(index, event.target.value)}
                    />
                    <button className="btn btn-secondary btn-sm" type="button" onClick={() => removeInclusion(index)}>Hapus</button>
                  </div>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm package-inclusion-add" type="button" onClick={addInclusion} disabled={form.inclusions.length >= 20}>
                + Tambah Inclusion
              </button>
            </div>
          </div>

          <div className="package-create-options">
            <label>
              <input type="checkbox" checked={form.isChargeable} onChange={(event) => setForm({ ...form, isChargeable: event.target.checked })} />
              Package berbayar (komisi & star berlaku)
            </label>
            <label>
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Aktifkan package
            </label>
          </div>

          <div className="package-create-actions">
            <Link className="btn btn-secondary" href="/dashboard/admin/packages">Batal</Link>
            <button className="btn btn-primary" type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PackageLoadError({ message }) {
  return (
    <div className="fade-in-up package-create-page">
      <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{message}</div>
      <Link className="btn btn-secondary" href="/dashboard/admin/packages">Kembali ke daftar package</Link>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false, min, maxLength, placeholder = '' }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input className="input" type={type} min={min} maxLength={maxLength} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options, placeholder }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </label>
  );
}
