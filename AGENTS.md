# Ephemeris Monorepo — Panduan Agen AI

Proyek ini adalah **pnpm monorepo** dengan Turborepo:

- **3 app Next.js** di `apps/`: `landing` (publik), `admin`, `staff` (internal + external).
- **Shared packages** di `packages/`: `@ephemeris/auth`, `@ephemeris/db`, `@ephemeris/finance`, `@ephemeris/sky`, `@ephemeris/ui`.
- **Database** di `db/` (satu PostgreSQL dipakai semua app).

## Aturan

- **Jangan mengimpor antar app.** Logika bersama harus lewat `packages/*`.
- Setiap app punya `.env.local` sendiri, `proxy.js` sendiri (guard role), dan `globals.css` sendiri.
- Versi Next.js di proyek ini adalah kustom dengan breaking changes (lihat `node_modules/next/dist/docs/` sebelum menulis kode). Heed deprecation notices.
- Test berada di `packages/sky/test/`; jalankan dengan `pnpm --filter @ephemeris/sky test`.
- Perintah: `pnpm dev` (semua app), `pnpm dev:landing|admin|staff`, `pnpm build`, `pnpm test`, `pnpm lint`.
