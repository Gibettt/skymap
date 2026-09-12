/**
 * Gyroscope & DeviceOrientation Controller for Stellarium Web 3D Sky Map
 * Supports iOS (Safari permission model & webkitCompassHeading) and Android (deviceorientationabsolute / deviceorientation)
 */
(function () {
  "use strict";

  // Constants
  const DEG2RAD = Math.PI / 180;
  const RAD2DEG = 180 / Math.PI;
  const LERP_FACTOR = 0.35; // Responsive yet smooth damping for IMU noise

  // Controller State
  const state = {
    active: false,
    hasPermission: false,
    rafId: null,
    stel: null,
    targetYaw: 0,
    targetPitch: 0,
    targetRoll: 0,
    currentYaw: 0,
    currentPitch: 0,
    currentRoll: 0,
    headingOffset: 0,
    screenAngle: 0,
    touchStartX: 0,
    isDragging: false,
  };

  // Helper: Get Stellarium instance
  function getStel() {
    if (state.stel) return state.stel;
    try {
      const app = document.querySelector("#app");
      const stel = app?.__vue_app__?.config?.globalProperties?.$stel;
      if (stel && stel.core) {
        state.stel = stel;
        return stel;
      }
    } catch (e) {
      console.warn("[Gyro] Error querying $stel:", e);
    }
    return null;
  }

  // Helper: Angle lerp handling 0/2PI circular discontinuity
  function lerpAngle(current, target, factor) {
    let diff = (target - current) % (2 * Math.PI);
    if (diff < -Math.PI) diff += 2 * Math.PI;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    return current + diff * factor;
  }

  // Helper: Scalar lerp
  function lerp(current, target, factor) {
    return current + (target - current) * factor;
  }

  // Screen orientation query
  function updateScreenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === "number") {
      state.screenAngle = screen.orientation.angle;
    } else if (typeof window.orientation === "number") {
      state.screenAngle = window.orientation;
    } else {
      state.screenAngle = 0;
    }
  }

  /**
   * Convert mobile IMU Euler angles (alpha, beta, gamma) into Stellarium Horizontal Coordinates
   */
  function processOrientation(alpha, beta, gamma, webkitCompassHeading) {
    let alphaRad;
    if (webkitCompassHeading !== undefined && webkitCompassHeading !== null && !isNaN(webkitCompassHeading) && webkitCompassHeading >= 0) {
      alphaRad = -webkitCompassHeading * DEG2RAD;
    } else {
      alphaRad = -(alpha || 0) * DEG2RAD;
    }

    const betaRad = (beta || 0) * DEG2RAD;
    const gammaRad = (gamma || 0) * DEG2RAD;

    const ca = Math.cos(alphaRad), sa = Math.sin(alphaRad);
    const cb = Math.cos(betaRad), sb = Math.sin(betaRad);
    const cg = Math.cos(gammaRad), sg = Math.sin(gammaRad);

    const vx = -(ca * sg + sa * sb * cg);
    const vy = -(sa * sg - ca * sb * cg);
    const vz = -(cb * cg);

    const pitch = Math.asin(Math.max(-1.0, Math.min(1.0, vz)));

    const horizLen = Math.sqrt(vx * vx + vy * vy);
    let yaw = state.targetYaw;
    if (horizLen > 0.04) {
      yaw = Math.atan2(vx, vy);
      if (yaw < 0) {
        yaw += 2 * Math.PI;
      }
    }

    let roll = -gammaRad;
    if (state.screenAngle) {
      roll -= state.screenAngle * DEG2RAD;
    }

    state.targetYaw = yaw;
    state.targetPitch = pitch;
    state.targetRoll = roll;
  }

  function handleDeviceOrientation(event) {
    if (!state.active) return;
    const alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;
    const webkitCompassHeading = event.webkitCompassHeading;

    if (beta === null && gamma === null) return;
    processOrientation(alpha, beta, gamma, webkitCompassHeading);
  }

  function updateLoop() {
    if (!state.active) return;

    const stel = getStel();
    if (stel && stel.core) {
      let effTargetYaw = (state.targetYaw + state.headingOffset) % (2 * Math.PI);
      if (effTargetYaw < 0) effTargetYaw += 2 * Math.PI;

      state.currentYaw = lerpAngle(state.currentYaw, effTargetYaw, LERP_FACTOR);
      state.currentPitch = lerp(state.currentPitch, state.targetPitch, LERP_FACTOR);
      state.currentRoll = lerp(state.currentRoll, state.targetRoll, LERP_FACTOR);

      stel.core.yaw = state.currentYaw;
      stel.core.pitch = state.currentPitch;
      stel.core.roll = state.currentRoll;
    }

    state.rafId = requestAnimationFrame(updateLoop);
  }

  async function requestPermission() {
    const reqFn =
      (typeof window.DeviceOrientationEvent !== "undefined" && typeof window.DeviceOrientationEvent.requestPermission === "function" && window.DeviceOrientationEvent.requestPermission) ||
      (window.top && typeof window.top.DeviceOrientationEvent !== "undefined" && typeof window.top.DeviceOrientationEvent.requestPermission === "function" && window.top.DeviceOrientationEvent.requestPermission);

    if (reqFn) {
      try {
        const response = await reqFn();
        if (response === "granted") {
          state.hasPermission = true;
          return true;
        } else {
          alert("Izin sensor giroskop dibutuhkan untuk mode AR. Silakan aktifkan Motion & Orientation di Pengaturan Safari.");
          return false;
        }
      } catch (err) {
        console.error("[Gyro] iOS requestPermission error:", err);
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: "GYRO_REQUEST_PERMISSION" }, "*");
        }
        return false;
      }
    }

    state.hasPermission = true;
    return true;
  }

  async function startGyro() {
    if (state.active) return true;

    const permitted = await requestPermission();
    if (!permitted) return false;

    updateScreenAngle();
    window.addEventListener("orientationchange", updateScreenAngle, { passive: true });
    if (screen.orientation) {
      screen.orientation.addEventListener("change", updateScreenAngle, { passive: true });
    }

    if ("ondeviceorientationabsolute" in window) {
      window.addEventListener("deviceorientationabsolute", handleDeviceOrientation, { passive: true });
    }
    window.addEventListener("deviceorientation", handleDeviceOrientation, { passive: true });

    const stel = getStel();
    if (stel && stel.core) {
      state.currentYaw = stel.core.yaw || 0;
      state.currentPitch = stel.core.pitch || 0;
      state.currentRoll = stel.core.roll || 0;
      state.targetYaw = state.currentYaw;
      state.targetPitch = state.currentPitch;
      state.targetRoll = state.currentRoll;
    }

    state.active = true;
    updateUIState();
    state.rafId = requestAnimationFrame(updateLoop);

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "GYRO_STATUS_CHANGE", active: true }, "*");
    }
    return true;
  }

  function stopGyro() {
    if (!state.active) return;
    state.active = false;

    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    window.removeEventListener("deviceorientationabsolute", handleDeviceOrientation);
    window.removeEventListener("deviceorientation", handleDeviceOrientation);
    window.removeEventListener("orientationchange", updateScreenAngle);

    updateUIState();

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "GYRO_STATUS_CHANGE", active: false }, "*");
    }
  }

  async function toggleGyro() {
    if (state.active) {
      stopGyro();
      return false;
    } else {
      return await startGyro();
    }
  }

  function setExternalOrientation(data) {
    if (!state.active) return;
    const { alpha, beta, gamma, webkitCompassHeading, screenAngle } = data;
    if (typeof screenAngle === "number") {
      state.screenAngle = screenAngle;
    }
    processOrientation(alpha, beta, gamma, webkitCompassHeading);
  }

  window.addEventListener("message", async (event) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "START_GYRO") {
      await startGyro();
    } else if (data.type === "STOP_GYRO") {
      stopGyro();
    } else if (data.type === "TOGGLE_GYRO") {
      await toggleGyro();
    } else if (data.type === "GYRO_ORIENTATION") {
      setExternalOrientation(data);
    } else if (data.type === "GYRO_PERMISSION_GRANTED") {
      state.hasPermission = true;
      await startGyro();
    }
  });

  function createUI() {
    if (window.parent && window.parent !== window) return;
    if (document.getElementById("stel-gyro-container")) return;

    const container = document.createElement("div");
    container.id = "stel-gyro-container";
    container.setAttribute("aria-label", "Toggle AR Gyroscope Mode");
    container.style.cssText = "position: fixed; bottom: 64px; right: 20px; z-index: 99999; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: auto; user-select: none; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif;";

    const btn = document.createElement("button");
    btn.id = "stel-gyro-btn";
    btn.type = "button";
    btn.title = "Aktifkan Sensor Giroskop (Gerakkan HP untuk melihat langit)";
    btn.style.cssText = "display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.25); background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); color: #fff; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; cursor: pointer; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); transition: all 0.25s ease; outline: none;";

    const iconSpan = document.createElement("span");
    iconSpan.id = "stel-gyro-icon";
    iconSpan.style.cssText = "display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; transition: transform 0.4s ease;";
    iconSpan.innerHTML = '<svg viewBox="0 0 36 36" width="26" height="26" fill="none"><circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" fill="rgba(15,23,42,0.6)"/><circle cx="18" cy="18" r="13" stroke="rgba(255,255,255,0.2)" stroke-width="0.8" stroke-dasharray="2 2"/><line x1="18" y1="4" x2="18" y2="7" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="29" x2="18" y2="32" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="18" x2="7" y2="18" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/><line x1="29" y1="18" x2="32" y2="18" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/><g><polygon points="18,7 21.5,18 18,16" fill="#ef4444"/><polygon points="18,7 14.5,18 18,16" fill="#dc2626"/><polygon points="18,29 21.5,18 18,20" fill="#f8fafc"/><polygon points="18,29 14.5,18 18,20" fill="#94a3b8"/><circle cx="18" cy="18" r="2" fill="#38bdf8" stroke="#0f172a" stroke-width="0.8"/></g></svg>';

    const labelSpan = document.createElement("span");
    labelSpan.id = "stel-gyro-label";
    labelSpan.textContent = "KOMPAS";

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);

    const hint = document.createElement("div");
    hint.id = "stel-gyro-hint";
    hint.style.cssText = "display: none; font-size: 11px; color: rgba(255, 255, 255, 0.9); background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); padding: 5px 12px; border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.3); pointer-events: none;";
    hint.textContent = "Gerakkan HP ke arah langit";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await toggleGyro();
    });

    container.appendChild(hint);
    container.appendChild(btn);
    document.body.appendChild(container);
  }

  function updateUIState() {
    const btn = document.getElementById("stel-gyro-btn");
    const label = document.getElementById("stel-gyro-label");
    const icon = document.getElementById("stel-gyro-icon");
    const hint = document.getElementById("stel-gyro-hint");
    if (!btn) return;

    if (state.active) {
      btn.style.background = "linear-gradient(135deg, rgba(14, 165, 233, 0.95), rgba(59, 130, 246, 0.95))";
      btn.style.borderColor = "#38bdf8";
      btn.style.boxShadow = "0 0 25px rgba(56, 189, 248, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.4)";
      btn.style.color = "#ffffff";
      if (label) label.textContent = "KOMPAS AKTIF";
      if (icon) icon.style.transform = "rotate(45deg) scale(1.1)";
      if (hint) hint.style.display = "block";
    } else {
      btn.style.background = "rgba(15, 23, 42, 0.88)";
      btn.style.borderColor = "rgba(255, 255, 255, 0.25)";
      btn.style.boxShadow = "0 4px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)";
      btn.style.color = "#ffffff";
      if (label) label.textContent = "KOMPAS";
      if (icon) icon.style.transform = "rotate(0deg) scale(1.0)";
      if (hint) hint.style.display = "none";
    }
  }

  function initTouchCalibration() {
    window.addEventListener("touchstart", (e) => {
      if (!state.active) return;
      if (e.touches.length === 1) {
        state.isDragging = true;
        state.touchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!state.active || !state.isDragging) return;
      if (e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - state.touchStartX;
        state.touchStartX = e.touches[0].clientX;
        state.headingOffset -= deltaX * 0.003;
      }
    }, { passive: true });

    window.addEventListener("touchend", () => {
      state.isDragging = false;
    }, { passive: true });
  }

  function autoRequestLocation() {
    if (navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === "function") {
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          var coords = pos.coords;
          var check = function() {
            var stel = getStel();
            if (stel && typeof stel.setLocation === "function") {
              var toRad = Math.PI / 180;
              stel.setLocation(coords.latitude * toRad, coords.longitude * toRad, coords.altitude || 0);
            } else {
              setTimeout(check, 600);
            }
          };
          check();
        },
        function(err) {
          console.log("[Location] Auto-geolocation notice:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }
  }

  function init() {
    createUI();
    initTouchCalibration();
    autoRequestLocation();
  }

  // Always expose API immediately
  window.stelGyro = {
    start: startGyro,
    stop: stopGyro,
    toggle: toggleGyro,
    isActive: () => state.active,
    setExternalOrientation: setExternalOrientation,
    resetOffset: () => { state.headingOffset = 0; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
