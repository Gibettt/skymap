"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function eventTypeLabel(value) {
  return String(value || "Celestial event")
    .split(/[_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function eventDateParts(event) {
  const date = new Date(event.starts_at);
  const timeZone = event.resort_timezone || "Indian/Maldives";
  return {
    day: new Intl.DateTimeFormat("en-GB", { day: "2-digit", timeZone }).format(date),
    month: new Intl.DateTimeFormat("en-GB", { month: "short", timeZone }).format(date).toUpperCase(),
    full: new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    }).format(date),
  };
}

export default function UpcomingEventsCarousel({ events }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (events.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % events.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [events.length]);

  function finishSwipe(clientX) {
    if (touchStartX.current == null || events.length < 2) return;
    const distance = clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(distance) < 45) return;
    setActiveIndex((current) => (
      distance < 0
        ? (current + 1) % events.length
        : (current - 1 + events.length) % events.length
    ));
  }

  return (
    <div
      className="cf-upcoming-events-carousel"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        finishSwipe(event.changedTouches[0]?.clientX ?? 0);
      }}
      aria-roledescription="carousel"
      aria-label="Upcoming celestial events"
    >
      <div className="cf-upcoming-events-viewport">
        <div
          className="cf-upcoming-events-track"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {events.map((event, index) => {
            const date = eventDateParts(event);
            const price = event.price_override_usd ?? event.adult_price_usd;
            return (
              <div
                className="cf-upcoming-event-slide"
                key={event.id}
                aria-hidden={index !== activeIndex}
                inert={index !== activeIndex ? "" : undefined}
              >
                <Link
                  href={`/resorts/${event.resort_slug}#upcoming-events-title`}
                  className="cf-upcoming-event-card"
                  tabIndex={index === activeIndex ? 0 : -1}
                >
                  <div className="cf-upcoming-event-media">
                    <Image
                      src={event.image_url}
                      alt={event.has_image ? event.title : "Celestial event above the Maldives"}
                      fill
                      unoptimized
                      sizes="(max-width: 900px) 100vw, 62vw"
                      priority={index === 0}
                    />
                    <div className="cf-upcoming-event-shade" />
                    <div className="cf-upcoming-event-date" aria-label={date.full}>
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </div>
                    <span className="cf-upcoming-event-type">{eventTypeLabel(event.event_type)}</span>
                  </div>

                  <div className="cf-upcoming-event-content">
                    <div className="cf-upcoming-event-location">
                      <span>{event.resort_location || "Maldives"}</span>
                      <span aria-hidden="true">•</span>
                      <span>{event.resort_name}</span>
                    </div>
                    <h3>{event.title}</h3>
                    <time dateTime={event.starts_at}>{date.full}</time>
                    {event.description && <p>{event.description}</p>}
                    <div className="cf-upcoming-event-meta">
                      <span>{event.observation_spot || event.package_name || "Resort observatory"}</span>
                      <strong>{price == null ? "Contact resort" : `From USD ${Number(price).toFixed(0)}`}</strong>
                    </div>
                    <span className="cf-upcoming-event-cta">
                      Explore event <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cf-upcoming-events-controls">
        <div className="cf-upcoming-events-dots" aria-label="Choose event slide">
          {events.map((event, index) => (
            <button
              type="button"
              key={event.id}
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show event ${index + 1}: ${event.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
            >
              <span />
            </button>
          ))}
        </div>
        <p aria-live="polite">
          <strong>{String(activeIndex + 1).padStart(2, "0")}</strong>
          <span>/</span>
          <span>{String(events.length).padStart(2, "0")}</span>
        </p>
      </div>
    </div>
  );
}
