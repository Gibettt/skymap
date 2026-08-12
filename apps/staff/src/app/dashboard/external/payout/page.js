'use client';

import { useEffect, useState } from 'react';

const EMPTY_FORM = {
  amountUsd: '',
  paymentMethod: 'Bank transfer',
  accountName: '',
  accountNumber: '',
  notes: '',
};

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  if (status === 'requested') return 'tag-pending';
  if (status === 'approved') return 'tag-confirmed';
  if (status === 'paid') return 'tag-completed';
  return 'tag-cancelled';
}

export default function ExternalPayoutPage() {
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPayouts = async () => {
    setLoading(true);
    const response = await fetch('/api/payouts');
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || 'Gagal memuat payout.');
      return;
    }

    setSummary(data.summary);
    setRequests(data.requests || []);
    setForm((current) => ({
      ...current,
      amountUsd: current.amountUsd || String(data.summary?.availableUsd || ''),
    }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayouts();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const requestPayout = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    const response = await fetch('/api/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    setSubmitting(false);

    if (!response.ok) {
      setMessage(data.error || 'Request payout gagal.');
      return;
    }

    setMessage('Request payout terkirim ke admin.');
    setForm(EMPTY_FORM);
    await loadPayouts();
  };

  const availableUsd = summary?.availableUsd || 0;

  return (
    <div className="fade-in-up">
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <PayoutKpi label="Komisi Eligible" value={formatUsd(summary?.commissionUsd)} sub="Finished + signed" />
        <PayoutKpi label="Bonus Bintang" value={formatUsd(summary?.starBonusUsd)} sub={`${summary?.fullStars || 0} full star`} />
        <PayoutKpi label="Sudah Diminta/Dibayar" value={formatUsd(summary?.requestedOrPaidUsd)} sub="Requested, approved, paid" />
        <PayoutKpi label="Bisa Dicairkan" value={formatUsd(availableUsd)} sub={`${Number(summary?.starPoints || 0).toFixed(1)} star points`} accent="var(--emerald)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Request Payout</h2>
          </div>
          <form className="card-body" onSubmit={requestPayout} style={{ display: 'grid', gap: 14 }}>
            <Field label="Amount USD">
              <input className="input" type="number" min="1" step="0.01" max={availableUsd || undefined} value={form.amountUsd} onChange={(e) => setField('amountUsd', e.target.value)} required />
            </Field>
            <Field label="Payment Method">
              <select className="input" value={form.paymentMethod} onChange={(e) => setField('paymentMethod', e.target.value)}>
                <option>Bank transfer</option>
                <option>Cash</option>
                <option>Resort billing</option>
                <option>Wallet</option>
              </select>
            </Field>
            <Field label="Account Name">
              <input className="input" value={form.accountName} onChange={(e) => setField('accountName', e.target.value)} required />
            </Field>
            <Field label="Account Number / Note">
              <input className="input" value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} required />
            </Field>
            <Field label="Catatan">
              <textarea className="input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} maxLength={500} />
            </Field>

            {message && <div className="external-booking-note">{message}</div>}

            <button className="btn btn-primary" type="submit" disabled={submitting || loading || availableUsd <= 0}>
              {submitting ? 'Mengirim...' : 'Request Payout'}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Riwayat Payout</h2>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{requests.length} request</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Admin Notes</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(item.amount_usd)}</td>
                    <td>{item.payment_method}</td>
                    <td><span className={`tag ${statusClass(item.status)}`}>{item.status}</span></td>
                    <td>{item.admin_notes || '-'}</td>
                  </tr>
                ))}
                {!loading && requests.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Belum ada request payout.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function PayoutKpi({ label, value, sub, accent = 'var(--text-primary)' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: accent, fontSize: 32 }}>{value}</div>
      <div className="kpi-note">{sub}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      {children}
    </label>
  );
}
