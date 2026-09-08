import { isIP } from 'node:net';

const AUDIT_EXCLUDE_FIELDS = new Set([
  'access_token',
  'image_data',
  'password',
  'password_hash',
  'refresh_token',
  'secret',
  'session_secret',
  'token',
  'add_ons',
]);

function sanitizeAuditData(data) {
  if (Array.isArray(data)) return data.map(sanitizeAuditData);
  if (!data || typeof data !== 'object') return data;
  const prototype = Object.getPrototypeOf(data);
  if (prototype !== Object.prototype && prototype !== null) return data;
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !AUDIT_EXCLUDE_FIELDS.has(key.toLowerCase()))
      .map(([key, value]) => [key, sanitizeAuditData(value)])
  );
}

const CLIENT_IP_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'fly-client-ip',
  'fastly-client-ip',
  'x-real-ip',
];

function normalizeIpCandidate(value) {
  if (typeof value !== 'string') return null;

  let candidate = value.trim();
  if (!candidate) return null;

  if (candidate.toLowerCase().startsWith('for=')) {
    candidate = candidate.slice(4).trim();
  }

  if (
    (candidate.startsWith('"') && candidate.endsWith('"')) ||
    (candidate.startsWith("'") && candidate.endsWith("'"))
  ) {
    candidate = candidate.slice(1, -1).trim();
  }

  if (!candidate || candidate.toLowerCase() === 'unknown' || candidate.startsWith('_')) {
    return null;
  }

  if (candidate.startsWith('[')) {
    const closingBracket = candidate.indexOf(']');
    if (closingBracket === -1) return null;

    const suffix = candidate.slice(closingBracket + 1);
    if (suffix && !/^:\d+$/.test(suffix)) return null;
    candidate = candidate.slice(1, closingBracket);
  } else {
    const ipv4WithPort = candidate.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (ipv4WithPort && isIP(ipv4WithPort[1]) === 4) {
      candidate = ipv4WithPort[1];
    }
  }

  if (candidate.toLowerCase().startsWith('::ffff:')) {
    const mappedIpv4 = candidate.slice(7);
    if (isIP(mappedIpv4) === 4) candidate = mappedIpv4;
  }

  return isIP(candidate) ? candidate : null;
}

function firstValidIp(values) {
  for (const value of values) {
    const ip = normalizeIpCandidate(value);
    if (ip) return ip;
  }
  return null;
}

function forwardedForValues(value) {
  if (!value) return [];

  return value.split(',').flatMap((entry) =>
    entry
      .split(';')
      .map((parameter) => parameter.trim())
      .filter((parameter) => parameter.toLowerCase().startsWith('for='))
  );
}

export function resolveClientIp(request) {
  const headerStore = request?.headers;

  if (headerStore && typeof headerStore.get === 'function') {
    for (const header of CLIENT_IP_HEADERS) {
      const ip = firstValidIp((headerStore.get(header) || '').split(','));
      if (ip) return ip;
    }

    const forwardedIp = firstValidIp(forwardedForValues(headerStore.get('forwarded')));
    if (forwardedIp) return forwardedIp;

    const forwardedForIp = firstValidIp((headerStore.get('x-forwarded-for') || '').split(','));
    if (forwardedForIp) return forwardedForIp;
  }

  return firstValidIp([
    request?.ip,
    request?.socket?.remoteAddress,
    request?.connection?.remoteAddress,
  ]);
}

export async function writeAudit(client, { actorId, action, entityType, entityId, beforeData, afterData, request }) {
  const ip = resolveClientIp(request);
  const userAgent = request?.headers.get('user-agent') || null;
  await client.query(
    `INSERT INTO audit_logs
      (actor_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
    [
      actorId || null,
      action,
      entityType,
      entityId || null,
      beforeData ? JSON.stringify(sanitizeAuditData(beforeData)) : null,
      afterData ? JSON.stringify(sanitizeAuditData(afterData)) : null,
      ip,
      userAgent,
    ]
  );
}
