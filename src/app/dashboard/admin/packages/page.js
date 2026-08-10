'use client';

import { useEffect, useState } from 'react';

const EMPTY = {
  name: '',
  packageType: 'regular',
  experienceType: 'communal',
  location: '',
  adultPriceUsd: 0,
  childPriceUsd: '',
};

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState('');

  const loadPackages = async () => {
    const res = await fetch('/api/packages');
    const data = await res.json();
    if (res.ok) setPackages(data.packages || []);
    else setMessage(data.error || 'Gagal memuat package.');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPackages();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const createPackage = async (event) => {
    event.preventDefault();
    const res = await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Package gagal dibuat.');
      return;
    }
    setForm(EMPTY);
    setMessage('Package dibuat.');
    await loadPackages();
  };

  const toggleActive = async (pkg) => {
    const res = await fetch(`/api/packages/${pkg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !pkg.is_active }),
    });
    if (res.ok) await loadPackages();
  };

  return (
    <div className="fade-in-up">
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <span className="card-title">Package & Price Management</span>
        </div>
        <form className="card-body" onSubmit={createPackage}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
            <Select label="Type" value={form.packageType} onChange={(value) => setForm({ ...form, packageType: value })} options={['regular', 'private', 'kids']} />
            <Select label="Experience" value={form.experienceType} onChange={(value) => setForm({ ...form, experienceType: value })} options={['communal', 'private', 'kids']} />
            <Input label="Location" value={form.location} onChange={(value) => setForm({ ...form, location: value })} required />
            <Input label="Adult Price USD" type="number" min="0" value={form.adultPriceUsd} onChange={(value) => setForm({ ...form, adultPriceUsd: value })} required />
            <Input label="Child Price USD" type="number" min="0" value={form.childPriceUsd} onChange={(value) => setForm({ ...form, childPriceUsd: value })} />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn btn-primary" type="submit">Tambah Package</button>
            {message && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{message}</span>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Location</th>
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
                  <td>{pkg.package_type}</td>
                  <td>{pkg.location}</td>
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

function Input({ label, value, onChange, type = 'text', required = false, min }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <input className="input" type={type} min={min} required={required} value={value} onChange={(event) => onChange(event.target.value)} />
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
