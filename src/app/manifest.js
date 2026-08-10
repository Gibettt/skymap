export default function manifest() {
  return {
    name: 'Ephemeris Sky Guide', short_name: 'Sky Guide', description: 'Peta langit dan kalender astronomi untuk tamu resort.',
    start_url: '/sky', scope: '/sky', display: 'standalone', background_color: '#03070c', theme_color: '#03070c',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  };
}
