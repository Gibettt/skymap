export default function manifest() {
  return {
    name: 'SpaceCat Astrotourism Sky Guide', short_name: 'SpaceCat Sky Guide', description: 'Peta langit dan kalender astronomi untuk tamu resort.',
    start_url: '/sky', scope: '/sky', display: 'standalone', background_color: '#03070c', theme_color: '#03070c',
    icons: [{ src: '/spacecat-astrotourism-logo.jpg', sizes: '1080x1080', type: 'image/jpeg' }],
  };
}
