import * as Astronomy from 'astronomy-engine';

const MOON_PHASES = [
  { angle: 0, title: 'Bulan Baru', description: 'Langit lebih gelap untuk pengamatan objek redup.' },
  { angle: 90, title: 'Perbani Awal', description: 'Separuh piringan Bulan terlihat terang.' },
  { angle: 180, title: 'Bulan Purnama', description: 'Bulan mencapai fase penuh.' },
  { angle: 270, title: 'Perbani Akhir', description: 'Separuh piringan Bulan kembali terlihat terang.' },
];

function inRange(date, start, end) {
  return date >= start && date <= end;
}

export function calculatedSkyEvents({ from, to, latitude, longitude }) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const events = [];

  for (const phase of MOON_PHASES) {
    let cursor = start;
    while (cursor <= end) {
      const found = Astronomy.SearchMoonPhase(phase.angle, cursor, 40);
      if (!found) break;
      const date = found.date;
      if (!inRange(date, start, end)) break;
      events.push({
        id: `moon-${phase.angle}-${date.toISOString()}`,
        title: phase.title,
        eventType: 'astronomy',
        startsAt: date.toISOString(),
        endsAt: null,
        description: phase.description,
        sourceName: 'Astronomy Engine',
        sourceUrl: 'https://github.com/cosinekitty/astronomy',
        visibility: 'both',
        isPublished: true,
        calculated: true,
      });
      cursor = new Date(date.getTime() + 36 * 60 * 60 * 1000);
    }
  }

  try {
    const observer = new Astronomy.Observer(latitude, longitude, 0);
    const eclipse = Astronomy.SearchLocalSolarEclipse(start, observer);
    const peak = eclipse?.peak?.time?.date;
    if (peak && inRange(peak, start, end) && eclipse.kind !== Astronomy.EclipseKind.Invalid) {
      events.push({
        id: `eclipse-${peak.toISOString()}`,
        title: 'Gerhana Matahari',
        eventType: 'astronomy',
        startsAt: peak.toISOString(),
        endsAt: eclipse.partial_end?.time?.date?.toISOString() || null,
        description: 'Waktu puncak dihitung untuk lokasi pilot. Amati Matahari hanya dengan perlindungan mata yang sesuai.',
        sourceName: 'Astronomy Engine',
        sourceUrl: 'https://science.nasa.gov/eclipses/future-eclipses/',
        visibility: 'both',
        isPublished: true,
        calculated: true,
      });
    }
  } catch {
    // The calendar remains useful even when an eclipse cannot be calculated.
  }

  return events.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}
