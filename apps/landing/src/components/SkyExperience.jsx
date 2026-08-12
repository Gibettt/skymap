'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';
import styles from './SkyExperience.module.css';

const DEFAULT_LOCATION = { name: 'Jakarta, Indonesia', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' };
const STARS = [
  { name: 'Polaris', ra: 2.5303, dec: 89.2641, group: 'north' }, { name: 'Dubhe', ra: 11.0621, dec: 61.7508, group: 'north' },
  { name: 'Merak', ra: 11.0307, dec: 56.3824, group: 'north' }, { name: 'Alioth', ra: 12.9004, dec: 55.9598, group: 'north' },
  { name: 'Mizar', ra: 13.3987, dec: 54.9254, group: 'north' }, { name: 'Acrux', ra: 12.4433, dec: -63.0991, group: 'south' },
  { name: 'Mimosa', ra: 12.7953, dec: -59.6888, group: 'south' }, { name: 'Gacrux', ra: 12.5194, dec: -57.1132, group: 'south' },
  { name: 'Alpha Centauri', ra: 14.6601, dec: -60.8339, group: 'south' }, { name: 'Canopus', ra: 6.3992, dec: -52.6957, group: 'south' },
  { name: 'Sirius', ra: 6.7525, dec: -16.7161, group: 'both' }, { name: 'Betelgeuse', ra: 5.9195, dec: 7.4071, group: 'both' },
  { name: 'Rigel', ra: 5.2423, dec: -8.2016, group: 'both' },
];
const PLANETS = [
  { body: Astronomy.Body.Moon, color: '#f1e2bd', size: 1.5 }, { body: Astronomy.Body.Venus, color: '#f3ca86', size: 1 },
  { body: Astronomy.Body.Mars, color: '#e07a58', size: 1 }, { body: Astronomy.Body.Jupiter, color: '#e0bf9c', size: 1 },
  { body: Astronomy.Body.Saturn, color: '#d4c47f', size: 1 },
];

function range() { const from = new Date(); const to = new Date(from.getTime() + 90 * 86400000); return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }; }
function position(horizontal) { const alt = THREE.MathUtils.degToRad(horizontal.altitude); const az = THREE.MathUtils.degToRad(horizontal.azimuth); const r = 85; return new THREE.Vector3(r * Math.cos(alt) * Math.sin(az), r * Math.sin(alt), -r * Math.cos(alt) * Math.cos(az)); }
function dispose(group) { group.traverse((object) => { object.geometry?.dispose?.(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.()); else object.material?.dispose?.(); }); }
function formatDate(date, timezone, time = true) { return new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', ...(time ? { hour: '2-digit', minute: '2-digit', timeZone: timezone } : { year: 'numeric', timeZone: timezone }) }).format(new Date(date)); }

function SkyDome({ location, now, bearing, pitch, onBearingChange }) {
  const hostRef = useRef(null); const stateRef = useRef({ bearing, pitch }); const runtimeRef = useRef(null);
  useEffect(() => { stateRef.current = { bearing, pitch }; }, [bearing, pitch]);

  useEffect(() => {
    const host = hostRef.current; if (!host) return undefined;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#03070c');
    const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); host.appendChild(renderer.domElement);
    const grid = new THREE.GridHelper(150, 12, '#16434b', '#10242c'); grid.position.y = -0.3; scene.add(grid);
    const objects = new THREE.Group(); scene.add(objects); runtimeRef.current = { renderer, camera, objects };
    const resize = () => { const { width, height } = host.getBoundingClientRect(); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); renderer.setSize(width, height, false); };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let drag = null;
    const down = (event) => { drag = { x: event.clientX, bearing: stateRef.current.bearing }; renderer.domElement.setPointerCapture(event.pointerId); };
    const move = (event) => { if (drag) onBearingChange((drag.bearing - (event.clientX - drag.x) * 0.45 + 360) % 360); };
    const up = () => { drag = null; };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointermove', move); renderer.domElement.addEventListener('pointerup', up);
    let frame; const render = () => { const current = stateRef.current; camera.rotation.order = 'YXZ'; camera.rotation.y = THREE.MathUtils.degToRad(current.bearing); camera.rotation.x = THREE.MathUtils.degToRad(-current.pitch); renderer.render(scene, camera); frame = requestAnimationFrame(render); }; render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerup', up); dispose(objects); renderer.dispose(); host.removeChild(renderer.domElement); runtimeRef.current = null; };
  }, [onBearingChange]);

  useEffect(() => {
    const runtime = runtimeRef.current; if (!runtime) return;
    dispose(runtime.objects); runtime.objects.clear();
    const observer = new Astronomy.Observer(location.latitude, location.longitude, 0); const positions = []; const colors = [];
    const background = [];
    for (let index = 0; index < 240; index += 1) {
      const ra = (index * 7.731) % 24;
      const dec = ((index * 31.17) % 140) - 70;
      const point = position(Astronomy.Horizon(now, observer, ra, dec, 'normal'));
      background.push(point.x, point.y, point.z);
    }
    const backgroundGeometry = new THREE.BufferGeometry();
    backgroundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(background, 3));
    runtime.objects.add(new THREE.Points(backgroundGeometry, new THREE.PointsMaterial({ color: '#5f8992', size: 0.75, transparent: true, opacity: 0.72, sizeAttenuation: true })));
    for (const star of STARS) { const point = position(Astronomy.Horizon(now, observer, star.ra, star.dec, 'normal')); const color = new THREE.Color(star.group === 'north' ? '#8fd5e5' : star.group === 'south' ? '#f0bf7a' : '#ffffff'); positions.push(point.x, point.y, point.z); colors.push(color.r, color.g, color.b); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); runtime.objects.add(new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2.4, vertexColors: true, sizeAttenuation: true })));
    for (const planet of PLANETS) { const equator = Astronomy.Equator(planet.body, now, observer, true, true); const mesh = new THREE.Mesh(new THREE.SphereGeometry(planet.size, 18, 18), new THREE.MeshBasicMaterial({ color: planet.color })); mesh.position.copy(position(Astronomy.Horizon(now, observer, equator.ra, equator.dec, 'normal'))); runtime.objects.add(mesh); }
  }, [location.latitude, location.longitude, now]);

  return <div ref={hostRef} className={styles.dome} aria-label="Peta kubah langit interaktif" />;
}

export default function SkyExperience() {
  const [location, setLocation] = useState(DEFAULT_LOCATION); const [events, setEvents] = useState([]); const [now, setNow] = useState(() => new Date());
  const [bearing, setBearing] = useState(0); const [pitch, setPitch] = useState(8); const [skyMode, setSkyMode] = useState('north'); const [sensorStatus, setSensorStatus] = useState('manual'); const [message, setMessage] = useState('Geser peta untuk melihat langit.'); const [activeEvent, setActiveEvent] = useState(null);
  const sensorListenerRef = useRef(null);
  const loadData = useCallback(async () => { const dates = range(); const [settingsResponse, eventsResponse] = await Promise.all([fetch('/api/sky-settings'), fetch(`/api/sky-events?from=${dates.from}&to=${dates.to}`)]); const settings = await settingsResponse.json(); const calendar = await eventsResponse.json(); if (settings.location) setLocation(settings.location); if (calendar.events) setEvents(calendar.events); }, []);
  useEffect(() => { const initialLoad = setTimeout(() => loadData().catch(() => setMessage('Kalender akan dimuat saat koneksi tersedia.')), 0); const timer = setInterval(() => setNow(new Date()), 30000); return () => { clearTimeout(initialLoad); clearInterval(timer); }; }, [loadData]);
  useEffect(() => () => { if (sensorListenerRef.current) { window.removeEventListener('deviceorientationabsolute', sensorListenerRef.current, true); window.removeEventListener('deviceorientation', sensorListenerRef.current, true); } }, []);
  const chooseSky = (mode) => { setSkyMode(mode); setBearing(mode === 'north' ? 0 : 180); setSensorStatus('manual'); setMessage(mode === 'north' ? 'Panduan utara: Polaris dan Ursa Major.' : 'Panduan selatan: Southern Cross dan Alpha Centauri.'); };
  const useGuestLocation = () => { if (!navigator.geolocation) return setMessage('GPS tidak tersedia. Lokasi pilot tetap digunakan.'); navigator.geolocation.getCurrentPosition(({ coords }) => { setLocation((current) => ({ ...current, name: 'Lokasi perangkat', latitude: coords.latitude, longitude: coords.longitude })); setMessage('Lokasi perangkat aktif.'); }, () => setMessage('Izin lokasi tidak diberikan. Lokasi pilot tetap digunakan.'), { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }); };
  const enableSensors = async () => { try { if (typeof window.DeviceOrientationEvent === 'undefined') return setMessage('Sensor orientasi tidak tersedia pada perangkat ini.'); if (typeof window.DeviceOrientationEvent.requestPermission === 'function' && await window.DeviceOrientationEvent.requestPermission() !== 'granted') throw new Error('permission'); if (sensorListenerRef.current) { window.removeEventListener('deviceorientationabsolute', sensorListenerRef.current, true); window.removeEventListener('deviceorientation', sensorListenerRef.current, true); } const orientation = (event) => { const heading = typeof event.webkitCompassHeading === 'number' ? event.webkitCompassHeading : typeof event.alpha === 'number' ? (360 - event.alpha) % 360 : null; if (heading !== null) setBearing(heading); if (typeof event.beta === 'number') setPitch(Math.max(-25, Math.min(55, event.beta - 45))); }; sensorListenerRef.current = orientation; window.addEventListener('deviceorientationabsolute', orientation, true); window.addEventListener('deviceorientation', orientation, true); setSensorStatus('active'); setMessage('Kompas dan kemiringan perangkat aktif.'); } catch { setMessage('Izin sensor tidak diberikan. Anda tetap dapat menggeser peta.'); } };
  const targets = skyMode === 'north' ? ['Polaris', 'Dubhe', 'Merak', 'Alioth', 'Mizar'] : ['Acrux', 'Mimosa', 'Gacrux', 'Alpha Centauri', 'Canopus'];
  return <main className={styles.page}>
    <header className={styles.header}><div><div className={styles.eyebrow}>EPHEMERIS / INDONESIA PILOT</div><h1>Sky Guide</h1></div><div className={styles.location}>{location.name}</div></header>
    <section className={styles.skySection}><SkyDome location={location} now={now} bearing={bearing} pitch={pitch} onBearingChange={setBearing} /><div className={styles.readout}><span>{String(Math.round(bearing)).padStart(3, '0')}°</span><strong>{skyMode === 'north' ? 'UTARA' : 'SELATAN'}</strong><small>{formatDate(now, location.timezone)}</small></div><div className={styles.targetList}><span>{skyMode === 'north' ? 'Northern Sky' : 'Southern Sky'}</span><strong>{targets.join(' · ')}</strong></div></section>
    <section className={styles.controls} aria-label="Kontrol peta langit"><div className={styles.segmented}><button className={skyMode === 'north' ? styles.selected : ''} onClick={() => chooseSky('north')}>Northern Sky</button><button className={skyMode === 'south' ? styles.selected : ''} onClick={() => chooseSky('south')}>Southern Sky</button></div><button className={styles.command} onClick={useGuestLocation}>Gunakan lokasi saya</button><button className={styles.command} onClick={enableSensors}>{sensorStatus === 'active' ? 'Sensor aktif' : 'Aktifkan kompas'}</button></section>
    <p className={styles.status} role="status">{message}</p>
    <section className={styles.calendarSection}><div className={styles.sectionHeading}><div><div className={styles.eyebrow}>KALENDER LANGIT</div><h2>Event Mendatang</h2></div><span>{events.length} event</span></div><div className={styles.eventList}>{events.length ? events.slice(0, 8).map((event) => <button key={event.id} className={styles.eventItem} onClick={() => setActiveEvent(event)}><time>{formatDate(event.startsAt, location.timezone, false)}</time><span className={styles.eventType}>{event.eventType === 'resort' ? 'Resort' : event.eventType === 'meteor' ? 'Meteor' : 'Astronomi'}</span><strong>{event.title}</strong><small>{event.visibility === 'both' ? 'Utara & Selatan' : event.visibility === 'north' ? 'Langit Utara' : 'Langit Selatan'}</small></button>) : <div className={styles.empty}>Belum ada event dalam rentang 90 hari.</div>}</div></section>
    {activeEvent && <div className={styles.dialogBackdrop} onClick={() => setActiveEvent(null)}><article className={styles.dialog} role="dialog" aria-modal="true" aria-label={activeEvent.title} onClick={(event) => event.stopPropagation()}><button className={styles.close} onClick={() => setActiveEvent(null)} aria-label="Tutup detail">×</button><span className={styles.eventType}>{activeEvent.eventType}</span><h2>{activeEvent.title}</h2><p>{formatDate(activeEvent.startsAt, location.timezone)}</p><p>{activeEvent.description || 'Detail event akan diumumkan oleh resort.'}</p>{activeEvent.sourceUrl && <a href={activeEvent.sourceUrl} target="_blank" rel="noreferrer">Sumber: {activeEvent.sourceName || 'Referensi astronomi'}</a>}</article></div>}
  </main>;
}
