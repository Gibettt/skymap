'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { nearestResort } from '@ephemeris/sky';

export default function ResortLocator({ resorts }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const available = resorts.filter((resort) => resort.latitude != null && resort.longitude != null);

  function findNearest() {
    if (!navigator.geolocation || available.length === 0) {
      setMessage('Automatic location is unavailable. Please choose your resort below.');
      return;
    }
    setMessage('Finding your nearest resort...');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestResort(coords.latitude, coords.longitude, available);
        router.push(`/resorts/${nearest.slug}`);
      },
      () => setMessage('Location access was not granted. Please choose your resort below.'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className="resort-locator">
      <button type="button" className="stargazing-button" onClick={findNearest}>
        Find my nearest resort
      </button>
      {message && <span role="status">{message}</span>}
    </div>
  );
}
