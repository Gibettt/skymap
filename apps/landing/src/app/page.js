import Image from 'next/image';
import Link from 'next/link';
import { query } from '@ephemeris/db';
import StargazingExperienceShowcase from '@/components/StargazingExperienceShowcase';
import WhatsAppChatWidget from '@/components/WhatsAppChatWidget';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Beach Stargazing | Le Meridien Maldives',
  description: 'Premium guided stargazing, solar observation, celestial dining, and astronomy programmes at Le Meridien Maldives.',
};

const whatsappLink = 'https://wa.me/6285179546466?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20Stargazing%20Experience%20di%20Le%20Meridien%20Maldives.';

const masterclass = [
  ['Skygazer - basic', '3 days', 'USD 285++ per person'],
  ['Stargazer - intermediate', '5 days', 'USD 460++ per couple'],
  ['Astro-photography course', '4 days', 'USD 350++ per couple'],
  ['Astro-portrait course', '90 min', 'USD 285++ per couple'],
];

async function loadPackages() {
  try {
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_data bytea');
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_mime_type text');
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_file_name text');
    const { rows } = await query(`
      SELECT
        id, name, package_type, experience_type, location, description,
        adult_price_usd, child_price_usd, child_age_range,
        image_data IS NOT NULL AS has_image
      FROM packages
      WHERE is_active = true
      ORDER BY name
    `);
    return rows.map((pkg) => ({
      ...pkg,
      image_url: pkg.has_image ? `/api/packages/${pkg.id}/image` : null,
    }));
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const packages = await loadPackages();

  return (
    <main className="stargazing-page">
      <nav className="stargazing-nav">
        <Link href="/" className="stargazing-brand">
          <span>Ephemeris</span>
          <small>Le Meridien Maldives</small>
        </Link>
        <div className="stargazing-nav-links">
          <Link href="/sky" style={{ color: '#38bdf8', fontWeight: 700 }}>🌌 Sky Guide 3D</Link>
          <a href="#experiences">Experiences</a>
          <a href="#masterclass">Masterclass</a>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        </div>
      </nav>

      <section className="stargazing-hero">
        <div className="stargazing-hero-copy">
          <p className="stargazing-kicker">Palm Beach | Maldives | Guided by resident astronomer</p>
          <h1>Beach Stargazing at Le Meridien Maldives</h1>
          <p>
            A bold, intimate astronomy experience under the Maldivian night sky, made for couples, families, and curious travelers.
          </p>
          <div className="stargazing-actions">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="stargazing-button">
              Chat via WhatsApp
            </a>
            <Link href="/sky" className="stargazing-button" style={{ background: 'linear-gradient(135deg, #0284c7, #7c3aed)', border: 'none' }}>
              🌌 Buka Peta Langit 3D
            </Link>
            <a href="#experiences" className="stargazing-button secondary">View Experiences</a>
          </div>
        </div>

        <div className="stargazing-hero-image">
          <Image
            src="/stargazing-assets/experience-3.jpg"
            alt="Beach stargazing under the Maldivian night sky"
            fill
            priority
            sizes="100vw"
          />
          <div className="hero-price-card">
            <span>Signature Night</span>
            <strong>USD 90++</strong>
            <small>per adult | children 50% off</small>
          </div>
        </div>

        <div className="stargazing-hero-details">
          <span>Monday, Thursday & Saturday</span>
          <span>21:00 to 22:00</span>
          <span>Palm Beach</span>
          <span>Concierge reservation required</span>
        </div>
      </section>

      <section className="stargazing-proof" aria-label="Experience highlights">
        <div>
          <strong>4.9/5</strong>
          <span>guest rating target</span>
        </div>
        <div>
          <strong>10% SC + 17% GST</strong>
          <span>clear resort pricing</span>
        </div>
        <div>
          <strong>Staff assisted</strong>
          <span>reserve by concierge or WhatsApp</span>
        </div>
      </section>

      <section id="experiences" className="stargazing-section">
        <div className="stargazing-section-head">
          <p className="stargazing-kicker">Choose your sky</p>
          <h2>Guided astronomy experiences for every kind of night.</h2>
          <p>
            From beach stargazing and moonlit dining to kids sessions and solar observation, each programme is designed to feel personal, visual, and easy to reserve.
          </p>
        </div>

        <StargazingExperienceShowcase packages={packages} />
      </section>

      <section id="masterclass" className="masterclass-section">
        <div>
          <p className="stargazing-kicker">For deeper explorers</p>
          <h2>Astronomy Masterclass</h2>
          <p>
            Certified programmes for guests who want a hands-on path into celestial observation, sky reading, and astro-photography.
          </p>
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

      <section className="stargazing-note">
        <p>
          Reservation is handled by resort staff. Prices are in USD and subject to 10% service charge and 17% GST.
        </p>
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="stargazing-button">
          Ask concierge
        </a>
      </section>

      <footer className="stargazing-footer">
        <span>@LeMeridienMaldives</span>
        <span>#DestinationUnlocked | #LeMeridienMaldives</span>
      </footer>

      <WhatsAppChatWidget />
    </main>
  );
}
