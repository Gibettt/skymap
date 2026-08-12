import { LoginClient } from '@ephemeris/ui';

const ROLES = [
  { id: 'admin', label: 'Admin', desc: 'Akses penuh ke semua data & manajemen', icon: '⚙️' },
];

const DEMO_USERS = {
  admin: { email: 'admin@ephemeris.id', password: 'admin123' },
};

export const metadata = {
  title: 'Login Admin | Ephemeris',
};

export default function AdminLoginPage() {
  return <LoginClient roles={ROLES} demoUsers={DEMO_USERS} portalLabel="Portal Admin" />;
}
