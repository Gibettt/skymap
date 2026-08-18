import * as Astronomy from 'astronomy-engine';

export const MOON_PHASES = [
  { angle: 0, title: 'Bulan Baru (New Moon)', description: 'Fase terbaik untuk pengamatan Deep Sky, Bimasakti (Milky Way), dan objek redup (langit gelap tanpa polusi cahaya bulan).' },
  { angle: 90, title: 'Kuartal Pertama (First Quarter)', description: 'Separuh piringan Bulan terlihat terang di langit senja. Sangat indah untuk mengamati kawah dan pegunungan Bulan dengan teleskop.' },
  { angle: 180, title: 'Bulan Purnama (Full Moon)', description: 'Bulan mencapai fase iluminasi 100%. Pemandangan laut purnama di resort sangat memukau, namun kurang ideal untuk melihat galaksi redup.' },
  { angle: 270, title: 'Kuartal Terakhir (Last Quarter)', description: 'Separuh piringan Bulan terbit tengah malam hingga fajar.' },
];

export const ANNUAL_METEOR_SHOWERS = [
  {
    name: 'Quadrantids',
    peakMonth: 1,
    peakDay: 3,
    activeRange: '28 Des – 12 Jan',
    zhr: '110 meteor/jam',
    radiant: 'Boötes',
    parentBody: 'Asteroid 2003 EH1',
    description: 'Hujan meteor awal tahun dengan laju puncak intensitas tinggi (110+ ZHR). Durasi puncak relatif singkat (sekitar 6 jam).',
    source: 'IAU Meteor Data Center / IMO',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Lyrids',
    peakMonth: 4,
    peakDay: 22,
    activeRange: '16 – 25 Apr',
    zhr: '18 meteor/jam',
    radiant: 'Lyra (dekat bintang Vega)',
    parentBody: 'Komet C/1861 G1 (Thatcher)',
    description: 'Salah satu hujan meteor tertua yang tercatat dalam sejarah astronomi (sejak 2.700 tahun lalu). Sering menghasilkan jejak debu bercahaya.',
    source: 'IAU Meteor Data Center / IMO',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Eta Aquariids',
    peakMonth: 5,
    peakDay: 6,
    activeRange: '19 Apr – 28 Mei',
    zhr: '50 meteor/jam',
    radiant: 'Aquarius',
    parentBody: 'Komet 1P/Halley (Komet Halley)',
    description: 'Berasal dari remah debu Komet Halley yang terkenal. Sangat jelas terlihat dari belahan bumi selatan dan daerah khatulistiwa/tropis.',
    source: 'IAU / NASA Meteoroid Environment Office',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Southern Delta Aquariids',
    peakMonth: 7,
    peakDay: 30,
    activeRange: '12 Jul – 23 Agu',
    zhr: '25 meteor/jam',
    radiant: 'Aquarius',
    parentBody: 'Komet 96P/Machholz',
    description: 'Hujan meteor pertengahan tahun yang ideal untuk langit tropis/pantai resort sebelum puncak Perseids.',
    source: 'IMO / IAU',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Perseids',
    peakMonth: 8,
    peakDay: 12,
    activeRange: '17 Jul – 24 Agu',
    zhr: '100 meteor/jam',
    radiant: 'Perseus',
    parentBody: 'Komet 109P/Swift-Tuttle',
    description: 'Ratu hujan meteor musim panas yang paling populer di dunia. Terkenal dengan "fireball" (bola api meteor sangat terang) di langit malam pantai.',
    source: 'NASA GSFC / IMO',
    url: 'https://science.nasa.gov/solar-system/meteors-meteorites/perseids/',
  },
  {
    name: 'Orionids',
    peakMonth: 10,
    peakDay: 21,
    activeRange: '2 Okt – 7 Nov',
    zhr: '20 meteor/jam',
    radiant: 'Orion (dekat bintang Betelgeuse)',
    parentBody: 'Komet 1P/Halley (Komet Halley)',
    description: 'Siklus kedua debu Komet Halley. Meteor bergerak sangat cepat (66 km/detik) menghasilkan lintasan bercahaya tajam.',
    source: 'NASA / IAU',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Leonids',
    peakMonth: 11,
    peakDay: 17,
    activeRange: '6 – 30 Nov',
    zhr: '15 meteor/jam',
    radiant: 'Leo',
    parentBody: 'Komet 55P/Tempel-Tuttle',
    description: 'Terkenal dengan meteor badai periodik (meteor storm). Menghasilkan meteor berkecepatan tinggi dengan kilatan warna kehijauan/kebiruan.',
    source: 'IAU Meteor Data Center / NASA',
    url: 'https://www.imo.net/resources/calendar/',
  },
  {
    name: 'Geminids',
    peakMonth: 12,
    peakDay: 14,
    activeRange: '4 – 20 Des',
    zhr: '150 meteor/jam',
    radiant: 'Gemini (dekat Castor & Pollux)',
    parentBody: 'Asteroid 3200 Phaethon',
    description: 'Raja hujan meteor tahunan dengan laju tertinggi (120–150 ZHR). Meteor bergerak lebih lambat dan menghasilkan kilatan multi-warna yang memukau.',
    source: 'NASA GSFC / IMO',
    url: 'https://science.nasa.gov/solar-system/meteors-meteorites/geminids/',
  },
  {
    name: 'Ursids',
    peakMonth: 12,
    peakDay: 22,
    activeRange: '17 – 26 Des',
    zhr: '10 meteor/jam',
    radiant: 'Ursa Minor (dekat Bintang Polaris)',
    parentBody: 'Komet 8P/Tuttle',
    description: 'Hujan meteor penutup akhir tahun di dekat kutub langit utara.',
    source: 'IMO / IAU',
    url: 'https://www.imo.net/resources/calendar/',
  },
];

export const INTERNATIONAL_SPACE_DAYS = [
  {
    month: 4,
    day: 12,
    title: "Yuri's Night & International Day of Human Space Flight",
    organization: 'United Nations (UN) / NASA / ESA',
    description: 'Peringatan internasional penerbangan manusia pertama ke luar angkasa oleh Yuri Gagarin (1961) dan peluncuran Space Shuttle STS-1 (1981).',
    url: 'https://www.un.org/en/observances/human-spaceflight-day',
  },
  {
    month: 4,
    day: 24,
    title: 'Hubble Space Telescope Anniversary',
    organization: 'NASA / ESA',
    description: 'Peringatan peluncuran Teleskop Luar Angkasa Hubble (1990) yang telah merevolusi pemahaman manusia tentang alam semesta selama lebih dari 3 dekade.',
    url: 'https://hubblesite.org/',
  },
  {
    month: 5,
    day: 15,
    title: 'International Astronomy Day (Spring)',
    organization: 'Astronomical League / IAU',
    description: 'Hari Astronomi Internasional musim semi untuk mendekatkan masyarakat dan tamu wisata pada keindahan langit malam dan edukasi sains antariksa.',
    url: 'https://www.astroleague.org/',
  },
  {
    month: 6,
    day: 30,
    title: 'International Asteroid Day',
    organization: 'United Nations (UN) / ESA / NASA',
    description: 'Hari Asteroid Internasional yang disahkan PBB untuk meningkatkan kesadaran global tentang pemantauan asteroid dan pertahanan planet Bumi.',
    url: 'https://asteroidday.org/',
  },
  {
    month: 7,
    day: 20,
    title: 'International Moon Day (Apollo 11 Anniversary)',
    organization: 'United Nations (UN) / NASA',
    description: 'Peringatan pendaratan manusia pertama di Bulan (Neil Armstrong & Buzz Aldrin, misi Apollo 11 tahun 1969) yang diresmikan oleh Majelis Umum PBB.',
    url: 'https://www.un.org/en/observances/international-moon-day',
  },
  {
    month: 10,
    day: 4,
    durationDays: 7,
    title: 'UN World Space Week (4–10 Oktober)',
    organization: 'United Nations General Assembly',
    description: 'Pekan Antariksa Sedunia terbesar di planet Bumi untuk merayakan kontribusi ilmu pengetahuan dan teknologi antariksa bagi kemajuan peradaban manusia.',
    url: 'https://www.worldspaceweek.org/',
  },
  {
    month: 10,
    day: 12,
    title: 'International Astronomy Day (Autumn)',
    organization: 'Astronomical League / IAU',
    description: 'Hari Astronomi Internasional musim gugur untuk pengamatan konstelasi langit akhir tahun.',
    url: 'https://www.astroleague.org/',
  },
  {
    month: 12,
    day: 25,
    title: 'James Webb Space Telescope (JWST) Launch Day',
    organization: 'NASA / ESA / CSA',
    description: 'Peringatan peluncuran teleskop luar angkasa inframerah paling canggih dalam sejarah (JWST) yang diluncurkan pada 25 Desember 2021.',
    url: 'https://webb.nasa.gov/',
  },
];

export const MAJOR_ASTRONOMICAL_EVENTS = [
  {
    startsAt: '2026-02-17T12:00:00.000Z',
    title: 'Gerhana Matahari Cincin (Annular Solar Eclipse)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC / Fred Espenak',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/solar.html',
    description: 'Gerhana Matahari Cincin ("Ring of Fire") terjadi saat Bulan berada di titik terjauh sehingga tidak menutupi seluruh piringan Matahari.',
  },
  {
    startsAt: '2026-03-03T11:34:00.000Z',
    title: 'Gerhana Bulan Total (Total Lunar Eclipse / Blood Moon)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC / IAU',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/lunar.html',
    description: 'Bulan melewati bayangan umbra Bumi sepenuhnya, menghasilkan warna merah tembaga (Blood Moon) yang spektakuler.',
  },
  {
    startsAt: '2026-03-20T14:46:00.000Z',
    title: 'Equinox Maret (March Equinox)',
    eventType: 'astronomy',
    sourceName: 'US Naval Observatory (USNO)',
    sourceUrl: 'https://www.usno.navy.mil/',
    description: 'Matahari melintasi ekuator langit. Durasi siang dan malam sama panjang di seluruh dunia.',
  },
  {
    startsAt: '2026-06-21T08:24:00.000Z',
    title: 'Solstice Juni (June Solstice)',
    eventType: 'astronomy',
    sourceName: 'US Naval Observatory (USNO)',
    sourceUrl: 'https://www.usno.navy.mil/',
    description: 'Titik balik matahari musim panas di belahan utara dan titik balik musim dingin di belahan selatan.',
  },
  {
    startsAt: '2026-08-12T17:47:00.000Z',
    title: 'Gerhana Matahari Total (Total Solar Eclipse 2026)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC / ESA',
    sourceUrl: 'https://science.nasa.gov/eclipses/future-eclipses/',
    description: 'Salah satu peristiwa astronomi paling dinanti dekade ini melintasi Greenland, Islandia, dan Spanyol Utara.',
  },
  {
    startsAt: '2026-08-28T04:14:00.000Z',
    title: 'Gerhana Bulan Sebagian (Partial Lunar Eclipse)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/lunar.html',
    description: 'Sebagian piringan Bulan masuk ke dalam bayangan umbra gelap Bumi.',
  },
  {
    startsAt: '2026-09-23T00:05:00.000Z',
    title: 'Equinox September (September Equinox)',
    eventType: 'astronomy',
    sourceName: 'US Naval Observatory (USNO)',
    sourceUrl: 'https://www.usno.navy.mil/',
    description: 'Matahari kembali melintasi khatulistiwa menuju belahan bumi selatan.',
  },
  {
    startsAt: '2026-10-04T18:00:00.000Z',
    title: 'Saturnus di Titik Oposisi (Saturn at Opposition)',
    eventType: 'astronomy',
    sourceName: 'IAU / NASA Planetary Science',
    sourceUrl: 'https://solarsystem.nasa.gov/planets/saturn/overview/',
    description: 'Saturnus berada di titik terdekat dengan Bumi dan tersinari penuh oleh Matahari. Cincin Saturnus dan satelit Titan terlihat paling terang di teleskop.',
  },
  {
    startsAt: '2027-01-10T20:00:00.000Z',
    title: 'Jupiter di Titik Oposisi (Jupiter at Opposition)',
    eventType: 'astronomy',
    sourceName: 'IAU / NASA Planetary Science',
    sourceUrl: 'https://solarsystem.nasa.gov/planets/jupiter/overview/',
    description: 'Jupiter berada pada posisi paling terang dan terbesar di langit malam. Sabuk awan, Bintik Merah Raksasa, dan 4 Satelit Galilean tampak sangat tajam.',
  },
  {
    startsAt: '2027-02-06T16:00:00.000Z',
    title: 'Gerhana Matahari Cincin (Annular Solar Eclipse 2027)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/solar.html',
    description: 'Cincin api matahari melintasi Amerika Selatan dan Samudra Atlantik.',
  },
  {
    startsAt: '2027-08-02T10:07:00.000Z',
    title: 'Gerhana Matahari Total "Great North African Eclipse" (6+ Menit)',
    eventType: 'astronomy',
    sourceName: 'NASA GSFC / IAU',
    sourceUrl: 'https://eclipse.gsfc.nasa.gov/solar.html',
    description: 'Gerhana matahari total terlama abad ke-21 dengan durasi totalitas mencapai 6 menit 23 detik di atas Mesir (Luxor).',
  },
];

function inRange(date, start, end) {
  return date >= start && date <= end;
}

export function calculatedSkyEvents({ from, to, latitude, longitude }) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T23:59:59.999Z`);
  const events = [];

  // 1. Moon Phases via Astronomy Engine
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
        sourceName: 'Astronomy Engine / NASA Standards',
        sourceUrl: 'https://science.nasa.gov/moon/',
        visibility: 'both',
        isPublished: true,
        calculated: true,
      });
      cursor = new Date(date.getTime() + 36 * 60 * 60 * 1000);
    }
  }

  // 2. Solar Eclipse Calculation via Astronomy Engine
  try {
    const observer = new Astronomy.Observer(latitude, longitude, 0);
    const eclipse = Astronomy.SearchLocalSolarEclipse(start, observer);
    const peak = eclipse?.peak?.time?.date;
    if (peak && inRange(peak, start, end) && eclipse.kind !== Astronomy.EclipseKind.Invalid) {
      events.push({
        id: `eclipse-solar-${peak.toISOString()}`,
        title: 'Gerhana Matahari Lokal',
        eventType: 'astronomy',
        startsAt: peak.toISOString(),
        endsAt: eclipse.partial_end?.time?.date?.toISOString() || null,
        description: 'Waktu puncak dihitung presisi untuk koordinat observatori resort. Amati Matahari hanya dengan filter solar teleskop bersertifikasi ISO.',
        sourceName: 'NASA GSFC / Astronomy Engine',
        sourceUrl: 'https://science.nasa.gov/eclipses/',
        visibility: 'both',
        isPublished: true,
        calculated: true,
      });
    }
  } catch {
    // Graceful fallback
  }

  // 3. Meteor Showers in range
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  for (let yr = startYear; yr <= endYear; yr++) {
    for (const shower of ANNUAL_METEOR_SHOWERS) {
      const peakDate = new Date(Date.UTC(yr, shower.peakMonth - 1, shower.peakDay, 21, 0, 0));
      if (inRange(peakDate, start, end)) {
        events.push({
          id: `meteor-${shower.name.toLowerCase()}-${yr}`,
          title: `Puncak Hujan Meteor ${shower.name} (${shower.zhr})`,
          eventType: 'meteor',
          startsAt: peakDate.toISOString(),
          endsAt: new Date(peakDate.getTime() + 8 * 3600 * 1000).toISOString(),
          description: `${shower.description} Radiant: Rasi ${shower.radiant}. Asal debu: ${shower.parentBody}. Laju: ${shower.zhr}. Periode aktif: ${shower.activeRange}.`,
          sourceName: shower.source,
          sourceUrl: shower.url,
          visibility: 'both',
          isPublished: true,
          calculated: true,
        });
      }
    }
  }

  // 4. International Space Days in range
  for (let yr = startYear; yr <= endYear; yr++) {
    for (const sday of INTERNATIONAL_SPACE_DAYS) {
      const dayDate = new Date(Date.UTC(yr, sday.month - 1, sday.day, 0, 0, 0));
      if (inRange(dayDate, start, end)) {
        events.push({
          id: `space-day-${sday.title.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${yr}`,
          title: `🚀 ${sday.title}`,
          eventType: 'astronomy',
          startsAt: dayDate.toISOString(),
          endsAt: sday.durationDays ? new Date(dayDate.getTime() + sday.durationDays * 24 * 3600 * 1000).toISOString() : null,
          description: `${sday.description} (Resmi: ${sday.organization})`,
          sourceName: sday.organization,
          sourceUrl: sday.url,
          visibility: 'both',
          isPublished: true,
          calculated: true,
        });
      }
    }
  }

  // 5. Major Astronomical Events in range
  for (const major of MAJOR_ASTRONOMICAL_EVENTS) {
    const mDate = new Date(major.startsAt);
    if (inRange(mDate, start, end)) {
      events.push({
        id: `major-${major.title.slice(0, 20).toLowerCase().replace(/[^a-z0-9]/g, '-')}-${mDate.getFullYear()}`,
        title: major.title,
        eventType: major.eventType,
        startsAt: major.startsAt,
        endsAt: null,
        description: major.description,
        sourceName: major.sourceName,
        sourceUrl: major.sourceUrl,
        visibility: 'both',
        isPublished: true,
        calculated: true,
      });
    }
  }

  return events.sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

/**
 * Returns clean, ready-to-insert event objects for Admin 1-Click Sync
 */
export function getOfficialPresets(year = 2026) {
  const presets = [];

  // Major NASA / IAU events
  for (const item of MAJOR_ASTRONOMICAL_EVENTS) {
    const itemYear = new Date(item.startsAt).getUTCFullYear();
    if (itemYear === year) {
      presets.push({
        title: item.title,
        eventType: item.eventType,
        startsAt: item.startsAt,
        endsAt: null,
        description: item.description,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl,
        visibility: 'both',
        isPublished: true,
      });
    }
  }

  // Meteor showers
  for (const shower of ANNUAL_METEOR_SHOWERS) {
    const peakDate = new Date(Date.UTC(year, shower.peakMonth - 1, shower.peakDay, 21, 0, 0));
    presets.push({
      title: `Puncak Hujan Meteor ${shower.name} (${shower.zhr})`,
      eventType: 'meteor',
      startsAt: peakDate.toISOString(),
      endsAt: new Date(peakDate.getTime() + 8 * 3600 * 1000).toISOString(),
      description: `${shower.description} Rasi: ${shower.radiant}. Induk: ${shower.parentBody}. Periode: ${shower.activeRange}.`,
      sourceName: shower.source,
      sourceUrl: shower.url,
      visibility: 'both',
      isPublished: true,
    });
  }

  // Space days
  for (const sday of INTERNATIONAL_SPACE_DAYS) {
    const dayDate = new Date(Date.UTC(year, sday.month - 1, sday.day, 0, 0, 0));
    presets.push({
      title: `🚀 ${sday.title}`,
      eventType: 'astronomy',
      startsAt: dayDate.toISOString(),
      endsAt: sday.durationDays ? new Date(dayDate.getTime() + sday.durationDays * 24 * 3600 * 1000).toISOString() : null,
      description: `${sday.description} (${sday.organization})`,
      sourceName: sday.organization,
      sourceUrl: sday.url,
      visibility: 'both',
      isPublished: true,
    });
  }

  return presets;
}

