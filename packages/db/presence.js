export const OFFLINE_AFTER_MS = 75_000;
export const IDLE_AFTER_MS = 120_000;

function toMillis(value) {
  if (!value) return null;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function presenceStatus({ lastSeenAt, lastActiveAt }, now = Date.now()) {
  const seenAt = toMillis(lastSeenAt);
  if (seenAt === null || now - seenAt >= OFFLINE_AFTER_MS) return 'offline';

  const activeAt = toMillis(lastActiveAt);
  if (activeAt === null || now - activeAt >= IDLE_AFTER_MS) return 'idle';
  return 'online';
}
