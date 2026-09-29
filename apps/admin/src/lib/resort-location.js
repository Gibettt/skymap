export function worldTimezones() {
  const supported = Intl.supportedValuesOf?.('timeZone') || [];
  return [...new Set(['UTC', ...supported])].sort();
}

export function normalizeLocationResult(result, timezone) {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Koordinat lokasi tidak valid');
  }

  const address = result.address || {};
  const locality = address.city || address.town || address.village || address.island || address.municipality || address.county;
  const location = [...new Set([locality, address.state, address.country].filter(Boolean))].join(', ');

  return {
    label: result.display_name,
    location: location || result.display_name,
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    timezone,
  };
}
