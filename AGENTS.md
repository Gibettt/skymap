# Ephemeris Monorepo — Panduan Agen AI

Proyek ini adalah **pnpm monorepo** dengan Turborepo:

- **5 app Next.js** di `apps/`: `landing` (publik), `admin-web` + `staff-web` (dashboard AKTIF, shadcn), `admin` + `staff` (versi lama, legacy). Perbaikan dibuat di `*-web` dulu; cek apakah kembaran legacy-nya perlu perbaikan yang sama.
- **Shared packages** di `packages/`: `@ephemeris/auth`, `@ephemeris/db`, `@ephemeris/events`, `@ephemeris/export`, `@ephemeris/finance`, `@ephemeris/sky`, `@ephemeris/ui`.
- **Database** di `db/` (satu database dipakai semua app). Dalam praktik MySQL: skema di `db/mysql/`, dan `packages/db/mysql-adapter.js` menerjemahkan SQL gaya Postgres saat runtime. Jangan menulis SQL Postgres-only (cast `::tipe` yang tidak ada di daftar adapter akan gagal di MySQL).

## Aturan

- **Jangan mengimpor antar app.** Logika bersama harus lewat `packages/*`.
- Setiap app punya `.env.local` sendiri, `proxy.js`/`proxy.ts` sendiri (guard role), dan `globals.css` sendiri.
- Versi Next.js di proyek ini adalah kustom dengan breaking changes (lihat `node_modules/next/dist/docs/` sebelum menulis kode). Heed deprecation notices.
- Test: `node --test test/*.test.mjs` di tiap package/app (`packages/*`, `apps/landing|admin|staff|admin-web|staff-web`); `pnpm test` menjalankan semuanya lewat turbo.
- Perintah: `pnpm dev` (semua app), `pnpm dev:landing|admin|staff|admin-web|staff-web`, `pnpm build`, `pnpm test`, `pnpm lint`.
