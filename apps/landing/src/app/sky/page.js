import { redirect } from 'next/navigation';
  import SkyExperience from '@/components/SkyExperience';

  export const metadata = {
    title: 'SpaceCat Astrotourism Sky Guide',
    description: 'Peta langit dan kalender astronomi untuk tamu resort.',
  };

  export default function SkyPage() {
    const stellariumUrl = process.env.STELLARIUM_URL;

    if (stellariumUrl) {
      redirect(stellariumUrl);
    }

    return <SkyExperience />;
  }
