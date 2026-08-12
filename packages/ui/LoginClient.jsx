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
      const response = await fetch('/api/login', {
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
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(229,28,28,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Back to home (menuju landing, bukan / yang 404 di portal) */}
      {landingUrl && <Link href={landingUrl} style={{
        position: 'absolute', top: '24px', left: '32px',
        display: 'flex', alignItems: 'center', gap: '8px',
        fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'rgba(242,241,237,0.35)', transition: 'color 0.2s', zIndex: 2,
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(242,241,237,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(242,241,237,0.35)'}
      >
        ← Kembali
      </Link>}

      {/* Login Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: '480px',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        {/* Header */}
        <div style={{
          padding: '32px 36px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ width: '36px', height: '36px', background: '#e51c1c', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.01em', color: '#f2f1ed', textTransform: 'uppercase' }}>
              Ephemeris
            </div>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(242,241,237,0.3)', marginTop: '2px' }}>
              {portalLabel}
            </div>
          </div>
        </div>

        <div style={{ padding: '28px 36px 36px' }}>
          {/* Role Selector */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(242,241,237,0.35)', marginBottom: '12px' }}>
              Masuk sebagai
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '14px 16px',
                    border: selectedRole === role.id
                      ? '1px solid rgba(229,28,28,0.5)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: selectedRole === role.id ? 'rgba(229,28,28,0.06)' : 'transparent',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{role.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: selectedRole === role.id ? '#f2f1ed' : 'rgba(242,241,237,0.5)', marginBottom: '2px' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(242,241,237,0.25)' }}>{role.desc}</div>
                  </div>
                  {selectedRole === role.id && (
                    <div style={{ width: '6px', height: '6px', background: '#e51c1c', flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div className="input-group">
                <label className="input-label" style={{ color: 'rgba(242,241,237,0.5)', fontSize: '11px', letterSpacing: '0.1em' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f2f1ed',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(229,28,28,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  placeholder="email@ephemeris.id"
                />
              </div>

              <div className="input-group">
                <label className="input-label" style={{ color: 'rgba(242,241,237,0.5)', fontSize: '11px', letterSpacing: '0.1em' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f2f1ed',
                    fontFamily: 'var(--font-body)',
                    fontSize: '14px',
                    outline: 'none',
                    width: '100%',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(229,28,28,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 14px', marginBottom: '16px',
                background: 'rgba(229,28,28,0.08)',
                border: '1px solid rgba(229,28,28,0.25)',
                fontSize: '12px', color: '#e51c1c',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? 'rgba(229,28,28,0.5)' : '#e51c1c',
                color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Dashboard →'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: '24px', padding: '16px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(242,241,237,0.25)', marginBottom: '10px' }}>
              Kredensial Demo
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(242,241,237,0.4)', display: 'flex', flexDirection: 'column', gap: '4px', fontVariantNumeric: 'tabular-nums' }}>
              <div>
                <span style={{ color: 'rgba(242,241,237,0.25)' }}>Email:</span>{' '}
                <span style={{ color: 'rgba(242,241,237,0.6)', fontFamily: 'monospace' }}>{demoUsers[selectedRole]?.email}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(242,241,237,0.25)' }}>Password:</span>{' '}
                <span style={{ color: 'rgba(242,241,237,0.6)', fontFamily: 'monospace' }}>{demoUsers[selectedRole]?.password}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(242,241,237,0.2)', letterSpacing: '0.06em', position: 'relative', zIndex: 1 }}>
        © 2026 Ephemeris · Observatorium Nasional
      </div>
    </div>
  );
}
