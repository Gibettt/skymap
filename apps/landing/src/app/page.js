import Image from 'next/image';
import Link from 'next/link';
import { query } from '@ephemeris/db';
import StargazingExperienceShowcase from '@/components/StargazingExperienceShowcase';
import ResortLocator from '@/components/ResortLocator';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Maldives Stargazing Experiences | SpaceCat Astrotourism',
  description: 'Discover guided stargazing, solar observation, celestial dining, and astronomy programmes across partner resorts in the Maldives.',
};

const whatsappLink = 'https://wa.me/6285179546466?text=Hello%2C%20I%20would%20like%20to%20ask%20about%20a%20SpaceCat%20Astrotourism%20stargazing%20experience.';

const masterclass = [
  ['Skygazer - basic', '3 days', 'USD 285++ per person'],
  ['Stargazer - intermediate', '5 days', 'USD 460++ per couple'],
  ['Astro-photography course', '4 days', 'USD 350++ per couple'],
  ['Astro-portrait course', '90 min', 'USD 285++ per couple'],
];

async function loadPackages() {
  try {
    const { rows } = await query(`
      SELECT
        id, name, package_type, experience_type, location, description, schedule,
        adult_price_usd, child_price_usd, child_age_range, is_chargeable,
        image_data IS NOT NULL AS has_image,
        COALESCE((
          SELECT json_agg(pi.label ORDER BY pi.sort_order)
          FROM package_inclusions pi
          WHERE pi.package_id = p.id AND pi.is_active = true
        ), '[]'::json) AS inclusions
      FROM packages p
      WHERE p.is_active = true
        AND p.resort_id = (SELECT id FROM resorts WHERE code = 'LMM' AND status = 'active' LIMIT 1)
      ORDER BY p.name
    `);
    return rows.map((pkg) => ({
      ...pkg,
      image_url: pkg.has_image ? `/api/packages/${pkg.id}/image` : null,
    }));
  } catch {
    return [];
  }
}

async function loadResorts() {
  try {
    const { rows } = await query(
      `SELECT name, slug, location, latitude, longitude FROM resorts
       WHERE status = 'active' AND slug IS NOT NULL
       ORDER BY name`
    );
    return rows;
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const packages = await loadPackages();
  const resorts = await loadResorts();

  return (
    <main className="stargazing-page home-page">
      <header className="home-site-header">
        <nav className="home-nav" aria-label="Main navigation">
          <Link href="/" className="home-brand">
            <span className="home-brand-mark" aria-hidden="true">
              <Image src="/spacecat-astrotourism-logo.jpg" alt="" width={66} height={44} sizes="66px" />
            </span>
            <span><strong>SpaceCat</strong><small>Astrotourism</small></span>
          </Link>
          <div className="home-nav-links">
            <Link href="/sky">Sky Guide 3D</Link>
            <a href="#experiences">Experiences</a>
            <a href="#resorts">Resorts</a>
            <a href="#masterclass">Masterclass</a>
            <a className="home-nav-cta" href={whatsappLink} target="_blank" rel="noopener noreferrer">Contact</a>
          </div>
          <details className="home-mobile-nav">
            <summary aria-label="Open navigation menu"><span /><span /><span /></summary>
            <div className="home-mobile-nav-panel">
              <Link href="/sky">Sky Guide 3D</Link>
              <a href="#experiences">Experiences</a>
              <a href="#resorts">Resorts</a>
              <a href="#masterclass">Masterclass</a>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">Contact</a>
            </div>
          </details>
        </nav>
      </header>

      <section className="home-hero" aria-labelledby="home-hero-title">
        <Image
          className="home-hero-media"
          src="/stargazing-assets/ephemeris-nasa-editorial-hero.png"
          alt="A resident astronomer guides two guests beside a telescope under the Milky Way in the Maldives"
          fill
          priority
          sizes="100vw"
        />
        <div className="home-hero-shade" />
        <div className="home-hero-copy">
          <p className="home-eyebrow">Guided astronomy in the Maldives</p>
          <h1 id="home-hero-title">Meet the universe after dark.</h1>
          <p>Explore the night sky with a resident astronomer from your island resort.</p>
          <a className="home-hero-action" href="#resorts"><span>Choose your resort</span><strong aria-hidden="true">→</strong></a>
        </div>
      </section>

      <section className="home-facts" aria-label="Experience information">
        <p><strong>{resorts.length}</strong><span>Active resort locations</span></p>
        <p><strong>{packages.length}</strong><span>Published experiences</span></p>
        <p><strong>7 days</strong><span>Live guest calendar</span></p>
        <p><strong>Nightly</strong><span>Weather-led observation</span></p>
      </section>

      <section id="experiences" className="home-featured" aria-labelledby="home-experiences-title">
        <div className="home-featured-heading">
          <div>
            <h2 id="home-experiences-title">Featured experiences</h2>
            <p>Beach observation, solar sessions, celestial dining, and guided astrophotography.</p>
          </div>
          <a href="#resorts">Find your location <span aria-hidden="true">→</span></a>
        </div>
        <StargazingExperienceShowcase packages={packages} />
      </section>

      <section id="resorts" className="home-resorts" aria-labelledby="home-resorts-title">
        <div className="home-section-heading">
          <h2 id="home-resorts-title">Your island. Your sky.</h2>
          <p>Every resort publishes its own packages, observation points, pricing, and rolling seven-day calendar.</p>
        </div>
        {resorts.length > 0 ? (
          <div className="home-resort-panel">
            <ResortLocator resorts={resorts} />
            <div className="home-resort-list">
              {resorts.map((resort) => (
                <Link key={resort.slug} href={`/resorts/${resort.slug}`} className="home-resort-link">
                  <span><strong>{resort.name}</strong><small>{resort.location || 'Maldives'}</small></span>
                  <span aria-hidden="true">Explore →</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="stargazing-note"><p>Resort locations are being prepared. Ask our concierge for current availability.</p></div>
        )}
      </section>

      <section className="home-image-story" aria-labelledby="home-story-title">
        <div className="home-story-image">
          <Image
            src="/stargazing-assets/experience-8.jpg"
            alt="Guests learning about the night sky beside a beach telescope"
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
          />
        </div>
        <div className="home-story-copy">
          <p className="home-story-label">Tonight under the stars</p>
          <h2 id="home-story-title">The beach becomes your observatory.</h2>
          <p>A resident astronomer brings the sky into focus with a professional telescope and a story shaped around what is visible tonight.</p>
          <dl>
            <div><dt>Before</dt><dd>Your resort confirms the meeting point and weather.</dd></div>
            <div><dt>Observe</dt><dd>See planets, stars, and deep-sky objects through the telescope.</dd></div>
            <div><dt>Continue</dt><dd>Add a masterclass, astro-portrait, or private dining experience.</dd></div>
          </dl>
        </div>
      </section>

      <section id="masterclass" className="masterclass-section home-masterclass">
        <div>
          <h2>Astronomy Masterclass</h2>
          <p>Hands-on programmes for guests ready to observe, navigate, and photograph the night sky.</p>
        </div>
        <div className="masterclass-list">
          {masterclass.map(([name, duration, price]) => (
            <div className="masterclass-row" key={name}>
              <span>{name}</span>
              <span>{duration}</span>
              <strong>{price}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="home-booking" aria-labelledby="home-booking-title">
        <div>
          <h2 id="home-booking-title">Your night sky starts here.</h2>
          <p>Resort staff confirm availability, weather, meeting point, and final pricing.</p>
        </div>
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="home-booking-action"><span>Ask the concierge</span><strong aria-hidden="true">→</strong></a>
      </section>

      <footer className="home-footer">
        <div>
          <Link href="/" className="home-brand">
            <span className="home-brand-mark" aria-hidden="true">
              <Image src="/spacecat-astrotourism-logo.jpg" alt="" width={66} height={44} sizes="66px" />
            </span>
            <span><strong>SpaceCat</strong><small>Astrotourism</small></span>
          </Link>
          <p>Guided astronomy experiences across partner resorts in the Maldives.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/sky">Sky Guide 3D</Link>
          <a href="#experiences">Experiences</a>
          <a href="#resorts">Resorts</a>
          <a href="#masterclass">Masterclass</a>
        </nav>
        <small>Experiences are subject to weather and resort availability.</small>
      </footer>
    </main>
  );
}
