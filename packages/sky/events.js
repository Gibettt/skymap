const EVENT_TYPES = new Set(['astronomy', 'meteor', 'resort']);
const DIRECTIONS = new Set(['north', 'south', 'both']);
const EVENT_STATUSES = new Set(['draft', 'published', 'cancelled', 'sold_out']);

function text(value, label, required = false) {
  const result = String(value ?? '').trim();
  if (required && !result) throw new Error(`${label} is required`);
  return result;
}

function dateValue(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

export function normalizeSkyEventInput(input) {
  const title = text(input.title, 'Title', true);
  if (title.length > 120) throw new Error('Title is too long');

  const eventType = text(input.eventType, 'Event type', true);
  if (!EVENT_TYPES.has(eventType)) throw new Error('Event type is invalid');

  const startsAt = dateValue(input.startsAt, 'Start date');
  const endsAt = input.endsAt ? dateValue(input.endsAt, 'End date') : null;
  if (endsAt && endsAt <= startsAt) throw new Error('End date must be after the start date');

  const visibility = text(input.visibility || 'both', 'Visibility');
  if (!DIRECTIONS.has(visibility)) throw new Error('Visibility is invalid');

  const sourceUrl = text(input.sourceUrl, 'Source URL');
  const imageUrl = text(input.imageUrl, 'Image URL');
  for (const [url, label] of [[sourceUrl, 'Source URL'], [imageUrl, 'Image URL']]) {
    if (!url) continue;
    try {
      if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
    } catch {
      throw new Error(`${label} is invalid`);
    }
  }

  const status = text(input.status || (input.isPublished === false ? 'draft' : 'published'), 'Status');
  if (!EVENT_STATUSES.has(status)) throw new Error('Status is invalid');
  const capacity = input.capacity === '' || input.capacity == null ? null : Number(input.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) throw new Error('Capacity is invalid');
  const priceOverrideUsd = input.priceOverrideUsd === '' || input.priceOverrideUsd == null
    ? null
    : Number(input.priceOverrideUsd);
  if (priceOverrideUsd !== null && (!Number.isFinite(priceOverrideUsd) || priceOverrideUsd < 0)) {
    throw new Error('Price override is invalid');
  }

  return {
    title,
    eventType,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() || null,
    description: text(input.description, 'Description').slice(0, 1500),
    sourceName: text(input.sourceName, 'Source name').slice(0, 120),
    sourceUrl: sourceUrl || null,
    imageUrl: imageUrl || null,
    visibility,
    observationSpot: text(input.observationSpot, 'Observation spot').slice(0, 120) || null,
    capacity,
    priceOverrideUsd,
    packageId: text(input.packageId, 'Package ID') || null,
    status,
    isPublished: status === 'published',
  };
}

export function rollingDateWindow(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  const from = `${value.year}-${value.month}-${value.day}`;
  const end = new Date(`${from}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return { from, to: end.toISOString().slice(0, 10) };
}

export function nearestResort(latitude, longitude, resorts) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const distance = (resort) => {
    const latitudeDelta = radians(Number(resort.latitude) - latitude);
    const longitudeDelta = radians(Number(resort.longitude) - longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(radians(latitude)) * Math.cos(radians(Number(resort.latitude)))
      * Math.sin(longitudeDelta / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return resorts.reduce((nearest, resort) => distance(resort) < distance(nearest) ? resort : nearest);
}

export function validateResortLocation(input) {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
  return { latitude, longitude };
}

export function filterPublicEvents(events, from, to) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const finish = new Date(`${to}T23:59:59.999Z`);
  return events.filter((event) => {
    const eventStart = new Date(event.startsAt);
    return event.isPublished && eventStart >= start && eventStart <= finish;
  });
}
