import { LoginClient } from '@ephemeris/ui';

const ROLES = [
  { id: 'internal', label: 'Staff Internal', desc: 'Lihat jadwal & kelola booking sendiri', icon: '🔬' },
  { id: 'external', label: 'Staff External', desc: 'Lihat jadwal & buat booking baru', icon: '🌐' },
];

const DEMO_USERS = {
  internal: { email: 'internal@ephemeris.id', password: 'internal123' },
  external: { email: 'external@ephemeris.id', password: 'external123' },
};

export const metadata = {
  title: 'Login Staff | Ephemeris',
};

export default function StaffLoginPage() {
  return <LoginClient roles={ROLES} demoUsers={DEMO_USERS} portalLabel="Portal Staff" />;
}
