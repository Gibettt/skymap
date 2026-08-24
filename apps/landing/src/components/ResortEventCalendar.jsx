'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

function eventPrice(event) {
  const price = event.price_override_usd ?? event.adult_price_usd;
  return price == null ? 'Contact resort' : `USD ${Number(price).toFixed(2)}`;
}

export default function ResortEventCalendar({ resortName, timeZone, events }) {
  const [reminder, setReminder] = useState(null);

  useEffect(() => {
    if (events.length === 0) return;
    const key = `event-reminder:${resortName}`;
    if (sessionStorage.getItem(key)) return;
    const timer = setTimeout(() => setReminder({ event: events[0], key }), 0);
    return () => clearTimeout(timer);
  }, [events, resortName]);

  function dismissReminder() {
    if (reminder) sessionStorage.setItem(reminder.key, 'dismissed');
    setReminder(null);
  }

  return (
    <>
      <div className="resort-event-grid">
        {events.map((event) => (
          <article className="resort-event-card" key={event.id}>
            {event.image_url && <Image src={event.image_url} alt="" width={640} height={360} unoptimized />}
            <p className="stargazing-kicker">{event.event_type} · {event.status}</p>
            <h3>{event.title}</h3>
            <time dateTime={event.starts_at}>
              {new Intl.DateTimeFormat('en-GB', {
                timeZone, dateStyle: 'medium', timeStyle: 'short',
              }).format(new Date(event.starts_at))}
            </time>
            {event.observation_spot && <p>Location: {event.observation_spot}</p>}
            {event.description && <p>{event.description}</p>}
            <strong>{eventPrice(event)}</strong>
            {event.capacity && <small>Capacity: {event.capacity} guests</small>}
          </article>
        ))}
      </div>

      {reminder && (
        <div className="event-reminder" role="dialog" aria-modal="true" aria-labelledby="event-reminder-title">
          <button type="button" aria-label="Close reminder" onClick={dismissReminder}>×</button>
          <p className="stargazing-kicker">Upcoming at {resortName}</p>
          <h2 id="event-reminder-title">{reminder.event.title}</h2>
          <p>Available in the next 7 days. Ask the resort team to reserve your place.</p>
        </div>
      )}
    </>
  );
}
