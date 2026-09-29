import { find } from 'geo-tz/all';
import { normalizeLocationResult } from './resort-location.js';

export async function searchResortLocations(query, fetcher = fetch) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');

  const response = await fetcher(url, {
    headers: {
      'Accept-Language': 'id,en;q=0.8',
      'User-Agent': 'Ephemeris Resort Admin/0.1',
    },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error('Layanan pencarian lokasi sedang tidak tersedia');

  const rows = await response.json();
  return rows.map((row) => normalizeLocationResult(row, find(Number(row.lat), Number(row.lon))[0]));
}
