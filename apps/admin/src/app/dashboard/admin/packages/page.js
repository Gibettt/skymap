'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePackagesQuery, queryKeys, fetchApi } from '@/lib/apiQueries';

const DEFAULT_REWARD_SETTINGS = { starAdultUnit: 1, starChildUnit: 0.5, starThreshold: 10, starBonusUsd: 10 };

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const { data: packages = [], error } = usePackagesQuery();
  const [message, setMessage] = useState('');
  const [rewardSettings, setRewardSettings] = useState(DEFAULT_REWARD_SETTINGS);

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
        <Link className="btn btn-primary" href="/dashboard/admin/packages/new">+ Tambah Package</Link>
      </div>
      {message && <div className="external-booking-note" style={{ marginBottom: 16 }}>{message}</div>}
      {error && <div className="external-booking-note" style={{ marginBottom: 16, borderColor: 'var(--accent)' }}>{error.message}</div>}

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

      <div className="card">
        <div className="card-header">
          <span className="card-title">Daftar Package</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{packages.length} package</span>
        </div>
        <div className="table-container responsive-card-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
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
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td data-label="Name" className="name-cell">{pkg.name}</td>
                  <td data-label="Image">{pkg.image_url ? <Image src={pkg.image_url} alt={pkg.name} width={54} height={36} unoptimized style={{ objectFit: 'cover', border: '1px solid var(--border)' }} /> : '-'}</td>
                  <td data-label="Type">{pkg.package_type}</td>
                  <td data-label="Experience">{pkg.experience_type}</td>
                  <td data-label="Location">{pkg.location}</td>
                  <td data-label="Schedule">{pkg.schedule || 'Upon request'}</td>
                  <td data-label="Umur Anak">{pkg.child_age_range || '-'}</td>
                  <td data-label="Including">{pkg.inclusions?.length ? pkg.inclusions.join(', ') : '-'}</td>
                  <td data-label="Adult" style={{ textAlign: 'right' }}>${pkg.adult_price_usd}</td>
                  <td data-label="Child" style={{ textAlign: 'right' }}>{pkg.child_price_usd === null ? '-' : `$${pkg.child_price_usd}`}</td>
                  <td data-label="Status"><span className={`tag ${pkg.is_active ? 'tag-completed' : 'tag-cancelled'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td data-label="Reward"><span className={`tag ${pkg.is_chargeable ? 'tag-confirmed' : 'tag-pending'}`}>{pkg.is_chargeable ? 'Chargeable' : 'Free'}</span></td>
                  <td data-label="Aksi" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <Link className="btn btn-secondary btn-sm" href={`/dashboard/admin/packages/${pkg.id}/edit`}>
                        Edit
                      </Link>
                      <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(pkg)}>
                        {pkg.is_active ? 'Disable' : 'Enable'}
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
