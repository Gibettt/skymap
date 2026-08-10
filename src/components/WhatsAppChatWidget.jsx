'use client';

import { useState } from 'react';

// TODO: replace with real WhatsApp number, format: country code + number, no + or leading 0 (e.g. "628123456789")
const WHATSAPP_NUMBER = '6285179546466';
const DEFAULT_MESSAGE = 'Halo, saya ingin bertanya tentang Stargazing Experience di Le Meridien Maldives.';

export default function WhatsAppChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  const numberReady = WHATSAPP_NUMBER.trim().length > 0;

  return (
    <div className="wa-widget">
      {open && (
        <div className="wa-panel">
          <div className="wa-panel-head">
            <span>Chat Staff</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup chat">
              &times;
            </button>
          </div>
          <p className="wa-panel-copy">
            Ada pertanyaan seputar reservasi atau experience? Kirim pesan ke staff kami via WhatsApp.
          </p>
          <textarea
            className="wa-panel-textarea"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={3}
          />
          {numberReady ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-panel-button"
            >
              Kirim ke WhatsApp
            </a>
          ) : (
            <span className="wa-panel-button wa-panel-button-disabled">
              Nomor WhatsApp belum diatur
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        className="wa-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label="Chat staff via WhatsApp"
      >
        <svg viewBox="0 0 32 32" width="28" height="28" fill="currentColor" aria-hidden="true">
          <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.677 4.523 1.847 6.36L4 29l7.84-1.816A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.7a9.66 9.66 0 0 1-4.93-1.35l-.353-.21-4.653 1.077 1.088-4.535-.23-.366A9.63 9.63 0 0 1 5.3 15c0-5.905 4.8-10.7 10.704-10.7 5.904 0 10.7 4.795 10.7 10.7s-4.796 10.7-10.7 10.7Zm5.86-8.02c-.32-.16-1.892-.933-2.185-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-1.014 1.253-.187.213-.373.24-.693.08-.32-.16-1.352-.498-2.576-1.588-.952-.85-1.595-1.9-1.782-2.22-.187-.32-.02-.493.14-.653.144-.144.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.987-2.373-.26-.626-.524-.54-.72-.55l-.613-.01c-.213 0-.56.08-.853.4-.293.32-1.12 1.094-1.12 2.667s1.147 3.094 1.307 3.307c.16.213 2.257 3.446 5.467 4.834.764.33 1.36.527 1.825.674.767.244 1.465.21 2.017.127.615-.092 1.892-.774 2.16-1.52.267-.747.267-1.387.187-1.52-.08-.134-.293-.214-.613-.374Z" />
        </svg>
      </button>
    </div>
  );
}
