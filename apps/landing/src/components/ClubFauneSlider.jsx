"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";

const AUTOPLAY_INTERVAL_MS = 3000;

export default function ClubFauneSlider({ items = [] }) {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeCount, setActiveCount] = useState("2-6");
  const [progressPercent, setProgressPercent] = useState(33);
  const [isPaused, setIsPaused] = useState(false);

  const totalSlides = items.length || 6;

  const updateScrollState = useCallback(() => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;

    // Check left/right buttons
    setCanScrollLeft(scrollLeft > 15);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);

    // Calculate visible index
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 992;
    const maxScroll = scrollWidth - clientWidth;
    const scrollRatio = maxScroll > 0 ? scrollLeft / maxScroll : 0;

    // Card width approximately 440px + 20px gap = 460px
    const cardWidth = isDesktop ? 460 : 360;
    const slideIndex = Math.round(scrollLeft / cardWidth);

    // If desktop (showing 2 cards), counter shows (slideIndex + 2) up to totalSlides
    // If mobile (showing 1 card), counter shows (slideIndex + 1) up to totalSlides
    const visibleCount = isDesktop
      ? Math.min(slideIndex + 2, totalSlides)
      : Math.min(slideIndex + 1, totalSlides);
    setActiveCount(`${Math.max(visibleCount, isDesktop ? 2 : 1)}-${totalSlides}`);

    // Progress percentage
    const baseProgress = isDesktop ? 2 / totalSlides : 1 / totalSlides;
    const currentProgress = baseProgress + scrollRatio * (1 - baseProgress);
    setProgressPercent(Math.min(Math.max(currentProgress * 100, 15), 100));
  }, [totalSlides]);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (track) {
      track.addEventListener("scroll", updateScrollState, { passive: true });
      window.addEventListener("resize", updateScrollState);
      return () => {
        track.removeEventListener("scroll", updateScrollState);
        window.removeEventListener("resize", updateScrollState);
      };
    }
  }, [updateScrollState]);

  const scrollDirection = useCallback((direction, wrapAtEnd = false) => {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector(".experience");
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    const cardWidth = firstCard?.getBoundingClientRect().width || (window.innerWidth >= 992 ? 440 : 340);
    const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 0);
    const reachedEnd = track.scrollLeft >= maxScroll - 15;

    if (direction > 0 && wrapAtEnd && reachedEnd) {
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }

    track.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    const autoplayTimer = window.setInterval(() => {
      scrollDirection(1, true);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(autoplayTimer);
  }, [isPaused, scrollDirection, totalSlides]);

  return (
    <div
      className="experiences-wrapper"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
      }}
    >
      {/* Bottom pagination slider indicator (rendered at bottom via column-reverse on desktop) */}
      <div className="pagination-slick-slider">
        <span className="slider-counter desktop">{activeCount}</span>
        <div className="slider-progress-track">
          <div
            className="slider-progress-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Floating navigation button: PREV */}
      {canScrollLeft && (
        <button
          type="button"
          className="slick-arrow prev-slick-slider"
          onClick={() => scrollDirection(-1)}
          aria-label="Previous experiences"
        >
          <svg
            width="17"
            height="18"
            viewBox="0 0 17 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.65101 4.69169C6.56383 4.60459 6.44559 4.55566 6.32229 4.55566C6.199 4.55566 6.08076 4.60459 5.99358 4.69169C5.9064 4.77879 5.85742 4.89691 5.85742 5.02009C5.85742 5.14326 5.9064 5.26139 5.99358 5.34848L9.87916 9.23871L5.99358 13.1121C5.90811 13.2001 5.8603 13.3179 5.8603 13.4405C5.8603 13.5631 5.90811 13.6809 5.99358 13.7689C6.08166 13.8543 6.19956 13.902 6.32229 13.902C6.44503 13.902 6.56293 13.8543 6.65101 13.7689L11.194 9.23871L6.65101 4.69169Z"
              fill="black"
            />
          </svg>
        </button>
      )}

      {/* Floating navigation button: NEXT */}
      {canScrollRight && (
        <button
          type="button"
          className="slick-arrow next-slick-slider"
          onClick={() => scrollDirection(1)}
          aria-label="Next experiences"
        >
          <svg
            width="17"
            height="18"
            viewBox="0 0 17 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.65101 4.69169C6.56383 4.60459 6.44559 4.55566 6.32229 4.55566C6.199 4.55566 6.08076 4.60459 5.99358 4.69169C5.9064 4.77879 5.85742 4.89691 5.85742 5.02009C5.85742 5.14326 5.9064 5.26139 5.99358 5.34848L9.87916 9.23871L5.99358 13.1121C5.90811 13.2001 5.8603 13.3179 5.8603 13.4405C5.8603 13.5631 5.90811 13.6809 5.99358 13.7689C6.08166 13.8543 6.19956 13.902 6.32229 13.902C6.44503 13.902 6.56293 13.8543 6.65101 13.7689L11.194 9.23871L6.65101 4.69169Z"
              fill="black"
            />
          </svg>
        </button>
      )}

      {/* Cards track */}
      <div ref={trackRef} className="experiences">
        {items.map((exp, idx) => (
          <a
            key={idx}
            href={exp.link || "#resorts"}
            className="experience card-experience"
          >
            <figure>
              <Image
                src={exp.image}
                alt={exp.title}
                fill
                sizes="(max-width: 768px) 85vw, 440px"
                className="zoom-animation"
                priority={idx < 2}
              />
              <div className="content">
                <div className="localisation">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.07444 3.22817L6.36359 2.10278C4.03388 2.60115 2.20219 4.43398 1.7041 6.76523L2.82878 6.47589C3.32695 4.93252 4.54803 3.72671 6.07435 3.22826L6.07444 3.22817Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M12.4362 6.47587L13.5609 6.7652C13.0628 4.45004 11.2312 2.60118 8.90137 2.10278L9.19052 3.22817C10.7329 3.72665 11.938 4.93245 12.4361 6.47578L12.4362 6.47587Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M2.82878 9.59525L1.7041 9.30591C2.20216 11.6371 4.03382 13.47 6.36359 13.9684L6.07444 12.843C4.54808 12.3445 3.327 11.1387 2.82886 9.59533L2.82878 9.59525Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M9.19052 12.843L8.90137 13.9683C11.2151 13.47 13.0628 11.6372 13.5609 9.30591L12.4362 9.59524C11.938 11.1386 10.733 12.3444 9.19061 12.8429L9.19052 12.843Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M15.1193 7.85818L9.91351 6.53977L10.6847 5.25355C10.7811 5.0767 10.5883 4.8838 10.4116 4.98025L9.12618 5.75194L7.80873 0.542864C7.76053 0.34997 7.50342 0.34997 7.45525 0.542864L6.13768 5.75194L4.85228 4.98025C4.67553 4.88381 4.48276 5.0767 4.57915 5.25355L5.35035 6.53977L0.144579 7.85806C-0.0481929 7.90629 -0.0481929 8.16356 0.144579 8.21177L5.35035 9.53017L4.57915 10.8164C4.48276 10.9932 4.67554 11.1861 4.85228 11.0897L6.13768 10.318L7.45525 15.5271C7.50344 15.72 7.76055 15.72 7.80873 15.5271L9.12629 10.318L10.4117 11.0897C10.5884 11.1861 10.7812 10.9932 10.6848 10.8164L9.91363 9.53017L15.1194 8.21177C15.3119 8.16354 15.3119 7.90627 15.1192 7.85806L15.1193 7.85818ZM7.63197 9.25688C6.95715 9.25688 6.4109 8.71028 6.4109 8.03503C6.4109 7.35978 6.95715 6.81318 7.63197 6.81318C8.3068 6.81318 8.85305 7.35978 8.85305 8.03503C8.85305 8.71028 8.3068 9.25688 7.63197 9.25688V9.25688Z"
                      fill="#ffffff"
                    />
                  </svg>
                  <span>{exp.region} — </span>
                  <span>{exp.country}</span>
                </div>
                <h3 className="titre-exp">{exp.title}</h3>
                <div className="texte-cta">
                  <span className="accroche">{exp.accroche}</span>
                  <div className="arrow-custom white">
                    <span>Discover</span>
                    <div>
                      <svg
                        width="14"
                        height="8"
                        viewBox="0 0 14 8"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M0.915527 3.30841C0.639385 3.30841 0.415527 3.53227 0.415527 3.80841C0.415527 4.08455 0.639385 4.30841 0.915527 4.30841L0.915527 3.30841ZM12.9778 4.16197C13.1731 3.9667 13.1731 3.65012 12.9778 3.45486L9.79584 0.272878C9.60058 0.0776153 9.28399 0.0776153 9.08873 0.272877C8.89347 0.46814 8.89347 0.784722 9.08873 0.979984L11.9172 3.80841L9.08873 6.63684C8.89347 6.8321 8.89347 7.14868 9.08873 7.34395C9.28399 7.53921 9.60058 7.53921 9.79584 7.34395L12.9778 4.16197ZM0.915527 4.30841L12.6243 4.30841L12.6243 3.30841L0.915527 3.30841L0.915527 4.30841Z"
                          fill="white"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </figure>
          </a>
        ))}
      </div>
    </div>
  );
}
