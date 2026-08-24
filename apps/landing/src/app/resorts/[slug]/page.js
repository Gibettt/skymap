import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@ephemeris/db';
import StargazingExperienceShowcase from '@/components/StargazingExperienceShowcase';
import ResortEventCalendar from '@/components/ResortEventCalendar';
import { rollingDateWindow } from '@ephemeris/sky';

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
    `SELECT id, name, code, slug, location, contact_email, whatsapp_number, timezone
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
  const window = rollingDateWindow(resort.timezone);
  const eventResult = await query(
    `SELECT se.id, se.title, se.event_type, se.starts_at, se.ends_at, se.description,
            se.observation_spot, se.capacity, se.price_override_usd, se.image_url, se.status,
            p.name AS package_name, p.adult_price_usd
     FROM sky_events se
     LEFT JOIN packages p ON p.id = se.package_id AND p.is_active = true
     WHERE se.resort_id = $1
       AND se.status = 'published'
       AND se.is_published = true
       AND (se.starts_at AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
       AND COALESCE(se.ends_at, se.starts_at) >= now()
     ORDER BY se.starts_at`,
    [resort.id, resort.timezone, window.from, window.to]
  );
  return {
    resort,
    window,
    events: eventResult.rows,
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
  const { resort, packages, events, window } = data;
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

      <section className="stargazing-section" aria-labelledby="upcoming-events-title">
        <div className="stargazing-section-head">
          <p className="stargazing-kicker">{window.from} — {window.to}</p>
          <h2 id="upcoming-events-title">Special events in the next 7 days</h2>
          <p>This rolling calendar updates automatically using {resort.name}&apos;s local timezone.</p>
        </div>
        {events.length > 0
          ? <ResortEventCalendar resortName={resort.name} timeZone={resort.timezone} events={events} />
          : <div className="stargazing-note"><p>No special event is published for this seven-day window.</p></div>}
      </section>

      <footer className="stargazing-footer"><span>Ephemeris</span><span>{resort.name}</span></footer>
    </main>
  );
}
