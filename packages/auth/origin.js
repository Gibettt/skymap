import { ApiError } from './errors.js';

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim().toLowerCase();
}

function expectedOrigin(request) {
  const headerStore = request?.headers;
  const requestUrl = new URL(request.url);
  const host = firstHeaderValue(headerStore?.get('x-forwarded-host'))
    || firstHeaderValue(headerStore?.get('host'))
    || requestUrl.host.toLowerCase();
  const protocol = firstHeaderValue(headerStore?.get('x-forwarded-proto'))
    || requestUrl.protocol.replace(':', '').toLowerCase();
  return `${protocol}://${host}`;
}

export async function assertSameOrigin(
  request,
  { requireOrigin = true } = {},
) {
  const method = String(request?.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

  const origin = request?.headers?.get('origin');
  if (!origin) {
    if (requireOrigin) throw new ApiError(403, 'Request origin is required');
    return;
  }

  let normalizedOrigin;
  try {
    normalizedOrigin = new URL(origin).origin.toLowerCase();
  } catch {
    throw new ApiError(403, 'Invalid request origin');
  }

  if (normalizedOrigin !== expectedOrigin(request)) {
    throw new ApiError(403, 'Invalid request origin');
  }
}
