import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@ephemeris/db';
import StargazingExperienceShowcase from '@/components/StargazingExperienceShowcase';

export const dynamic = 'force-dynamic';

function contactLinks(resort) {
  const digits = String(resort.whatsapp_number || '').replace(/\D/g, '');
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resort.contact_email || '') ? resort.contact_email : null;
  const message = encodeURIComponent(`Hello, I would like to ask about stargazing at ${resort.name}.`);
  return {
    whatsapp: digits ? `https://wa.me/${digits}?text=${message}` : null,
    email: email ? `mailto:${email}` : null,
  };
}

async function loadResort(slug) {
  const resortResult = await query(
    `SELECT id, name, code, slug, location, contact_email, whatsapp_number
     FROM resorts WHERE slug = $1 AND status = 'active' LIMIT 1`,
    [slug]
  );
  const resort = resortResult.rows[0];
  if (!resort) return null;

  const packageResult = await query(
    `SELECT id, name, package_type, experience_type, location, description, schedule,
            adult_price_usd, child_price_usd, child_age_range, is_chargeable,
            image_data IS NOT NULL AS has_image,
            COALESCE((
              SELECT json_agg(pi.label ORDER BY pi.sort_order)
              FROM package_inclusions pi
              WHERE pi.package_id = p.id AND pi.is_active = true
            ), '[]'::json) AS inclusions
     FROM packages p
     WHERE p.resort_id = $1 AND p.is_active = true
     ORDER BY p.name`,
    [resort.id]
  );
  return {
    resort,
    packages: packageResult.rows.map((pkg) => ({
      ...pkg,
      image_url: pkg.has_image ? `/api/packages/${pkg.id}/image` : null,
    })),
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await loadResort(slug);
  if (!data) return { title: 'Resort not found | Ephemeris' };
  return {
    title: `Stargazing at ${data.resort.name} | Ephemeris`,
    description: `Exclusive astronomy experiences and pricing for ${data.resort.name}.`,
  };
}

export default async function ResortLandingPage({ params }) {
  const { slug } = await params;
  const data = await loadResort(slug);
  if (!data) notFound();
  const { resort, packages } = data;
  const contacts = contactLinks(resort);
  const primaryContact = contacts.whatsapp || contacts.email || '#experiences';
  const heroImage = packages.find((pkg) => pkg.image_url)?.image_url || '/stargazing-assets/experience-3.jpg';

  return (
    <main className="stargazing-page">
      <nav className="stargazing-nav">
        <Link href="/" className="stargazing-brand"><span>Ephemeris</span><small>{resort.name}</small></Link>
        <div className="stargazing-nav-links">
          <Link href="/sky">Sky Guide 3D</Link>
          <a href="#experiences">Experiences</a>
          {contacts.email && <a href={contacts.email}>Email</a>}
          {contacts.whatsapp && <a href={contacts.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        </div>
        <details className="stargazing-mobile-nav">
          <summary aria-label="Open navigation menu">
            <span />
            <span />
            <span />
          </summary>
          <div className="stargazing-mobile-nav-panel">
            <Link href="/sky">Sky Guide 3D</Link>
            <a href="#experiences">Experiences</a>
            {contacts.email && <a href={contacts.email}>Email</a>}
            {contacts.whatsapp && <a href={contacts.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          </div>
        </details>
      </nav>

      <section className="stargazing-hero">
        <div className="stargazing-hero-copy">
          <p className="stargazing-kicker">{resort.location} | Exclusive resort experiences</p>
          <h1>Stargazing at {resort.name}</h1>
          <p>Explore packages, exact pricing, and astronomy experiences available specifically at this resort.</p>
          <div className="stargazing-actions">
            <a href={primaryContact} className="stargazing-button" target={contacts.whatsapp ? '_blank' : undefined} rel={contacts.whatsapp ? 'noopener noreferrer' : undefined}>Contact resort</a>
            <a href="#experiences" className="stargazing-button secondary">View experiences</a>
          </div>
        </div>
        <div className="stargazing-hero-image">
          <Image src={heroImage} alt={`Stargazing at ${resort.name}`} fill priority sizes="100vw" />
        </div>
        <div className="stargazing-hero-details">
          <span>{resort.name}</span><span>{resort.location}</span><span>{packages.length} available packages</span><span>Resort reservation required</span>
        </div>
      </section>

      <section id="experiences" className="stargazing-section">
        <div className="stargazing-section-head">
          <p className="stargazing-kicker">Available at {resort.code}</p>
          <h2>Experiences and pricing for {resort.name}</h2>
          <p>Only packages assigned to this location are shown, so guests always see the correct offer.</p>
        </div>
        {packages.length > 0
          ? <StargazingExperienceShowcase packages={packages} contactLink={primaryContact} />
          : <div className="stargazing-note"><p>No active packages are currently published for this resort.</p></div>}
      </section>

      <footer className="stargazing-footer"><span>Ephemeris</span><span>{resort.name}</span></footer>
    </main>
  );
}
