"use client";

import * as React from "react";
import Image from "next/image";

export function SplashScreen({ brandName }: { brandName: string }) {
  const [visible, setVisible] = React.useState(true);
  const [mounted, setMounted] = React.useState(true);

  React.useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("has_seen_splash");
    if (hasSeenSplash) {
      setMounted(false);
      return;
    }

    sessionStorage.setItem("has_seen_splash", "true");
    const fadeTimer = setTimeout(() => {
      setVisible(false);
    }, 1200);

    const removeTimer = setTimeout(() => {
      setMounted(false);
    }, 1800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-700 pointer-events-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background: "radial-gradient(ellipse at center, #2e0854 0%, #0d0118 70%, #000000 100%)",
      }}
    >
      <div className="relative flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative size-20 overflow-hidden rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.5)] border border-violet-500/30">
          <Image
            src="/spacecat-astrotourism-logo.jpg"
            alt="Logo"
            width={80}
            height={80}
            className="size-full object-cover"
            priority
          />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-bold text-2xl tracking-wider text-white uppercase drop-shadow-md">
            {brandName}
          </h1>
          <p className="text-xs tracking-widest text-violet-300/80 uppercase">
            Coordinate · Observe · Deliver
          </p>
        </div>
        <div className="mt-4 size-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
      </div>
    </div>
  );
}
