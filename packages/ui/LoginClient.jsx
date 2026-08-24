'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL || null;

/**
 * Form login bersama untuk semua portal.
 * @param {{ roles: {id,label,desc,icon}[], demoUsers: {[id]: {email,password}}, portalLabel: string }} props
 */
export default function LoginClient({ roles, demoUsers, portalLabel = 'Portal' }) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(roles[0]?.id || '');
  const [email, setEmail] = useState(demoUsers[roles[0]?.id]?.email || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setEmail(demoUsers[role]?.email || '');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.headers.get('content-type')?.includes('application/json')) {
        setError('API login belum aktif. Restart terminal Next.js lalu coba lagi.');
        setLoading(false);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Email atau password salah. Gunakan kredensial demo di bawah.');
        setLoading(false);
        return;
      }
      router.push(`/dashboard/${data.user.role}`);
    } catch {
      setError('Database belum siap. Jalankan schema dan seed SQL lalu cek DATABASE_URL.');
      setLoading(false);
    }
  };

  return (
    <main className="ephemeris-login">
      {landingUrl && (
        <Link href={landingUrl} className="login-back-link">
          ← Kembali
        </Link>
      )}

      <section className="login-frame" aria-labelledby="login-title">
        <div className="login-grid">
          <aside className="login-aside">
            <div className="login-brand">
              <div className="login-brand-mark" aria-hidden="true">EP</div>
              <div>
                <div className="login-brand-name">Ephemeris</div>
                <div className="login-brand-meta">{portalLabel}</div>
              </div>
            </div>

            <div className="login-aside-copy">
              <h1>Operations under one night sky.</h1>
              <p>Akses terkontrol untuk pengelolaan reservasi, observasi, dan layanan astronomi resort.</p>
            </div>
          </aside>

          <div className="login-panel">
            <header className="login-panel-heading">
              <h2 id="login-title">Masuk ke dashboard</h2>
              <p>Pilih peran Anda, lalu gunakan akun yang terdaftar.</p>
            </header>

            <div className="login-role-list" aria-label="Pilih peran">
              {roles.map((role) => {
                const active = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id)}
                    className={`login-role${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                  >
                    <span className="login-role-mark" aria-hidden="true">
                      {role.label.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>{role.label}</strong>
                      <small>{role.desc}</small>
                    </span>
                    {active && <span className="login-role-check" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="email@ephemeris.id"
                />
              </label>

              <label className="login-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </label>

              {error && <div className="login-error" role="alert">{error}</div>}

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? 'Memverifikasi...' : 'Masuk ke dashboard'}
              </button>
            </form>

            <div className="login-demo">
              <div className="login-demo-title">Kredensial demo</div>
              <div className="login-demo-grid">
                <span>Email</span>
                <code>{demoUsers[selectedRole]?.email}</code>
                <span>Password</span>
                <code>{demoUsers[selectedRole]?.password}</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="login-copyright">© 2026 Ephemeris</div>
    </main>
  );
}
