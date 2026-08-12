'use client';

import { useParams, usePathname } from 'next/navigation';
import FamilyBookingForm from '@/components/FamilyBookingForm';
import { getObservationBySlug } from '@/data/observations';

export default function ObservationDetailPage() {
  const { slug } = useParams();
  const pathname = usePathname();
  const staticExperience = getObservationBySlug(slug);
  const basePath = pathname.startsWith('/dashboard/internal') ? '/dashboard/internal' : '/dashboard/external';

  return <FamilyBookingForm basePath={basePath} fixedSlug={slug} staticExperience={staticExperience} />;
}
