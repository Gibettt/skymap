# Ephemeris — Monorepo

Sistem manajemen Observatorium Nasional / resort stargazing, disusun sebagai **monorepo** dengan 5 aplikasi Next.js independen + shared packages.

## Struktur

```
├── apps/
│   ├── landing/   → Domain publik (ephemeris.id): landing page, Sky Guide PWA (/sky), halaman feedback
│   ├── admin-web/ → dashboard admin AKTIF (shadcn, port 3003): booking, keuangan, invoice, pengguna, role, audit
│   ├── staff-web/ → dashboard staff AKTIF (shadcn, port 3004): internal & external
│   ├── admin/     → dashboard admin versi lama (legacy, port 3001)
│   └── staff/     → dashboard staff versi lama (legacy, port 3002)
├── packages/
│   ├── auth/      → @ephemeris/auth: sesi, login/logout handler per role, audit log
│   ├── db/        → @ephemeris/db: koneksi MySQL/PostgreSQL (pool, adapter, query, transaction, validator Zod)
│   ├── events/    → @ephemeris/events: event bus, domain events, notifikasi
│   ├── export/    → @ephemeris/export: laporan Excel
│   ├── finance/   → @ephemeris/finance: kalkulasi harga booking (SC, GST, komisi)
│   ├── sky/       → @ephemeris/sky: kalender astronomi & normalisasi sky event (+ unit test)
│   └── ui/        → @ephemeris/ui: komponen bersama (LoginClient)
├── db/            → schema.sql, seed.sql, migrations/ (Postgres lama) dan mysql/ (MySQL, target utama)
├── pnpm-workspace.yaml
└── turbo.json
```

## Prasyarat

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- MySQL 8 yang sudah diisi `db/mysql/schema.sql` dan `db/mysql/seed.sql` (target utama; `db/schema.sql` Postgres adalah versi lama dan tabel inventory hanya ada di MySQL)

## Setup

```bash
pnpm install
```

Setiap app membaca `.env.local`-nya sendiri (`apps/<app>/.env.local`):

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/ephemeris
SESSION_SECRET=<minimal 32 karakter, sama di semua app>
# Lokal: isi sesuai app, agar login admin/staff tidak saling menimpa di localhost:
# apps/admin/.env.local -> SESSION_COOKIE_NAME=ephemeris_admin_session
# apps/staff/.env.local -> SESSION_COOKIE_NAME=ephemeris_staff_session
# Di produksi dengan subdomain, agar sesi dipakai bersama:
SESSION_COOKIE_DOMAIN=.ephemeris.id
# URL antar app (untuk link lintas subdomain):
NEXT_PUBLIC_STAFF_URL=http://localhost:3002
NEXT_PUBLIC_LANDING_URL=http://localhost:3000
```

## Menjalankan di development

```bash
# Semua app sekaligus (landing:3000, admin:3001, staff:3002)
pnpm dev

# Per app
pnpm dev:landing
pnpm dev:admin
pnpm dev:staff
```

## Build & test

```bash
pnpm build          # build semua app (turbo)
pnpm test           # semua test (packages/*, landing, admin, staff, admin-web, staff-web)
pnpm lint
```

## Portal & kredensial demo

| Portal | URL | Email | Password |
| ------ | --- | ----- | -------- |
| Landing | http://localhost:3000 | — | — |
| Admin | http://localhost:3001/login | admin@ephemeris.id | admin123 |
| Staff | http://localhost:3002/login | internal@ephemeris.id / external@ephemeris.id | internal123 / external123 |
| Admin (aktif) | http://localhost:3003/login | admin@ephemeris.id | admin123 |
| Staff (aktif) | http://localhost:3004/login | internal@ephemeris.id / external@ephemeris.id | internal123 / external123 |

## Deploy (subdomain terpisah)

Setiap app di-deploy sebagai project terpisah (mis. Vercel):

1. **landing** → `ephemeris.id`, root directory `apps/landing`
2. **admin** → `admin.ephemeris.id`, root directory `apps/admin`
3. **staff** → `staff.ephemeris.id`, root directory `apps/staff`

Sesi dibagikan antar subdomain dengan menyetel `SESSION_COOKIE_DOMAIN=.ephemeris.id` dan `SESSION_SECRET` yang identik di ketiga app. Database tetap satu (MySQL).

### Migrasi database

Jalankan berurutan file baru di `db/mysql/` yang belum pernah dijalankan (mis. `042` s/d `045`). App juga menambah kolom/tabel itu sendiri saat pertama dipakai (`ensure*Schema` di `packages/db/schema-ensures.js`), tetapi migrasi tetap cara yang disarankan.

### Pengingat event (staff-web)

Staff external mendapat notifikasi lonceng 48 jam, 24 jam, 3 jam, 2 jam, dan 1 jam sebelum event yang dipublikasikan. Pengingat dikirim oleh endpoint `GET /api/cron/event-reminders` di **staff-web**, yang harus dipanggil terjadwal **setiap 10 menit**:

1. Setel `CRON_SECRET=<string acak panjang>` di env staff-web. Tanpa ini endpoint menjawab 503 dan pengingat mati.
2. Panggil dengan header `Authorization: Bearer <CRON_SECRET>`:
   - Vercel Pro: tambahkan cron `*/10 * * * *` ke path itu di `vercel.json` (Vercel mengirim header tersebut otomatis).
   - Vercel Hobby (cron hanya sekali sehari): pakai penjadwal luar seperti cron-job.org dengan header di atas.

Pengingat yang terlewat (penjadwal sempat mati) tidak dikirim beruntun: hanya pengingat terdekat yang dikirim. Notifikasi hanya di aplikasi (belum ada email/WhatsApp).
