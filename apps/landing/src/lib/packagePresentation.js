import { formatPackageInclusions } from '@ephemeris/db/package-content';

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}++`;
}

function packagePrice(pkg) {
  if (pkg.is_chargeable === false) return 'Complimentary';
  const prices = [`Adult ${formatUsd(pkg.adult_price_usd)}`];
  if (pkg.child_price_usd !== null) prices.push(`Child ${formatUsd(pkg.child_price_usd)}`);
  return prices.join(' / ');
}

export function packageToExperience(pkg, staticExperiences = []) {
  const staticExperience = staticExperiences.find((item) => item.title === pkg.name);

  return {
    ...(staticExperience || {}),
    title: pkg.name,
    image: pkg.image_url || staticExperience?.image || '/stargazing-assets/experience-3.jpg',
    schedule: pkg.schedule || 'Upon request',
    price: packagePrice(pkg),
    venue: pkg.location,
    includes: formatPackageInclusions(pkg.inclusions, 'Details upon request'),
    description: pkg.description || staticExperience?.description || `${pkg.name} package at ${pkg.location}.`,
  };
}

export function buildLandingExperiences(packages, staticExperiences = []) {
  if (!Array.isArray(packages)) return [];
  return packages.map((pkg) => packageToExperience(pkg, staticExperiences));
}
