'use client';

import Image from 'next/image';
import { useState } from 'react';

const experiences = [
  {
    title: 'Sun Observation',
    image: '/stargazing-assets/experience-1.jpg',
    schedule: 'Every Tuesday & Saturday | 11:00 - 12:00',
    price: 'Complimentary',
    venue: 'Turquoise - Private Dining Room',
    includes: 'Photo of the sun',
    description: 'Experience the dynamic beauty and complexity of our nearest star during a Solar Observation session. Our astronomer will guide you through the captivating world of solar dynamics, the life cycle of sunspots, and their profound impact on Earth.',
  },
  {
    title: 'Beach Stargazing',
    image: '/stargazing-assets/experience-3.jpg',
    schedule: 'Monday, Thursday & Saturday | 21:00 - 22:00',
    price: '$90++ per person',
    venue: 'Palm Beach',
    includes: 'Beverages',
    description: 'Immerse yourself in a celestial journey with an evening of beach stargazing. Settle into comfortable lounge seating under the vast night sky as our astronomer guides you through the timeless mysteries of the cosmos. End the experience with a portrait beneath the stars as a unique keepsake.',
  },
  {
    title: 'Private Beach Stargazing',
    image: '/stargazing-assets/experience-5.jpg',
    schedule: 'Upon request | 21:00 - 22:00',
    price: '$140++ per person',
    venue: 'Palm Beach',
    includes: 'Beverages and astro-portrait',
    description: 'Step into an intimate beachside stargazing experience, where the quiet rhythm of the ocean meets the brilliance of the night sky. Guided by our resident astronomer, uncover the stories behind the constellations and gain insight into the celestial wonders above.',
  },
  {
    title: 'Celestial Dining',
    image: '/stargazing-assets/experience-6.jpg',
    schedule: 'Upon request | 19:00 - 20:00',
    price: '$185++ per couple',
    venue: 'Palm Beach',
    includes: 'Astro-portrait',
    description: 'Indulge in a curated dining experience beneath the stars, where fine cuisine meets the quiet majesty of the night sky. As you dine, our resident astronomer will guide you through the constellations using a professional telescope, unveiling the celestial wonders above.',
  },
  {
    title: 'Moonlight Table',
    image: '/stargazing-assets/experience-7.jpg',
    schedule: 'Upon request',
    price: '$185++ per couple',
    venue: 'By the shore',
    includes: 'Moon photo and personalised night sky map',
    description: 'Savour an elegant culinary experience by the shore, set beneath the soft glow of the moon and the gentle rhythm of waves. Learn about the moon surface and phases, then receive a personalised sky map and photograph marked with the date and time of your moonlit evening.',
  },
  {
    title: 'Kids Stargazing',
    image: '/stargazing-assets/experience-10.jpg',
    schedule: 'Every Thursday | 19:30 - 20:30',
    price: '$45++ per kid',
    venue: 'Palm Beach',
    includes: 'Kids aged 6 - 15 years old',
    description: 'Calling young explorers to join our astronomer for a fun and interactive evening where the night sky comes to life through stories, shapes, and imagination. With guided telescope viewing and simple explanations of stars and planets, this experience is designed to spark curiosity and wonder.',
  },
];

const whatsappLink = 'https://wa.me/6285179546466?text=Halo%2C%20saya%20ingin%20bertanya%20tentang%20Stargazing%20Experience%20di%20Le%20Meridien%20Maldives.';

function formatUsd(value) {
  return `$${Number(value || 0).toFixed(2)}++`;
}

function packagePrice(pkg) {
  const prices = [`Adult ${formatUsd(pkg.adult_price_usd)}`];
  if (pkg.child_price_usd !== null) prices.push(`Child ${formatUsd(pkg.child_price_usd)}`);
  return prices.join(' / ');
}

function packageToExperience(pkg) {
  const staticExperience = experiences.find((item) => item.title === pkg.name);
  const price = packagePrice(pkg);

  return {
    ...(staticExperience || {}),
    title: pkg.name,
    image: pkg.image_url || staticExperience?.image || '/stargazing-assets/experience-3.jpg',
    schedule: staticExperience?.schedule || 'Upon request',
    price,
    venue: pkg.location,
    includes: pkg.child_age_range || staticExperience?.includes || pkg.experience_type,
    description: pkg.description || staticExperience?.description || `${pkg.name} package at ${pkg.location}.`,
  };
}

export default function StargazingExperienceShowcase({ packages = [] }) {
  const displayExperiences = packages.length ? packages.map(packageToExperience) : experiences;
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selected = selectedIndex === null ? null : displayExperiences[selectedIndex];

  if (selected) {
    return (
      <div className="experience-stage">
        <button className="experience-back" type="button" onClick={() => setSelectedIndex(null)}>
          Back to all experiences
        </button>

        <div className="experience-feature">
          <div className="experience-feature-image">
            <Image src={selected.image} alt={selected.title} fill sizes="(max-width: 1000px) 100vw, 56vw" />
          </div>

          <article className="experience-feature-copy">
            <div className="flyer-rule" />
            <p className="stargazing-kicker">Selected experience</p>
            <h3>{selected.title}</h3>
            <p>{selected.description}</p>

            <div className="experience-facts">
              <div>
                <span>Schedule</span>
                <strong>{selected.schedule}</strong>
              </div>
              <div>
                <span>Venue</span>
                <strong>{selected.venue}</strong>
              </div>
              <div>
                <span>Including</span>
                <strong>{selected.includes}</strong>
              </div>
              <div>
                <span>Price</span>
                <strong>{selected.price}</strong>
              </div>
            </div>

            <p className="experience-smallprint">
              Reservation required. Price is subject to 10% service charge and 17% GST where applicable.
            </p>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="stargazing-button">
              Ask via WhatsApp
            </a>
          </article>
        </div>

        <div className="experience-picker" aria-label="Choose another experience">
          {displayExperiences.map((item, index) => (
            <button
              className={index === selectedIndex ? 'active' : ''}
              key={item.title}
              type="button"
              onClick={() => setSelectedIndex(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="experience-grid">
      {displayExperiences.map((item, index) => (
        <button className="experience-card" key={item.title} type="button" onClick={() => setSelectedIndex(index)}>
          <span className="experience-image">
            <Image src={item.image} alt={item.title} fill sizes="(max-width: 900px) 100vw, 33vw" />
          </span>
          <span className="experience-copy">
            <span className="flyer-rule" />
            <span className="experience-title">{item.title}</span>
            <span className="experience-schedule">{item.schedule}</span>
            <span>{item.includes}. Location: {item.venue}.</span>
            <strong>{item.price}</strong>
            <span className="experience-toggle">Open experience</span>
          </span>
        </button>
      ))}
    </div>
  );
}
