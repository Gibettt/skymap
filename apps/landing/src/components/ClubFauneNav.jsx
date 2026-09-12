"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ClubFauneNav({ whatsappLink }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [drawerOpen]);

  return (
    <>
      <header className={`cf-header ${scrolled ? "scrolled" : ""}`}>
        <div className="cf-header-inner">
          <Link href="/" className="cf-logo">
            <div className="cf-logo-mark">
              <Image
                src="/spacecat-astrotourism-logo.jpg"
                alt="SpaceCat ASTROTOURISM Logo"
                width={44}
                height={44}
                priority
              />
            </div>
            <div className="cf-logo-text">
              <span className="cf-logo-title ogg">SpaceCat ASTROTOURISM</span>
              <span className="cf-logo-sub biotif">Maldives</span>
            </div>
          </Link>

          <nav className="cf-nav-links" aria-label="Main Navigation">
            <a href="#experiences" className="cf-nav-link">Experiences</a>
            <a href="#resorts" className="cf-nav-link">Destinations</a>
            <a href="#valeurs" className="cf-nav-link">Our Values</a>
            <Link href="/sky" className="cf-nav-link">Sky Guide 3D</Link>
            <a href="#masterclass" className="cf-nav-link">Masterclass</a>
            <a href="#magazine" className="cf-nav-link">The Magazine</a>
          </nav>

          <div className="cf-header-right">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="cf-tel-btn"
              title="Contact Astronomical Concierge"
            >
              <svg viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27 11.72 11.72 0 003.68.59 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11.72 11.72 0 00.59 3.68 1 1 0 01-.27 1.11l-2.2 2.2z" />
              </svg>
              <span>Concierge</span>
            </a>

            <button
              type="button"
              className="cf-burger-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Fullscreen Drawer Navigation */}
      <div
        className={`cf-drawer-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`cf-drawer ${drawerOpen ? "open" : ""}`} aria-label="Navigation Menu">
        <div className="cf-drawer-top">
          <div className="cf-logo-text">
            <span className="cf-logo-title ogg" style={{ color: "var(--black)" }}>SpaceCat ASTROTOURISM</span>
            <span className="cf-logo-sub biotif" style={{ color: "var(--gris3)" }}>Maldives</span>
          </div>
          <button
            type="button"
            className="cf-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Menu"
          >
            ✕
          </button>
        </div>

        <ul className="cf-drawer-menu">
          <li>
            <a href="#experiences" onClick={() => setDrawerOpen(false)}>
              <span>Our Experiences</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>01</span>
            </a>
          </li>
          <li>
            <a href="#resorts" onClick={() => setDrawerOpen(false)}>
              <span>Our Destinations</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>02</span>
            </a>
          </li>
          <li>
            <a href="#valeurs" onClick={() => setDrawerOpen(false)}>
              <span>Our Values</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>03</span>
            </a>
          </li>
          <li>
            <Link href="/sky" onClick={() => setDrawerOpen(false)}>
              <span>Sky Guide 3D</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>04</span>
            </Link>
          </li>
          <li>
            <a href="#masterclass" onClick={() => setDrawerOpen(false)}>
              <span>Astronomy Masterclasses</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>05</span>
            </a>
          </li>
          <li>
            <a href="#magazine" onClick={() => setDrawerOpen(false)}>
              <span>The Celestial Magazine</span>
              <span className="biotif" style={{ fontSize: "16px", color: "var(--orange)" }}>06</span>
            </a>
          </li>
        </ul>

        <div className="cf-drawer-footer">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-orange"
            style={{ width: "100%" }}
          >
            Contact Concierge Team
          </a>
          <p style={{ fontSize: "12px", color: "var(--gris3)", margin: 0 }}>
            24/7 dedicated guest assistance and astronomical concierge across the Maldives.
          </p>
        </div>
      </aside>
    </>
  );
}
