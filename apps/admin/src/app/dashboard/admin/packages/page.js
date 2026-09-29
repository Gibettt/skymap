'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePackagesQuery, useResortsQuery, queryKeys, fetchApi } from '@/lib/apiQueries';

const DEFAULT_REWARD_SETTINGS = { starAdultUnit: 1, starChildUnit: 0.5, starThreshold: 10, starBonusUsd: 10 };

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const { data: packages = [], error } = usePackagesQuery();
  const { data: resorts = [], error: resortsError } = useResortsQuery();
  const [message, setMessage] = useState('');
  const [rewardSettings, setRewardSettings] = useState(DEFAULT_REWARD_SETTINGS);
  const [selectedResort, setSelectedResort] = useState('all');
  const [copyingPackage, setCopyingPackage] = useState(null);
  const [targetResortId, setTargetResortId] = useState('');
  const [copying, setCopying] = useState(false);
  const resortNames = useMemo(() => new Map(resorts.map((resort) => [resort.id, resort.name])), [resorts]);
  const filteredPackages = selectedResort === 'all'
    ? packages
    : packages.filter((pkg) => pkg.resort_id === selectedResort);

  useEffect(() => {
    let active = true;
    fetchApi('/api/reward-settings').then(({ settings }) => {
      if (!active || !settings) return;
      setRewardSettings({
        starAdultUnit: settings.star_adult_unit,
        starChildUnit: settings.star_child_unit,
        starThreshold: settings.star_threshold,
        starBonusUsd: settings.star_bonus_usd,
      });
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const saveRewardSettings = async (event) => {
    event.preventDefault();
    try {
      await fetchApi('/api/reward-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardSettings),
      });
      setMessage('Pengaturan star dan reward berhasil disimpan.');
    } catch (error) {
      setMessage(error.message || 'Gagal menyimpan reward settings.');
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
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all });
    } catch (err) {
      setMessage(err.message || 'Gagal mengubah status package.');
    }
  };

  const openCopy = (pkg) => {
    setCopyingPackage(pkg);
    setTargetResortId('');
    setMessage('');
  };

  const copyPackage = async (event) => {
    event.preventDefault();
    if (!copyingPackage || !targetResortId) return;
    setCopying(true);
    try {
      await fetchApi(`/api/packages/${copyingPackage.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resortId: targetResortId }),
      });
      setMessage(`${copyingPackage.name} berhasil disalin ke ${resortNames.get(targetResortId)}.`);
      setCopyingPackage(null);
      setTargetResortId('');
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.all });
    } catch (copyError) {
      setMessage(copyError.message || 'Gagal menyalin package.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="fade-in-up">
      <div className="form-booking-toolbar" style={{ marginBottom: 18 }}>
        <div>
          <h1>Package & Harga</h1>
          <p>Kelola nama package, harga, status aktif, dan estimasi umur anak.</p>
        </div>
        <Link className="btn btn-primary" href="/dashboard/admin/packages/new">+ Tambah Package</Link>
      </div>
      {message && <div className="external-booking-note" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{error.message}</div>}
      {resortsError && <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{resortsError.message}</div>}

      <section className="card" style={{ marginBottom: 24 }}>
        <div className="card-header"><span className="card-title">Dynamic Star & Reward Settings</span></div>
        <form className="card-body" onSubmit={saveRewardSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, alignItems: 'end' }}>
          <Input label="Adult Unit" type="number" min="0" step="0.01" value={rewardSettings.starAdultUnit} onChange={(value) => setRewardSettings({ ...rewardSettings, starAdultUnit: value })} required />
          <Input label="Child Unit" type="number" min="0" step="0.01" value={rewardSettings.starChildUnit} onChange={(value) => setRewardSettings({ ...rewardSettings, starChildUnit: value })} required />
          <Input label="Star Threshold" type="number" min="0.01" step="0.01" value={rewardSettings.starThreshold} onChange={(value) => setRewardSettings({ ...rewardSettings, starThreshold: value })} required />
          <Input label="Full Star Bonus USD" type="number" min="0" step="0.01" value={rewardSettings.starBonusUsd} onChange={(value) => setRewardSettings({ ...rewardSettings, starBonusUsd: value })} required />
          <button className="btn btn-primary" type="submit">Save Reward Settings</button>
        </form>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
          <Select
            label="Filter Resort"
            value={selectedResort}
            onChange={setSelectedResort}
            options={[{ value: 'all', label: 'Semua resort' }, ...resorts.map((resort) => ({ value: resort.id, label: resort.name }))]}
          />
          <span style={{ color: 'var(--text-dim)', fontSize: 11, paddingBottom: 10 }}>
            {filteredPackages.length} package ditampilkan
          </span>
        </div>
      </section>

      {copyingPackage && (
        <section className="card" style={{ marginBottom: 16 }}>
          <form className="card-body" onSubmit={copyPackage} style={{ display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220, flex: 1 }}>
              <strong style={{ fontSize: 13 }}>Salin ke Resort Lain</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--text-dim)', fontSize: 11 }}>
                Salinan {copyingPackage.name} berdiri sendiri dan dapat diedit tanpa mengubah package sumber.
              </p>
            </div>
            <Select
              label="Resort Tujuan"
              value={targetResortId}
              onChange={setTargetResortId}
              options={resorts
                .filter((resort) => resort.id !== copyingPackage.resort_id)
                .map((resort) => ({ value: resort.id, label: resort.name }))}
              placeholder="Pilih resort tujuan"
            />
            <button className="btn btn-secondary" type="button" onClick={() => setCopyingPackage(null)} disabled={copying}>Batal</button>
            <button className="btn btn-primary" type="submit" disabled={!targetResortId || copying}>
              {copying ? 'Menyalin...' : 'Salin Package'}
            </button>
          </form>
        </section>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Daftar Package</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{filteredPackages.length} package</span>
        </div>
        <div className="table-container responsive-card-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Resort</th>
                <th>Image</th>
                <th>Type</th>
                <th>Experience</th>
                <th>Location</th>
                <th>Schedule</th>
                <th>Umur Anak</th>
                <th>Including</th>
                <th style={{ textAlign: 'right' }}>Adult</th>
                <th style={{ textAlign: 'right' }}>Child</th>
                <th>Status</th>
                <th>Reward</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackages.map((pkg) => (
                <tr key={pkg.id}>
                  <td data-label="Name" className="name-cell">{pkg.name}</td>
                  <td data-label="Resort">{resortNames.get(pkg.resort_id) || '-'}</td>
                  <td data-label="Image">{pkg.image_url ? <Image src={pkg.image_url} alt={pkg.name} width={54} height={36} unoptimized style={{ objectFit: 'cover', border: '1px solid var(--border)' }} /> : '-'}</td>
                  <td data-label="Type">{pkg.package_type}</td>
                  <td data-label="Experience">{pkg.experience_type}</td>
                  <td data-label="Location">{pkg.location}</td>
                  <td data-label="Schedule">{pkg.schedule || 'Upon request'}</td>
                  <td data-label="Umur Anak">{pkg.child_age_range || '-'}</td>
                  <td data-label="Including">{pkg.inclusions?.length ? pkg.inclusions.join(', ') : '-'}</td>
                  <td data-label="Adult" style={{ textAlign: 'right' }}>{pkg.is_chargeable ? `$${pkg.adult_price_usd}` : 'Gratis'}</td>
                  <td data-label="Child" style={{ textAlign: 'right' }}>{pkg.is_chargeable && pkg.child_price_usd !== null ? `$${pkg.child_price_usd}` : '-'}</td>
                  <td data-label="Status"><span className={`tag ${pkg.is_active ? 'tag-completed' : 'tag-cancelled'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td data-label="Reward"><span className={`tag ${pkg.is_chargeable ? 'tag-confirmed' : 'tag-pending'}`}>{pkg.is_chargeable ? 'Berbayar' : 'Gratis'}</span></td>
                  <td data-label="Aksi" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <Link className="btn btn-secondary btn-sm" href={`/dashboard/admin/packages/${pkg.id}/edit`}>
                        Edit
                      </Link>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(pkg)}>
                        {pkg.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openCopy(pkg)}>
                        Salin
                      </button>
                    </div>
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

function Input({ label, value, onChange, type = 'text', required = false, min, step, placeholder = '' }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input className="input" type={type} min={min} step={step} required={required} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
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
          const valueOption = typeof option === 'string' ? option : option.value;
          const labelOption = typeof option === 'string' ? option : option.label;
          return <option key={valueOption} value={valueOption}>{labelOption}</option>;
        })}
      </select>
    </label>
  );
}
