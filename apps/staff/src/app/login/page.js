import { LoginClient } from '@ephemeris/ui';

const ROLES = [
  { id: 'internal', label: 'Staff Internal', desc: 'Lihat jadwal & kelola booking sendiri', icon: '🔬' },
  { id: 'external', label: 'Staff External', desc: 'Lihat jadwal & buat booking baru', icon: '🌐' },
];


export const metadata = {
  title: 'Login Staff | SpaceCat ASTROTOURISM',
};

export default function StaffLoginPage() {
  return <LoginClient roles={ROLES} portalLabel="Portal Staff" />;
}
