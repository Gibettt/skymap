'use client';

import { useEffect, useMemo, useState } from 'react';

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status) {
  if (status === 'requested') return 'tag-pending';
  if (status === 'processed') return 'tag-confirmed';
  if (status === 'completed') return 'tag-completed';
  return 'tag-cancelled';
}

export default function AdminPencairanStaffPanel() {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  const loadRequests = async () => {
    const response = await fetch('/api/payouts');
    const data = await response.json();
    if (response.ok) setRequests(data.requests || []);
    else setMessage(data.error || 'Gagal memuat pencairan staff.');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRequests();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const totals = useMemo(() => requests.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + Number(item.amount_usd || 0);
    return acc;
  }, {}), [requests]);

  const updateStatus = async (item, status) => {
    const adminNotes = status === 'rejected' ? window.prompt('Alasan reject pencairan?', item.admin_notes || '') : item.admin_notes;
    if (status === 'rejected' && adminNotes === null) return;

    setUpdatingId(item.id);
    const response = await fetch(`/api/payouts/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    const data = await response.json();
    setUpdatingId('');

    if (!response.ok) {
      setMessage(data.error || 'Update pencairan gagal.');
      return;
    }

    setMessage(`Pencairan ${status}.`);
    await loadRequests();
  };

  return (
    <div>
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        <Kpi label="Requested" value={formatUsd(totals.requested)} />
        <Kpi label="Processed" value={formatUsd(totals.processed)} />
        <Kpi label="Completed" value={formatUsd(totals.completed)} accent="var(--emerald)" />
        <Kpi label="Rejected" value={formatUsd(totals.rejected)} accent="var(--accent)" />
      </div>

      {message && <div className="external-booking-note" style={{ marginBottom: 16 }}>{message}</div>}

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Pencairan Staff</h2>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{requests.length} request</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Staff</th>
                <th>Resort</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Komisi / Bonus</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.created_at)}</td>
                  <td className="name-cell">{item.requester_name}<br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.requester_email}</span></td>
                  <td>{item.resort_name || '-'}<br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.resort_code || ''}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatUsd(item.amount_usd)}</td>
                  <td>
                    {formatUsd(item.commission_usd)} / {formatUsd(item.star_bonus_usd)}
                    <br />
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{Number(item.star_points || 0).toFixed(1)} pts, {item.full_stars} stars</span>
                  </td>
                  <td>{item.bank_name}<br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{item.account_holder_name} - {item.account_number}</span></td>
                  <td><span className={`tag ${statusClass(item.status)}`}>{item.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {item.status === 'requested' && (
                        <button className="btn btn-secondary btn-sm" disabled={updatingId === item.id} onClick={() => updateStatus(item, 'processed')}>Process</button>
                      )}
                      {item.status === 'processed' && (
                        <button className="btn btn-secondary btn-sm" disabled={updatingId === item.id} onClick={() => updateStatus(item, 'completed')}>Complete</button>
                      )}
                      {['requested', 'processed'].includes(item.status) && (
                        <button className="btn btn-secondary btn-sm" disabled={updatingId === item.id} onClick={() => updateStatus(item, 'rejected')}>Reject</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada request pencairan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent = 'var(--text-primary)' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: accent, fontSize: 32 }}>{value}</div>
      <div className="kpi-note">Pencairan staff</div>
    </div>
  );
}
