"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function SkyViewer() {
  const [isGyroActive, setIsGyroActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [headingAngle, setHeadingAngle] = useState(0);
  const iframeRef = useRef(null);
  const sensorDetectedRef = useRef(false);
  const lastTapRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  // Show temporary toast notification
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Broadcast orientation to iframe
  const handleOrientation = useCallback((e) => {
    sensorDetectedRef.current = true;
    if (!iframeRef.current?.contentWindow) return;

    let heading = 0;
    if (typeof e.webkitCompassHeading === "number" && !isNaN(e.webkitCompassHeading)) {
      heading = e.webkitCompassHeading;
    } else if (typeof e.alpha === "number") {
      heading = (360 - e.alpha) % 360;
    }
    setHeadingAngle(heading);

    const screenAngle = (screen.orientation && typeof screen.orientation.angle === "number")
      ? screen.orientation.angle
      : (typeof window.orientation === "number" ? window.orientation : 0);

    iframeRef.current.contentWindow.postMessage({
      type: "GYRO_ORIENTATION",
      alpha: e.alpha,
      beta: e.beta,
      gamma: e.gamma,
      webkitCompassHeading: e.webkitCompassHeading,
      screenAngle: screenAngle,
    }, "*");
  }, []);

  // Handle messages from iframe
  useEffect(() => {
    const onMessage = (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "GYRO_STATUS_CHANGE") {
        setIsGyroActive(Boolean(data.active));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Clean up orientation listener when inactive
  useEffect(() => {
    if (!isGyroActive) {
      window.removeEventListener("deviceorientationabsolute", handleOrientation);
      window.removeEventListener("deviceorientation", handleOrientation);
    }
  }, [isGyroActive, handleOrientation]);

  // Start gyro tracking directly on user click (agreement)
  const startGyro = async () => {
    // 1. Check iOS Safari permission directly on user gesture
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted") {
          showToast("Izin sensor ditolak. Buka Pengaturan Safari > Motion & Orientation.");
          return;
        }
      } catch (err) {
        console.error("iOS requestPermission error:", err);
      }
    }

    // 2. Attach orientation listeners
    sensorDetectedRef.current = false;
    if ("ondeviceorientationabsolute" in window) {
      window.addEventListener("deviceorientationabsolute", handleOrientation, { passive: true });
    }
    window.addEventListener("deviceorientation", handleOrientation, { passive: true });

    // Tell iframe to start tracking
    iframeRef.current?.contentWindow?.postMessage({ type: "START_GYRO" }, "*");
    setIsGyroActive(true);

    // Check if device actually emits sensor data (after 2.5s)
    setTimeout(() => {
      if (!sensorDetectedRef.current) {
        showToast("Gerakkan ponsel atau uji di HP fisik untuk sensor kompas real-time");
      }
    }, 2500);
  };

  // Stop gyro tracking
  const stopGyro = () => {
    setIsGyroActive(false);
    window.removeEventListener("deviceorientationabsolute", handleOrientation);
    window.removeEventListener("deviceorientation", handleOrientation);
    iframeRef.current?.contentWindow?.postMessage({ type: "STOP_GYRO" }, "*");
    showToast("Kompas dinonaktifkan");
  };

  // Handle clicking the compass
  // Single click when inactive = agree & start directly
  // Double tap (ketuk 2x) when active = turn off
  const handleCompassClick = () => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;

    if (!isGyroActive) {
      // Single click when inactive = agree & start directly!
      lastTapRef.current = now;
      startGyro();
    } else {
      // Active: check for double tap (within 450ms)
      if (timeDiff > 0 && timeDiff < 450) {
        // Double tap confirmed -> turn off!
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        lastTapRef.current = 0;
        stopGyro();
      } else {
        // First tap while active -> prompt to double tap to turn off
        lastTapRef.current = now;
        if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = setTimeout(() => {
          showToast("Ketuk 2x pada kompas untuk mematikan");
        }, 450);
      }
    }
  };

  // Calculate cardinal positions for HUD compass matching user's reference
  const getCompassPositions = (heading) => {
    const Rx = 26;
    const Ry = 16;
    const cardinals = [
      { label: "U", deg: 0 },
      { label: "T", deg: 90 },
      { label: "S", deg: 180 },
      { label: "B", deg: 270 },
    ];
    const cardinalItems = cardinals.map(({ label, deg }) => {
      const rad = ((deg - heading) * Math.PI) / 180;
      return {
        type: "text",
        label,
        x: Rx * Math.sin(rad),
        y: -Ry * Math.cos(rad),
      };
    });

    const dotDegs = [45, 135, 225, 315];
    const dotItems = dotDegs.map((deg) => {
      const rad = ((deg - heading) * Math.PI) / 180;
      return {
        type: "dot",
        x: Rx * Math.sin(rad),
        y: -Ry * Math.cos(rad),
      };
    });

    return [...cardinalItems, ...dotItems];
  };

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#000" }}>
      {/* 3D Planetarium Frame */}
      <iframe
        ref={iframeRef}
        src="/skymap.html"
        title="Sky Guide 3D"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        allow="fullscreen; geolocation; accelerometer; gyroscope; magnetometer"
      />

      {/* Active Guidance Banner ("Arahkan HP Anda ke atas") */}
      {isGyroActive && (
        <div
          style={{
            position: "fixed",
            top: "58px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2px",
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            padding: "8px 20px",
            borderRadius: "9999px",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.25)",
            textAlign: "center",
            whiteSpace: "nowrap",
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
            animation: "fadeIn 0.25s ease-out",
          }}
        >
          <div style={{ color: "#ffffff", fontSize: "13.5px", fontWeight: 600, letterSpacing: "0.02em" }}>
            Arahkan HP Anda ke atas
          </div>
          <div style={{ color: "rgba(224, 242, 254, 0.7)", fontSize: "10.5px" }}>
            Ketuk 2x pada kompas untuk mematikan
          </div>
        </div>
      )}

      {/* Floating Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "135px",
            right: "16px",
            zIndex: 99999,
            fontSize: "12px",
            color: "#38bdf8",
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(12px)",
            padding: "7px 14px",
            borderRadius: "8px",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
            maxWidth: "280px",
            textAlign: "right",
            lineHeight: 1.4,
            fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
            pointerEvents: "none",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Floating Compass HUD Display (Transparent, No Box Background) */}
      <div
        style={{
          position: "fixed",
          bottom: "74px",
          right: "16px",
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          pointerEvents: "auto",
          userSelect: "none",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        }}
      >
        {/* Transparent Compass HUD Button */}
        <button
          type="button"
          onClick={handleCompassClick}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            boxShadow: "none",
            padding: "4px",
            cursor: "pointer",
            outline: "none",
            WebkitTapHighlightColor: "transparent",
            transform: isGyroActive ? "scale(1.08)" : "scale(1)",
            transition: "transform 0.25s ease",
          }}
        >
          <svg
            viewBox="-40 -26 80 52"
            width="80"
            height="52"
            fill="none"
            style={{
              filter: isGyroActive
                ? "drop-shadow(0 0 10px rgba(56, 189, 248, 0.95))"
                : "drop-shadow(0 2px 5px rgba(0, 0, 0, 0.9))",
            }}
          >
            {/* Dynamic Orbiting Cardinal Points (U, T, S, B, and dots) */}
            {getCompassPositions(headingAngle).map((item, idx) =>
              item.type === "text" ? (
                <text
                  key={item.label}
                  x={item.x}
                  y={item.y}
                  fill={isGyroActive && item.label === "U" ? "#38bdf8" : "#ffffff"}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {item.label}
                </text>
              ) : (
                <circle
                  key={idx}
                  cx={item.x}
                  cy={item.y}
                  r="1.7"
                  fill="rgba(255, 255, 255, 0.85)"
                />
              )
            )}

            {/* Center Navigation Diamond Needle */}
            {/* Solid top half pointing UP */}
            <polygon
              points="0,-10 5.5,0 -5.5,0"
              fill={isGyroActive ? "#38bdf8" : "#ffffff"}
            />
            {/* Hollow bottom half chevron */}
            <polygon
              points="-5.5,0 0,10 5.5,0 0,4"
              fill={isGyroActive ? "rgba(56, 189, 248, 0.85)" : "#ffffff"}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
