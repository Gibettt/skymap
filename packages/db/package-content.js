export const MAX_PACKAGE_INCLUSIONS = 20;
export const MAX_PACKAGE_INCLUSION_LENGTH = 120;

export function normalizePackageInclusions(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const inclusions = [];

  for (const item of value) {
    const label = String(item ?? '').trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    inclusions.push(label);
  }

  return inclusions;
}

export function formatPackageInclusions(value, fallback = '') {
  const inclusions = normalizePackageInclusions(value);
  return inclusions.length ? inclusions.join(', ') : fallback;
}

export function packageIsChargeable(adultPriceUsd, childPriceUsd, couplePriceUsd = 0, groupPriceUsd = 0, familyPriceUsd = 0) {
  return (
    Number(adultPriceUsd || 0) > 0 ||
    Number(childPriceUsd || 0) > 0 ||
    Number(couplePriceUsd || 0) > 0 ||
    Number(groupPriceUsd || 0) > 0 ||
    Number(familyPriceUsd || 0) > 0
  );
}
