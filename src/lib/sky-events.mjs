const EVENT_TYPES = new Set(['astronomy', 'meteor', 'resort']);
const DIRECTIONS = new Set(['north', 'south', 'both']);

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
  if (sourceUrl) {
    try {
      new URL(sourceUrl);
    } catch {
      throw new Error('Source URL is invalid');
    }
  }

  return {
    title,
    eventType,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt?.toISOString() || null,
    description: text(input.description, 'Description').slice(0, 1500),
    sourceName: text(input.sourceName, 'Source name').slice(0, 120),
    sourceUrl: sourceUrl || null,
    visibility,
    isPublished: input.isPublished !== false,
  };
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
