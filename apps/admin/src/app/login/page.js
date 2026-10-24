import { LoginClient } from '@ephemeris/ui';

const ROLES = [
  { id: 'admin', label: 'Admin', desc: 'Akses penuh ke semua data & manajemen', icon: '⚙️' },
];


export const metadata = {
  title: 'Login Admin | SpaceCat ASTROTOURISM',
};

export default function AdminLoginPage() {
  return <LoginClient roles={ROLES} portalLabel="Portal Admin" />;
}
