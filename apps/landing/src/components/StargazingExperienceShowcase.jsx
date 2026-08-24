'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { buildLandingExperiences } from '@/lib/packagePresentation';

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

const defaultWhatsappLink = 'https://wa.me/6285179546466?text=Hello%2C%20I%20would%20like%20to%20ask%20about%20a%20stargazing%20experience.';

export default function StargazingExperienceShowcase({ packages = [], contactLink = defaultWhatsappLink }) {
  const displayExperiences = buildLandingExperiences(packages, experiences);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const selected = selectedIndex === null ? null : displayExperiences[selectedIndex];

  useEffect(() => {
    if (displayExperiences.length < 2 || selectedIndex !== null) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSlideDirection('next');
      setActiveIndex((current) => (current + 1) % displayExperiences.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [displayExperiences.length, selectedIndex]);

  function openExperience(index) {
    setActiveIndex(index);
    setSelectedIndex(index);
  }

  if (!displayExperiences.length) {
    return <div className="stargazing-note"><p>No active packages are currently published.</p></div>;
  }

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
            <a href={contactLink} target="_blank" rel="noopener noreferrer" className="stargazing-button">
              Contact resort
            </a>
          </article>
        </div>

        <div className="experience-picker" aria-label="Choose another experience">
          {displayExperiences.map((item, index) => (
            <button
              className={index === selectedIndex ? 'active' : ''}
              key={`${item.title}-${index}`}
              type="button"
              onClick={() => openExperience(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label="Stargazing package carousel"
      aria-roledescription="carousel"
      className="experience-carousel"
      role="region"
    >
      <div className="experience-carousel-viewport">
        {displayExperiences.map((item, index) => {
          const outgoingIndex = slideDirection === 'next'
            ? (activeIndex - 1 + displayExperiences.length) % displayExperiences.length
            : (activeIndex + 1) % displayExperiences.length;
          const slideState = index === activeIndex
            ? 'is-active'
            : index === outgoingIndex
              ? slideDirection === 'next' ? 'is-before' : 'is-after'
              : slideDirection === 'next' ? 'is-after' : 'is-before';

          return (
            <button
              aria-hidden={index !== activeIndex}
              aria-label={`Open details for ${item.title}`}
              className={`experience-slide ${slideState}`}
              key={`${item.title}-${index}`}
              onClick={() => openExperience(index)}
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
            >
              <Image src={item.image} alt="" fill sizes="(max-width: 768px) 100vw, 1400px" />
              <span className="experience-slide-shade" />
              <span className="experience-slide-copy">
                <span className="experience-slide-title">{item.title}</span>
                <span className="experience-slide-schedule">{item.schedule}</span>
                <span className="experience-slide-footer">
                  <strong>{item.price}</strong>
                  <span>View details</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {displayExperiences.length > 1 && (
        <div className="experience-carousel-controls">
          <button
            aria-label="Show previous experience"
            type="button"
            onClick={() => {
              setSlideDirection('previous');
              setActiveIndex((current) => (current - 1 + displayExperiences.length) % displayExperiences.length);
            }}
          >
            Previous
          </button>
          <p>
            <strong>{displayExperiences[activeIndex].title}</strong>
            <span>{activeIndex + 1} of {displayExperiences.length}</span>
          </p>
          <button
            aria-label="Show next experience"
            type="button"
            onClick={() => {
              setSlideDirection('next');
              setActiveIndex((current) => (current + 1) % displayExperiences.length);
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
