'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';

const EMPTY_FORM = {
  amountUsd: '',
  bankName: 'Bank of Maldives',
  accountHolderName: '',
  accountNumber: '',
  notes: '',
};

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value, language) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  if (status === 'requested') return 'tag-pending';
  if (status === 'processed') return 'tag-confirmed';
  if (status === 'completed') return 'tag-completed';
  return 'tag-cancelled';
}

export default function ExternalPayoutPage() {
  const { language, t, localizeApiError } = useLanguage();
  const isInternal = usePathname().startsWith('/dashboard/internal');
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/payouts');
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(localizeApiError(data.error, t('payout_load_error')));
      return;
    }

    setSummary(data.summary);
    setRequests(data.requests || []);
    setForm((current) => ({
      ...current,
      amountUsd: current.amountUsd || String(data.summary?.availableUsd || ''),
    }));
  }, [localizeApiError, t]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPayouts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPayouts]);

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
      setMessage(localizeApiError(data.error, t('payout_request_error')));
      return;
    }

    setMessage(t('payout_request_success'));
    setForm(EMPTY_FORM);
    await loadPayouts();
  };

  const availableUsd = summary?.availableUsd || 0;

  return (
    <div className="fade-in-up">
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <PayoutKpi label={t('payout_total_commission')} value={formatUsd(summary?.commissionUsd)} sub={t('payout_total_commission_note')} />
        {!isInternal && <PayoutKpi
          label={t('payout_monthly_reward')}
          value={formatUsd(summary?.starRewardUsd)}
          sub={t('payout_star_breakdown')
            .replace('{stars}', summary?.fullStars || 0)
            .replace('{amount}', formatUsd(summary?.partialProgressUsd))}
        />}
        <PayoutKpi label={t('payout_processing')} value={formatUsd(summary?.requestedOrPaidUsd)} sub={t('payout_processing_note')} />
        <PayoutKpi label={t('payout_available')} value={formatUsd(availableUsd)} sub={t('payout_monthly_unit').replace('{count}', Number(summary?.starUnits || 0).toFixed(1))} accent="var(--emerald)" />
      </div>

      {!isInternal && <div className="card" style={{ marginBottom: 24, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <strong>{t('payout_star_progress')}</strong>
          <span>{t('payout_monthly_unit').replace('{count}', Number(summary?.starUnits || 0).toFixed(1))}</span>
        </div>
        <progress style={{ width: '100%', height: 14 }} max={summary?.starThreshold || 10} value={Number(summary?.starUnits || 0) % (summary?.starThreshold || 10)} aria-label={t('payout_next_star')} />
      </div>}

      <div className="payout-layout" style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{t('payout_title')}</h2>
          </div>
          <form className="card-body" onSubmit={requestPayout} style={{ display: 'grid', gap: 14 }}>
            <Field label={t('payout_amount')}>
              <input className="input" type="number" min="1" step="0.01" max={availableUsd || undefined} value={form.amountUsd} onChange={(e) => setField('amountUsd', e.target.value)} required />
            </Field>
            <Field label={t('payout_bank')}>
              <select className="input" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)}>
                <option>Bank of Maldives</option>
                <option>Maldives Islamic Bank</option>
                <option>State Bank of India (Maldives)</option>
              </select>
            </Field>
            <Field label={t('payout_account_holder')}>
              <input className="input" value={form.accountHolderName} onChange={(e) => setField('accountHolderName', e.target.value)} required />
            </Field>
            <Field label={t('payout_account_number')}>
              <input className="input" value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} required />
            </Field>
            <Field label={t('payout_notes')}>
              <textarea className="input" value={form.notes} onChange={(e) => setField('notes', e.target.value)} maxLength={500} />
            </Field>

            {message && <div className="external-booking-note">{message}</div>}

            <button className="btn btn-primary" type="submit" disabled={submitting || loading || availableUsd <= 0}>
              {submitting ? t('payout_sending') : t('payout_title')}
            </button>
          </form>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{t('payout_history')}</h2>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t('payout_request_count').replace('{count}', requests.length)}</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('common_date')}</th>
                  <th style={{ textAlign: 'right' }}>{t('payout_amount')}</th>
                  <th>{t('payout_bank')}</th>
                  <th>{t('common_status')}</th>
                  <th>{t('payout_admin_notes')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.created_at, language)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(item.amount_usd)}</td>
                    <td>{item.bank_name}<br /><small>{item.account_number}</small></td>
                    <td><span className={`tag ${statusClass(item.status)}`}>{t(`payout_status_${item.status}`, item.status)}</span></td>
                    <td>{item.admin_notes || '-'}</td>
                  </tr>
                ))}
                {!loading && requests.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('payout_empty')}</td></tr>
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
