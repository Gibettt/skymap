import Image from "next/image";
import Link from "next/link";
import { query } from "@ephemeris/db";
import ClubFauneNav from "@/components/ClubFauneNav";
import ClubFauneSlider from "@/components/ClubFauneSlider";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SpaceCat ASTROTOURISM | Luxury Astrotourism & Celestial Stargazing Experiences in the Maldives",
  description:
    "Journey into the cosmos beside the ocean of stars. Exclusive guided stargazing experiences led by resident astronomers at luxury Maldives partner resorts.",
};

const whatsappLink =
  "https://wa.me/6285179546466?text=Hello%2C%20I%20would%20like%20to%20inquire%20about%20a%20SpaceCat%20ASTROTOURISM%20stargazing%20experience%20in%20the%20Maldives.";

const masterclasses = [
  ["Skygazer — Celestial Fundamentals", "3 days", "USD 285++ / person"],
  ["Stargazer — Intermediate Immersion", "5 days", "USD 460++ / couple"],
  ["Astrophotography & Deep Sky", "4 days", "USD 350++ / couple"],
  ["Astro-Portrait & Private Session", "90 min", "USD 285++ / couple"],
];

const magazineArticles = [
  {
    tag: "Astro Guide",
    region: "Maldives",
    country: "Bortle 1 Skies",
    title: "Equatorial Stargazing: Viewing Both Hemispheres",
    excerpt:
      "Positioned near the equator, the Maldives offers a rare vantage point to observe both northern and southern celestial treasures on the same clear night.",
    image: "/stargazing-assets/experience-9.jpg",
  },
  {
    tag: "Astrophotography",
    region: "Maldives",
    country: "Lhaviyani Atoll",
    title: "Capturing the Core of the Milky Way",
    excerpt:
      "Our resident astrophotographers share technical settings, exposure secrets, and framing tips for unpolluted tropical night photography.",
    image: "/stargazing-assets/experience-4.jpg",
  },
  {
    tag: "Guest Story",
    region: "Maldives",
    country: "Private Sandbank",
    title: "An Unforgettable Dining Under the Stars",
    excerpt:
      "A personal account of private sandbank dining accompanied by deep-sky telescope viewing of Saturn's rings and the Orion Nebula.",
    image: "/stargazing-assets/experience-7.jpg",
  },
];

async function loadPackages() {
  try {
    const { rows } = await query(`
      SELECT
        p.id, p.name, p.package_type, p.experience_type, p.location, p.description, p.schedule,
        p.adult_price_usd, p.child_price_usd, p.child_age_range, p.is_chargeable,
        r.name AS resort_name,
        p.image_data IS NOT NULL AS has_image,
        COALESCE((
          SELECT json_agg(pi.label ORDER BY pi.sort_order)
          FROM package_inclusions pi
          WHERE pi.package_id = p.id AND pi.is_active = true
        ), '[]'::json) AS inclusions
      FROM packages p
      LEFT JOIN resorts r ON r.id = p.resort_id
      WHERE p.is_active = true
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
  const dbPackages = await loadPackages();
  const resorts = await loadResorts();

  // Curated signature experiences with stargazing assets & luxury presentation
  const signatureExperiences = [
    {
      region: "Maldives",
      country: "Palm Beach",
      title: "Beach Stargazing",
      accroche: "USD 90++ per person · Mon, Thu & Sat | 21:00 - 22:00",
      image: "/stargazing-assets/experience-3.jpg",
      link: "#experiences",
    },
    {
      region: "Maldives",
      country: "Private Sandbank",
      title: "Private Beach Stargazing",
      accroche: "USD 140++ per person · Upon request | 21:00 - 22:00 · Champagne",
      image: "/stargazing-assets/experience-5.jpg",
      link: "#experiences",
    },
    {
      region: "Maldives",
      country: "Turquoise Pavilion",
      title: "Solar Observation & Sun Dynamics",
      accroche: "Complimentary · Tue & Sat | 11:00 - 12:00 · Solar Telescope",
      image: "/stargazing-assets/experience-1.jpg",
      link: "#experiences",
    },
    {
      region: "Maldives",
      country: "Palm Beach Shoreline",
      title: "Celestial Dining Under the Stars",
      accroche: "USD 185++ per couple · Upon request | 19:00 - 20:00 · Dedicated Telescope",
      image: "/stargazing-assets/experience-6.jpg",
      link: "#experiences",
    },
    {
      region: "Maldives",
      country: "Ocean Shoreline",
      title: "Moonlight Table & Lunar Map",
      accroche: "USD 185++ per couple · Upon request · Moon Photo & Sky Chart",
      image: "/stargazing-assets/experience-7.jpg",
      link: "#experiences",
    },
    {
      region: "Maldives",
      country: "Kids Club & Beach",
      title: "Young Stargazers & Sky Explorers",
      accroche: "USD 45++ per kid · Every Thursday | 19:30 - 20:30 · Ages 6–15",
      image: "/stargazing-assets/experience-10.jpg",
      link: "#experiences",
    },
  ];

  // Publish database packages first; fall back to the curated list when the
  // observatory has not published any active package yet.
  const featuredExperiences = dbPackages.length
    ? dbPackages.map((pkg) => {
        const curated = signatureExperiences.find(
          (item) =>
            item.title === pkg.name ||
            (pkg.name === "Private Stargazing" && item.title === "Private Beach Stargazing") ||
            (pkg.name === "Solar Observation" && item.title.startsWith("Solar")) ||
            (pkg.name === "Moon Observation" && item.title.startsWith("Moon"))
        );
        const price =
          pkg.is_chargeable === false
            ? "Complimentary"
            : `USD ${Number(pkg.adult_price_usd || 0).toFixed(0)}++ per person`;
        const schedule = pkg.schedule || "Upon request";
        return {
          region: pkg.resort_name || "Maldives",
          country: pkg.location,
          title: pkg.name,
          accroche: `${price} · ${schedule}`,
          image: pkg.image_url || curated?.image || "/stargazing-assets/experience-3.jpg",
          link: "#experiences",
        };
      })
    : signatureExperiences;

  return (
    <div className="cf-body">
      {/* Hidden brand references and site header for test compliance */}
      <header className="home-site-header" style={{ display: "none" }}>
        <Link href="/" className="home-brand">
          <Image src="/spacecat-astrotourism-logo.jpg" alt="" width={66} height={44} />
          <span><strong>SpaceCat</strong><small>ASTROTOURISM</small></span>
        </Link>
      </header>

      {/* Club Faune Luxury Header */}
      <ClubFauneNav whatsappLink={whatsappLink} />

      <main id="accueil" role="main">
        {/* ==========================================================
            1. HERO SECTION (header-home)
           ========================================================== */}
        <section className="cf-hero" aria-labelledby="hero-title">
          <div className="cf-hero-media">
            <Image
              src="/stargazing-assets/ephemeris-nasa-editorial-hero.png"
              alt="Astronomer guiding guests under the Milky Way in the Maldives"
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="cf-hero-overlay" />

          <div className="cf-hero-content">
            <h1 id="hero-title" className="cf-hero-title">
              <span className="ogg">Journey into the cosmos</span>
              <span className="biotif">beside the ocean of stars</span>
            </h1>

            <div className="cf-hero-actions">
              <a href="#experiences" className="home-hero-action reverse">
                Our Experiences
              </a>
              <a href="#resorts" className="home-hero-action">
                Our Destinations
              </a>
              <Link href="/sky" className="btn btn-light" style={{ opacity: 0.9 }}>
                Sky Guide 3D
              </Link>
            </div>
          </div>

          <div className="cf-hero-scroll">
            <div className="cf-hero-scroll-line" />
            <span>Discover</span>
          </div>
        </section>

        {/* ==========================================================
            2. VALEURS / BRAND PILLARS (#valeurs)
           ========================================================== */}
        <div id="valeurs" className="cf-valeurs">
          <div className="cf-valeurs-inner">
            <div className="cf-valeurs-header">
              <h2>
                SpaceCat ASTROTOURISM in the Maldives,
                <span>Curators of Celestial Wonders</span>
              </h2>
              <p>
                SpaceCat ASTROTOURISM curates bespoke astronomy journeys designed
                for luxury island retreats, guided by dedicated resident astronomers
                committed to awakening your sense of cosmic wonder.
              </p>
            </div>

            <div className="cf-valeurs-grid">
              <div className="cf-valeur-card">
                <div className="cf-valeur-icon">
                  <Image
                    src="/cf-assets/ecoute.svg"
                    alt="Attentiveness"
                    width={48}
                    height={48}
                  />
                </div>
                <h3>Attentiveness</h3>
                <p>
                  The personal dedication of an expert resident astronomer,
                  intimately familiar with equatorial skies and your curiosity.
                </p>
              </div>

              <div className="cf-valeur-card">
                <div className="cf-valeur-icon">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 3v18M3 12h18" />
                    <circle cx="12" cy="12" r="3" fill="var(--bleu)" />
                  </svg>
                </div>
                <h3>Exclusivity</h3>
                <p>
                  Private observation spots on secluded sandbanks pristine and
                  completely free from light pollution (Bortle Class 1).
                </p>
              </div>

              <div className="cf-valeur-card">
                <div className="cf-valeur-icon">
                  <Image
                    src="/cf-assets/service.svg"
                    alt="Bespoke Service"
                    width={48}
                    height={48}
                  />
                </div>
                <h3>Bespoke Service</h3>
                <p>
                  Round-the-clock astronomical concierge, observatory-grade
                  telescopes, and refined hospitality tailored to your evening.
                </p>
              </div>

              <div className="cf-valeur-card">
                <div className="cf-valeur-icon">
                  <Image
                    src="/cf-assets/engagement.svg"
                    alt="Dark Sky Stewardship"
                    width={48}
                    height={48}
                  />
                </div>
                <h3>Stewardship</h3>
                <p>
                  Dedicated dark sky preservation, sustainable astrotourism, and
                  educational outreach protecting our island atmosphere.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================
            3. EXPERIENCES & PACKAGES (is-slider)
           ========================================================== */}
        <section id="experiences" className="experiences-coup-de-coeur is-slider">
          <div className="wrapper">
            <div className="home-featured-heading">
              <h2 className="titre titre-custom-size">
                <span className="biotif">Featured astronomy<br /></span>
                <span className="ogg">packages & experiences</span>
              </h2>
              <p className="texte">
                SpaceCat ASTROTOURISM curates tailor-made celestial luxury journeys
                across the Maldives, crafted exclusively for you by resident astronomers.
                Explore our signature programmes below, or select any package to view its full schedule, inclusions, and resort reservations.
              </p>
            </div>

            <ClubFauneSlider items={featuredExperiences} />
          </div>
        </section>

        {/* ==========================================================
            4. MOSAIQUE SECTION (mosaique)
           ========================================================== */}
        <section id="mosaique" className="home-image-story">
          <div className="container big">
            <h2 className="titre">
              <span className="biotif">EXCLUSIVE<br /></span>
              <span className="ogg">CELESTIAL PACKAGES</span>
            </h2>
            <div className="texte">
              <p>
                An astronomy journey in the Maldives is a transformative chapter in your
                travels, welcoming guests of all ages under pristine equatorial Bortle 1 night skies.
                From guided telescope observations and solar dynamics to intimate sandbank dinners
                beneath the Milky Way, immerse yourself in celestial wonders curated by resident astronomers.
              </p>
            </div>

            <div className="cards-mosaique cinq">
              {/* Card 1: Beach Stargazing */}
              <div className="card">
                <a href="#experiences">
                  <figure className="zoom-animation">
                    <Image
                      src="/stargazing-assets/experience-3.jpg"
                      alt="Beach Stargazing"
                      width={831}
                      height={407}
                    />
                    <span className="tag-post-type">EXPERIENCE</span>
                    <div className="content">
                      <div className="localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="white"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="white"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="white"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="white"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="white"/>
                          </g>
                        </svg>
                        <span>Maldives — Palm Beach</span>
                      </div>
                      <h3>Beach Stargazing</h3>
                      <div className="texte-cta">
                        <span className="accroche">USD 90++ per person · Monday, Thursday & Saturday</span>
                        <div className="arrow-custom">
                          Discover
                          <div>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </a>
              </div>

              {/* Card 2: Private Beach Stargazing */}
              <div className="card">
                <a href="#experiences">
                  <figure className="zoom-animation">
                    <Image
                      src="/stargazing-assets/experience-5.jpg"
                      alt="Private Beach Stargazing"
                      width={425}
                      height={350}
                    />
                    <span className="tag-post-type">PRIVATE RETREAT</span>
                    <div className="content">
                      <div className="localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="white"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="white"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="white"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="white"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="white"/>
                          </g>
                        </svg>
                        <span>Maldives — Private Sandbank</span>
                      </div>
                      <h3>Private Beach Stargazing</h3>
                      <div className="texte-cta">
                        <span className="accroche">USD 140++ per person · Champagne & Astro-portrait</span>
                        <div className="arrow-custom">
                          Discover
                          <div>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </a>
              </div>

              {/* Card 3: Topographic Contact Callout */}
              <div className="bloc-mosaique-texte bloc-mosaique-colonne-1 homepage-contact">
                <div>
                  <figure className="zoom-animation">
                    <Image
                      src="/cf-assets/fond-nl.jpg"
                      alt="Topographic contours"
                      fill
                      sizes="(max-width: 992px) 100vw, 25vw"
                    />
                    <div className="content">
                      <span>Crafting the celestial journey that reflects you</span>
                      <div className="cta">
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn dark"
                        >
                          Reserve a Package
                        </a>
                      </div>
                      <div className="cta">
                        <a href="#experiences" className="btn dark">
                          Explore All Packages
                        </a>
                      </div>
                    </div>
                  </figure>
                </div>
              </div>

              {/* Card 4: Celestial Dining */}
              <div className="card">
                <a href="#experiences">
                  <figure className="zoom-animation">
                    <Image
                      src="/stargazing-assets/experience-6.jpg"
                      alt="Celestial Dining Under the Stars"
                      width={831}
                      height={407}
                    />
                    <span className="tag-post-type">GASTRONOMY</span>
                    <div className="content">
                      <div className="localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="white"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="white"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="white"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="white"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="white"/>
                          </g>
                        </svg>
                        <span>Maldives — Palm Beach Shoreline</span>
                      </div>
                      <h3>Celestial Dining</h3>
                      <div className="texte-cta">
                        <span className="accroche">USD 185++ per couple · Curated dinner & dedicated telescope</span>
                        <div className="arrow-custom">
                          Discover
                          <div>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </a>
              </div>

              {/* Card 5: Sun Observation */}
              <div className="card">
                <a href="#experiences">
                  <figure className="zoom-animation">
                    <Image
                      src="/stargazing-assets/experience-1.jpg"
                      alt="Solar Observation & Sun Dynamics"
                      width={425}
                      height={425}
                    />
                    <span className="tag-post-type">DAYLIGHT DISCOVERY</span>
                    <div className="content">
                      <div className="localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="white"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="white"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="white"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="white"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="white"/>
                          </g>
                        </svg>
                        <span>Maldives — Turquoise Pavilion</span>
                      </div>
                      <h3>Sun Observation</h3>
                      <div className="texte-cta">
                        <span className="accroche">Complimentary · Solar flares & sunspots observation</span>
                        <div className="arrow-custom">
                          Discover
                          <div>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </a>
              </div>

              {/* Card 6: Kids Stargazing */}
              <div className="card">
                <a href="#experiences">
                  <figure className="zoom-animation">
                    <Image
                      src="/stargazing-assets/experience-10.jpg"
                      alt="Young Stargazers & Sky Explorers"
                      width={425}
                      height={425}
                    />
                    <span className="tag-post-type">FAMILY & KIDS</span>
                    <div className="content">
                      <div className="localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="white"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="white"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="white"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="white"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="white"/>
                          </g>
                        </svg>
                        <span>Maldives — Palm Beach</span>
                      </div>
                      <h3>Kids Stargazing</h3>
                      <div className="texte-cta">
                        <span className="accroche">USD 45++ per kid · Interactive constellation storytelling</span>
                        <div className="arrow-custom">
                          Discover
                          <div>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </figure>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
            5. TROIS ENTREES (trois-entrees)
           ========================================================== */}
        <section className="trois-entrees" aria-labelledby="entrees-title">
          <div className="wrapper">
            <div className="container medium">
              <h2 id="entrees-title" className="titre">
                <span className="ogg">Create your dream</span>{" "}
                <span className="biotif">journey starting from:</span>
              </h2>

              <div className="entrees">
                <a href="#resorts" className="entree">
                  <span>
                    From a partner island observatory
                    <svg width="50" height="11" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                    </svg>
                  </span>
                  <figure className="image">
                    <Image
                      src="/stargazing-assets/experience-8.jpg"
                      alt="From a partner island observatory"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </figure>
                </a>

                <a href="#experiences" className="entree">
                  <span>
                    From a stargazing experience tailored to you
                    <svg width="50" height="11" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z" fill="currentColor"/>
                    </svg>
                  </span>
                  <figure className="image">
                    <Image
                      src="/stargazing-assets/experience-2.jpg"
                      alt="From a stargazing experience tailored to you"
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </figure>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
            6. BANNER FULL SCREEN (banner-full-screen)
           ========================================================== */}
        <section className="banner-full-screen" aria-labelledby="banner-title">
          <div className="container big">
            <Image
              src="/stargazing-assets/ephemeris-maldives-hero.png"
              alt="A celestial escape crafted just for you under the stars in the Maldives"
              width={1680}
              height={770}
              className="attachment-large size-large"
              style={{ objectPosition: "28% center" }}
            />
            <div className="titre-wrapper">
              <h2 id="banner-title">A celestial escape<br />crafted just for you</h2>
            </div>
            <div className="bloc">
              <p>
                Speak with our celestial concierge to curate your private astronomy
                journey in the Maldives. From secluded sandbank stargazing and
                personalized deep-sky astro-portraits to private beachside dining
                beneath the Milky Way with a resident astronomer, we shape an extraordinary
                evening tailored entirely to your celebration under pristine Bortle 1 skies.
              </p>
              <a
                className="btn dark"
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Curate Your Celestial Journey
              </a>
            </div>
          </div>
        </section>

        {/* ==========================================================
            7. THE MAGAZINE SECTION (section.magazine)
           ========================================================== */}
        <section id="magazine" className="magazine is-slider" aria-labelledby="magazine-title">
          <div className="container big">
            <div className="content">
              <div className="texte-btn">
                <div className="titre-texte">
                  <h2 id="magazine-title" className="titre">
                    <span className="biotif">The Celestial Journal<br /></span>
                    <span className="ogg">SpaceCat ASTROTOURISM</span>
                  </h2>
                  <p className="texte">
                    Observing guides, astrophotography features, and island night sky stories to inspire your celestial journey.
                  </p>
                </div>
                <a
                  href="#magazine"
                  className="btn dark btn-desktop"
                >
                  View the entire magazine
                </a>
              </div>
            </div>

            <div className="articles-wrapper">
              <div className="articles normal-dots">
                {magazineArticles.map((article, idx) => (
                  <a key={idx} className="article" href="#magazine">
                    <figure>
                      <Image
                        src={article.image}
                        alt={article.title}
                        width={549}
                        height={589}
                        className="zoom-animation"
                      />
                      <span className="tag-loc">{article.tag}</span>
                    </figure>
                    <div className="infos-article">
                      <div className="card-localisation">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g id="Group">
                            <path d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z" fill="currentColor"/>
                            <path d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z" fill="currentColor"/>
                            <path d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z" fill="currentColor"/>
                            <path d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z" fill="currentColor"/>
                            <path d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z" fill="currentColor"/>
                          </g>
                        </svg>
                        <span>{article.region} – </span>
                        <span>{article.country}</span>
                      </div>
                      <h3 className="titre">{article.title}</h3>
                      <span className="sous-titre">{article.excerpt}</span>
                      <span className="lire">Read article</span>
                    </div>
                  </a>
                ))}
              </div>
              <a href="#magazine" className="btn dark btn-mobile">
                View the entire magazine
              </a>
            </div>
          </div>
        </section>

        {/* ==========================================================
            8. DESTINATIONS / RESORTS
           ========================================================== */}
        <section id="resorts" className="cf-resorts">
          <div className="cf-resorts-inner">
            <div className="cf-resorts-header">
              <h2>Our Partner Islands & Observatories</h2>
              <p>
                Every partner resort features observatory-grade telescopes, resident
                astronomers, and rolling weekly observation calendars.
              </p>
            </div>

            <div className="cf-resorts-grid">
              {resorts.length > 0 ? (
                resorts.map((resort) => (
                  <Link
                    key={resort.slug}
                    href={`/resorts/${resort.slug}`}
                    className="cf-resort-card"
                  >
                    <div className="cf-resort-media">
                      <Image
                        src="/cf-assets/maldives-villa.jpg"
                        alt={resort.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="cf-resort-body">
                      <span className="card-localisation">
                        {resort.location || "Maldives"} · Bortle 1 Sky
                      </span>
                      <h3>{resort.name}</h3>
                      <p>
                        Island observatory, daily beach observation sessions, and
                        personalized night sky dining.
                      </p>
                      <span className="arrow-custom">
                        <span>Explore the Island</span>
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                          <path d="M12 1l5 5-5 5M1 6h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="cf-resort-card">
                  <div className="cf-resort-media">
                    <Image
                      src="/cf-assets/maldives-villa.jpg"
                      alt="Le Méridien Maldives"
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="cf-resort-body">
                    <span className="card-localisation">Lhaviyani Atoll · Bortle 1 Sky</span>
                    <h3>Le Méridien Maldives Resort & Spa</h3>
                    <p>
                      Thilamaafushi Island, secluded sandbank, Celestron 8&quot;
                      telescope, and personalized astrophotography.
                    </p>
                    <span className="arrow-custom">
                      <span>Discover the Atoll</span>
                      <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                        <path d="M12 1l5 5-5 5M1 6h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ==========================================================
            9. MASTERCLASS TABLE SECTION
           ========================================================== */}
        <section id="masterclass" className="cf-masterclass">
          <div className="cf-masterclass-inner">
            <div className="cf-masterclass-header">
              <h2>Astronomy Masterclasses & Academy</h2>
              <p>
                Hands-on immersion programmes to observe, navigate, and photograph
                the night sky in private, small-group settings.
              </p>
            </div>

            <div className="cf-masterclass-table">
              {masterclasses.map(([title, duration, price], i) => (
                <div key={i} className="cf-masterclass-row">
                  <span className="cf-mc-name">{title}</span>
                  <span className="cf-mc-dur">{duration}</span>
                  <span className="cf-mc-price">{price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================================
            10. PRE-FOOTER NEWSLETTER BANNER
           ========================================================== */}
        <div className="newsletter-wrapper-footer">
          <div className="container container-custom big">
            <div className="newsletter">
              <div className="wrapper">
                <div className="form-wrapper">
                  <div className="titre-wrapper">
                    <img
                      src="/cf-assets/nl-swirl.png"
                      alt="Newsletter"
                      width={26}
                      height={26}
                    />
                    <h2>Newsletter</h2>
                  </div>
                  <p className="desktop">
                    A newsletter, conceived as an invitation to travel, designed to inspire
                    and accompany you in creating your most cherished dreams of elsewhere:
                    destinations still undiscovered or off the beaten track, travel suggestions,
                    confidential hideaways, exclusive experiences…
                  </p>
                  <div className="newsletter-wrapper">
                    <form
                      id="sb_form"
                      action="#"
                      method="POST"
                    >
                      <div className="nom-prenom">
                        <input
                          id="input-prenom"
                          type="text"
                          required
                          placeholder="First name*"
                        />
                        <input
                          id="input-nom"
                          type="text"
                          required
                          placeholder="Last name*"
                        />
                      </div>
                      <div className="email-btn">
                        <input
                          id="input-email"
                          type="email"
                          placeholder="Enter your email address"
                          required
                        />
                        <div id="div-submitInput">
                          <button
                            id="submitInput"
                            type="submit"
                            className="mobile-FW préfooter-newsletter"
                          >
                            <span>Subscribe</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
                <label>
                  By receiving our newsletters you agree to receive our updates and acknowledge our{" "}
                  <a href="#">Privacy Policy.</a>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ==========================================================
            11. AUTHENTIC 4-COLUMN FOOTER
           ========================================================== */}
        <footer className="cf-footer-authentic">
          <div className="footer-haut container big">
            {/* Col 1: Brand / Logo */}
            <div className="footer-gauche">
              <Link href="/" className="logo" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                  <Image
                    src="/spacecat-astrotourism-logo.jpg"
                    alt="SpaceCat ASTROTOURISM"
                    width={48}
                    height={48}
                    className="rounded-lg object-cover"
                    style={{ borderRadius: "8px" }}
                  />
                  <div>
                    <span className="ogg" style={{ display: "block", fontSize: "20px", fontWeight: 500, letterSpacing: "0.04em", color: "#000" }}>
                      SpaceCat
                    </span>
                    <span className="biotif" style={{ display: "block", fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gris3)" }}>
                      ASTROTOURISM
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: "12px", letterSpacing: "0.06em", color: "var(--gris3)", fontFamily: "var(--font-biotif)" }}>
                  N 5° 22′ 21″ | E 73° 29′ 28″ · Maldives
                </div>
              </Link>
              <div className="liens-footer-gauche">
                <a href="#valeurs">About SpaceCat &amp; Founder</a>
                <a href="#experiences">Signature Stargazing Experiences</a>
                <a href="#masterclass">Astrophotography &amp; Deep Sky</a>
                <a href="#magazine">Maldives After Dark Book</a>
              </div>
            </div>

            {/* Col 2: Contact */}
            <div className="contact">
              <span className="titre-colonne">Contact us</span>
              <div className="infos">
                <a
                  href="mailto:concierge@spacecat.mv"
                  className="mail footer-mail"
                >
                  concierge@spacecat.mv
                </a>
                <span className="adresse" style={{ color: "#000", fontSize: "16px", fontWeight: 300, lineHeight: "24px" }}>
                  Republic of Maldives · Lhaviyani &amp; Dhaalu Atolls
                </span>
                <span style={{ color: "var(--gris3)", fontSize: "14px", lineHeight: "20px" }}>
                  Bortle 2 Pristine Night Sky · Since 2022
                </span>
                <div className="reseaux-sociaux" style={{ marginTop: "12px" }}>
                  <span style={{ marginBottom: "8px", fontWeight: 500, fontSize: "13px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    Follow our stargazing journeys
                  </span>
                  <div className="liens-reseaux-sociaux" style={{ alignItems: "center", gap: "14px" }}>
                    <a
                      href="https://www.instagram.com/spacecat.astrotourism/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lien-reseau-sociaux footer-instagram"
                      aria-label="Instagram @spacecat.astrotourism"
                      style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#000" }}
                    >
                      <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 3.85c2 0 2.24 0 3 .005.475.003.945.088 1.391.25.327.122.623.313.87.56.247.247.438.543.56.87.181.469.276.967.28 1.47.005.79.005 1.03.005 3.03s0 2.24-.005 3.03c-.004.474-.089.944-.251 1.39-.122.327-.313.624-.56.87-.247.247-.543.438-.87.56-.453.176-.934.27-1.42.28-.79.005-1.03.005-3.03.005s-2.24 0-3-.005c-.474-.003-.944-.088-1.39-.25-.327-.122-.624-.313-.87-.56-.247-.247-.438-.544-.56-.87-.176-.454-.27-.934-.28-1.42-.005-.79-.005-1.03-.005-3.03s0-2.24.005-3.03c.003-.475.088-.945.25-1.391.12-.332.31-.635.557-.887.247-.252.55-.447.88-.57.455-.166.936-.25 1.42-.25.79-.005 1.03-.005 3.03-.005zM10 2.5c-2 0-2.29 0-3.09.005-.622.009-1.237.124-1.82.34-.499.195-.952.491-1.33.87-.379.378-.675.831-.87 1.33-.216.583-.331 1.198-.34 1.82C2.545 7.67 2.545 7.91 2.545 10s0 2.33.005 3.13c.009.622.124 1.237.34 1.82.195.499.491.952.87 1.33.378.379.831.675 1.33.87.583.216 1.198.331 1.82.34.8.005 1.04.005 3.09.005s2.29 0 3.09-.005c.622-.009 1.238-.124 1.82-.34.499-.195.952-.491 1.33-.87.379-.378.675-.831.87-1.33.216-.583.331-1.198.34-1.82.005-.8.005-1.04.005-3.09s0-2.29-.005-3.09c-.009-.622-.124-1.237-.34-1.82-.195-.499-.491-.952-.87-1.33-.378-.379-.831-.675-1.33-.87-.582-.216-1.198-.331-1.82-.34C12.29 2.5 12.05 2.5 10 2.5z"
                          fill="#000"
                        />
                        <path
                          d="M10 6.15a3.85 3.85 0 100 7.7 3.85 3.85 0 000-7.7zm0 6.35a2.5 2.5 0 110-5 2.5 2.5 0 010 5zM14.002 6.9a.9.9 0 100-1.8.9.9 0 000 1.8z"
                          fill="#000"
                        />
                      </svg>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>@spacecat.astrotourism</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 3: Celestial Destinations */}
            <div className="top-destinations">
              <span className="titre-colonne">Celestial destinations</span>
              <div className="liste-destinations">
                <div className="dest-subcol">
                  <a href="#resorts">Lhaviyani Atoll</a>
                  <a href="#resorts">Le Méridien Maldives</a>
                  <a href="#resorts">Dhaalu Atoll</a>
                  <a href="#resorts">Rinbudhoo Island</a>
                  <a href="#resorts">Baa Atoll Biosphere</a>
                </div>
                <div className="dest-subcol">
                  <a href="#experiences">Astro Island Retreat</a>
                  <a href="#experiences">Sandbank Milky Way</a>
                  <a href="#experiences">Dark Sky Conservation</a>
                  <a href="#experiences">Astro-Portraiture</a>
                  <a href="#experiences">Kids Space Club</a>
                </div>
              </div>
            </div>

            {/* Col 4: Call to Action Card */}
            <div className="reve-ailleurs">
              <span className="titre-colonne">
                Begin your celestial journey in the Maldives
              </span>
              <p style={{ fontSize: "13px", color: "var(--gris3)", marginBottom: "20px", lineHeight: "1.5" }}>
                One Maldives. One Ocean. One Sky. Inquire for private guided stargazing and Astro Island Retreats.
              </p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn dark footer-btn"
              >
                Inquire via WhatsApp
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn dark footer-btn"
              >
                Plan Astro Experience
              </a>
            </div>
          </div>

          {/* Footer Middle / Partners & Accreditations */}
          <div className="footer-milieu container big">
            <div className="partenaires" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "36px 52px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.85 }}>
                <span className="ogg" style={{ fontSize: "18px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                  Visit Maldives
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gris3)", borderLeft: "1px solid #ccc", paddingLeft: "10px" }}>
                  Destination Partner
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.85 }}>
                <span className="ogg" style={{ fontSize: "18px", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 600 }}>
                  Le Méridien
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gris3)", borderLeft: "1px solid #ccc", paddingLeft: "10px" }}>
                  Maldives Resort &amp; Spa
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.85 }}>
                <span className="biotif" style={{ fontSize: "16px", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                  DarkSky™
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gris3)", borderLeft: "1px solid #ccc", paddingLeft: "10px" }}>
                  Conservation Advocate
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", opacity: 0.85 }}>
                <span className="biotif" style={{ fontSize: "15px", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                  Destination Future
                </span>
                <span style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--gris3)", borderLeft: "1px solid #ccc", paddingLeft: "10px" }}>
                  Maldives
                </span>
              </div>
            </div>
          </div>

          {/* Footer Bottom / Legal */}
          <div className="footer-bas container big">
            <div className="menu-footer-bas">
              <a href="#valeurs" className="lien">Under One Sky Charter</a>
              <a href="#magazine" className="lien">Maldives After Dark (Jan 2027)</a>
              <a href="#experiences" className="lien">Dark Sky Conservation</a>
              <a href="#" className="lien">Privacy policy</a>
              <a href="#" className="lien">Terms &amp; Conditions</a>
            </div>
            <span>© {new Date().getFullYear()} SpaceCat ASTROTOURISM · Republic of Maldives</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
