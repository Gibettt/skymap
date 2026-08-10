'use client';

import { useEffect, useState } from 'react';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) setError(data.error || 'Gagal memuat audit log.');
        else setLogs(data.auditLogs || []);
      })
      .catch(() => setError('Gagal memuat audit log.'));
  }, []);

  return (
    <div className="fade-in-up">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Audit Log</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{logs.length} aktivitas terakhir</span>
        </div>
        {error && <div className="card-body" style={{ color: 'var(--accent)' }}>{error}</div>}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12 }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                  <td>{log.actor_name || '-'}<br /><span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{log.actor_email}</span></td>
                  <td><span className="tag tag-info">{log.action}</span></td>
                  <td>{log.entity_type}</td>
                  <td>{log.ip_address || '-'}</td>
                </tr>
              ))}
              {!error && logs.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Belum ada audit log</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
