# 📋 TODO Perbaikan — Ephemeris Project

> Hasil audit codebase 13 Agustus 2026.
> Centang `[x]` setelah selesai diperbaiki.

---

## 🔴 KRITIS — Harus Segera Diperbaiki

### 1. [ ] Install Zod & Buat Shared Validation Schemas

**Masalah:** Semua validasi backend dilakukan manual `if (!field)` — tidak konsisten, mudah terlewat, error message generik.

**Yang harus dilakukan:**

```bash
pnpm --filter @ephemeris/db add zod
```

Buat folder `packages/db/validators/` dengan file-file berikut:

```
packages/db/validators/
├── common.js       ← uuid, email, phone, cleanText, cleanList
├── booking.js      ← createBookingSchema, updateBookingSchema
├── package.js      ← createPackageSchema, updatePackageSchema
├── payout.js       ← createPayoutRequestSchema, reviewPayoutSchema
├── feedback.js     ← submitFeedbackSchema
├── sky-event.js    ← createSkyEventSchema, updateSkyEventSchema
└── sky-settings.js ← updateSkySettingsSchema
```

**Contoh `packages/db/validators/common.js`:**

```javascript
import { z } from 'zod';

export const uuidSchema = z.string().uuid('ID tidak valid');

export const emailSchema = z
  .string()
  .email('Format email tidak valid')
  .max(254)
  .transform((v) => v.trim().toLowerCase());

export const cleanTextSchema = (max = 500) =>
  z.string().trim().max(max).transform((v) => v || null).optional().nullable();

export const cleanListSchema = (max = 12) =>
  z.array(z.string().trim()).max(max).transform((arr) => arr.filter(Boolean)).optional().default([]);
```

**Contoh `packages/db/validators/booking.js`:**

```javascript
import { z } from 'zod';
import { uuidSchema, emailSchema, cleanTextSchema, cleanListSchema } from './common.js';

export const createBookingSchema = z.object({
  packageId: uuidSchema,
  staffId: uuidSchema.optional(),
  eventDate: z.string().date('Format tanggal tidak valid (YYYY-MM-DD)'),
  timeStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu tidak valid (HH:MM)'),
  timeEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu tidak valid (HH:MM)'),
  guestName: z.string().trim().min(1, 'Nama tamu wajib diisi').max(200),
  guestPhone: z.string().trim().min(1, 'Nomor telepon wajib diisi').max(30),
  guestEmail: emailSchema.optional().nullable(),
  roomNumber: z.string().trim().min(1, 'Nomor kamar wajib diisi').max(20),
  nationality: z.string().trim().min(1, 'Kebangsaan wajib diisi').max(80),
  adultCount: z.number().int().min(0).default(0),
  childCount: z.number().int().min(0).default(0),
  fieldTipIncentiveUsd: z.number().min(0, 'Tip tidak boleh negatif').default(0),
  resortId: uuidSchema.optional().nullable(),
  preferredLanguage: cleanTextSchema(40),
  childAges: cleanTextSchema(120),
  specialOccasion: cleanTextSchema(200),
  guardianName: cleanTextSchema(200),
  guardianPhone: cleanTextSchema(30),
  seatingSetup: cleanTextSchema(120),
  photoRequest: cleanTextSchema(200),
  privacyPreference: cleanTextSchema(120),
  dietaryRestrictions: cleanTextSchema(200),
  rescheduleConsent: cleanTextSchema(120),
  slotStatus: cleanTextSchema(40),
  bookingSource: cleanTextSchema(80),
  addOns: cleanListSchema(12),
  packageNotes: cleanTextSchema(500),
  notes: cleanTextSchema(500),
  paymentMethod: cleanTextSchema(40),
  invoiceNumber: cleanTextSchema(40),
  billingNotes: cleanTextSchema(500),
  weatherCondition: cleanTextSchema(120),
  equipmentNeeded: cleanTextSchema(200),
  assignedAstronomer: cleanTextSchema(120),
  assignedButler: cleanTextSchema(120),
  setupStatus: cleanTextSchema(40),
  tipRecipient: cleanTextSchema(120),
  tipNotes: cleanTextSchema(200),
}).refine((d) => d.adultCount + d.childCount > 0, {
  message: 'Minimal harus ada 1 tamu (dewasa atau anak)',
  path: ['adultCount'],
});
```

**Lalu update setiap route handler, contoh:**

```javascript
// SEBELUM (apps/admin/src/app/api/bookings/route.js)
const body = await request.json();
const packageId = String(body.packageId || '');
if (!packageId || !guestName || ...) {
  return Response.json({ error: 'Invalid booking data' }, { status: 400 });
}

// SESUDAH
import { createBookingSchema } from '@ephemeris/db/validators/booking';

const raw = await request.json();
const parsed = createBookingSchema.safeParse(raw);
if (!parsed.success) {
  return Response.json({
    error: 'Data booking tidak valid',
    details: parsed.error.flatten(),
  }, { status: 400 });
}
const { data } = parsed; // ← type-safe & sudah di-sanitize
```

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — POST
- `apps/admin/src/app/api/bookings/[id]/route.js` — PATCH
- `apps/admin/src/app/api/packages/route.js` — POST
- `apps/admin/src/app/api/packages/[id]/route.js` — PATCH
- `apps/admin/src/app/api/payouts/[id]/route.js` — PATCH
- `apps/admin/src/app/api/sky-events/route.js` — POST
- `apps/admin/src/app/api/sky-events/[id]/route.js` — PATCH
- `apps/admin/src/app/api/sky-settings/route.js` — PUT
- `apps/staff/src/app/api/bookings/route.js` — POST
- `apps/staff/src/app/api/bookings/[id]/route.js` — PATCH
- `apps/staff/src/app/api/payouts/route.js` — POST
- `apps/landing/src/app/api/feedback/[token]/route.js` — POST

---

### 2. [ ] Validasi `eventDate`, `timeStart`, `timeEnd` di Booking

**Masalah:** Field tanggal/waktu dimasukkan langsung dari body tanpa validasi. Jika formatnya salah, PostgreSQL akan tolak dengan error 500 (bukan 400).

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 136-138
- `apps/staff/src/app/api/bookings/route.js` — baris 139-141

**Fix:** Sudah tercover jika kamu mengimplementasi Zod schema dari poin 1 di atas (field `eventDate`, `timeStart`, `timeEnd` sudah ada di schema).

---

### 3. [ ] Tambahkan Security Headers di Semua Apps

**Masalah:** `next.config.mjs` di admin & staff **kosong**. Tidak ada proteksi clickjacking, MIME sniffing, dll.

**File yang harus diubah:**
- `apps/admin/next.config.mjs`
- `apps/staff/next.config.mjs`
- `apps/landing/next.config.mjs` (tambahkan selain yang sudah ada)

**Fix — Tambahkan ke setiap `next.config.mjs`:**

```javascript
/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Uncomment di production setelah HTTPS aktif:
  // { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

---

### 4. [ ] Pindahkan Rate Limiting ke Database/Redis

**Masalah:** Rate limit login menggunakan `new Map()` in-memory — hilang saat restart, tidak efektif di serverless (Vercel).

**File yang harus diubah:**
- `packages/auth/handlers.js` — baris 11-21

**Opsi fix (pilih salah satu):**

**Opsi A — Pakai database (simpel, tanpa tambah dependency):**

```javascript
// packages/auth/handlers.js
async function checkRateLimit(email) {
  const key = email.toLowerCase();
  const windowMinutes = 15;
  const maxAttempts = 10;

  // Buat tabel rate_limit_login di schema.sql terlebih dahulu:
  //   CREATE TABLE IF NOT EXISTS rate_limit_login (
  //     email text NOT NULL,
  //     attempted_at timestamptz NOT NULL DEFAULT now()
  //   );
  //   CREATE INDEX idx_rate_limit_email_time ON rate_limit_login(email, attempted_at);

  const { rows } = await query(
    `SELECT COUNT(*) AS cnt FROM rate_limit_login
     WHERE email = $1 AND attempted_at > now() - interval '${windowMinutes} minutes'`,
    [key]
  );
  if (Number(rows[0].cnt) >= maxAttempts) return false;

  await query('INSERT INTO rate_limit_login (email) VALUES ($1)', [key]);
  return true;
}

// Tambahkan juga cron job atau scheduled cleanup:
// DELETE FROM rate_limit_login WHERE attempted_at < now() - interval '1 hour';
```

**Opsi B — Pakai Vercel KV / Upstash Redis (lebih proper):**

```bash
pnpm --filter @ephemeris/auth add @upstash/ratelimit @upstash/redis
```

```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '15 m'),
});

async function checkRateLimit(email) {
  const { success } = await ratelimit.limit(email.toLowerCase());
  return success;
}
```

---

### 5. [ ] Tambahkan `assertSameOrigin` di Feedback POST

**Masalah:** Endpoint `POST /api/feedback/[token]` di landing adalah satu-satunya POST route yang **tidak memanggil `assertSameOrigin()`**.

**File yang harus diubah:**
- `apps/landing/src/app/api/feedback/[token]/route.js` — baris 31

**Fix:**

```javascript
// SEBELUM
export async function POST(request, { params }) {
  try {
    const { token } = await params;

// SESUDAH
import { assertSameOrigin, jsonError } from '@ephemeris/auth';

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);  // ← tambahkan baris ini
    const { token } = await params;
```

---

## 🟡 PENTING — Perlu Diperbaiki

### 6. [ ] Perbaiki Booking Code Agar Tidak Duplikat

**Masalah:** `bookingCode()` hanya menggunakan 6 digit terakhir timestamp — bisa bentrok jika 2 booking dibuat pada milidetik yang sama.

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 30-32
- `apps/staff/src/app/api/bookings/route.js` — baris 30-32

**Fix — Pindahkan ke shared package dan tambahkan random suffix:**

```javascript
// packages/db/helpers.js (file baru)
import crypto from 'crypto';

export function generateBookingCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LM-${datePart}-${randomPart}`;
  // Contoh: LM-260813-A3F1B2
}

export function generateFeedbackToken() {
  return `fb-${crypto.randomBytes(18).toString('hex')}`;
}
```

---

### 7. [ ] Pindahkan Logika Booking yang Duplikat ke Shared Package

**Masalah:** `cleanText`, `cleanList`, `bookingSelect`, `bookingCode`, `token` di-copy-paste antara admin dan staff (~400 baris duplikat). Sesuai aturan AGENTS.md: logika bersama harus lewat `packages/*`.

**File yang harus diubah:**
- Buat `packages/db/helpers.js` (atau pisah ke beberapa file)
- Refactor `apps/admin/src/app/api/bookings/route.js`
- Refactor `apps/admin/src/app/api/bookings/[id]/route.js`
- Refactor `apps/staff/src/app/api/bookings/route.js`
- Refactor `apps/staff/src/app/api/bookings/[id]/route.js`

**Yang harus dipindahkan ke `packages/db/helpers.js`:**

```javascript
// packages/db/helpers.js
export function cleanText(value, max = 500) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}

export function cleanList(value, max = 12) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, max);
}

export const bookingSelectQuery = `
  SELECT
    b.*,
    p.name AS package_name,
    ...
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  ...
`;
```

---

### 8. [ ] Validasi UUID pada Path Parameters `[id]`

**Masalah:** Semua route `[id]` langsung pakai `id` tanpa cek apakah UUID valid. ID bukan UUID → PostgreSQL error → 500 Internal Server Error (harusnya 400).

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/[id]/route.js`
- `apps/admin/src/app/api/packages/[id]/route.js`
- `apps/admin/src/app/api/payouts/[id]/route.js`
- `apps/admin/src/app/api/sky-events/[id]/route.js`
- `apps/staff/src/app/api/bookings/[id]/route.js`

**Fix — Tambahkan di awal setiap handler `[id]`:**

```javascript
import { uuidSchema } from '@ephemeris/db/validators/common';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const parseId = uuidSchema.safeParse(id);
    if (!parseId.success) {
      return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    }
    // ... lanjut dengan parseId.data sebagai id
```

Atau buat helper:

```javascript
// packages/db/validators/common.js
export function validateId(id) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) throw new ApiError(400, 'ID tidak valid');
  return id;
}
```

---

### 9. [ ] Tambahkan API Routes ke Proxy Middleware Matcher

**Masalah:** Proxy middleware hanya match `/dashboard/:path*`, API routes tidak tercover. Jika satu route handler lupa memanggil `requireUser()`, endpoint terbuka.

**File yang harus diubah:**
- `apps/admin/src/proxy.js`
- `apps/staff/src/proxy.js`

**Fix:**

```javascript
// apps/admin/src/proxy.js
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!auth/).+)',  // ← protect semua API kecuali /api/auth/*
  ],
};

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (session.role !== 'admin') {
    if (pathname.startsWith('/api/')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

---

### 10. [ ] Konfigurasi Database Pool dengan Proper Settings

**Masalah:** Pool dibuat tanpa `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`. Default max = 10 koneksi per app. Dengan 3 apps bisa overload PostgreSQL.

**File yang harus diubah:**
- `packages/db/index.js` — baris 11-14

**Fix:**

```javascript
pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    : false,
  max: parseInt(process.env.DB_POOL_MAX || '5', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
```

---

### 11. [ ] Perbaiki SSL Config untuk Production

**Masalah:** `rejectUnauthorized: false` menerima sertifikat SSL apapun termasuk palsu — berbahaya di production (man-in-the-middle).

**File yang harus diubah:**
- `packages/db/index.js` — baris 13

**Fix:**

```javascript
// SEBELUM
ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,

// SESUDAH
ssl: process.env.DATABASE_SSL === 'true'
  ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
  : false,
```

Ini akan reject sertifikat tidak valid di production, tapi tetap lenient di development.

---

## 🟠 SEDANG — Code Quality

### 12. [ ] Hapus Duplicate Login/Logout Routes

**Masalah:** Admin dan staff punya DUA set login routes — `/api/login` dan `/api/auth/login`. Begitu juga logout. Ini membingungkan dan memperluas attack surface.

**File yang harus dihapus (pilih yang tidak dipakai):**

Cek di frontend mana yang dipanggil, lalu hapus yang lainnya:
- `apps/admin/src/app/api/login/route.js` ← kemungkinan ini yang lama
- `apps/admin/src/app/api/logout/route.js` ← kemungkinan ini yang lama
- `apps/staff/src/app/api/login/route.js` ← kemungkinan ini yang lama
- `apps/staff/src/app/api/logout/route.js` ← kemungkinan ini yang lama

**Cara cek mana yang dipakai:**

```bash
# Cari di semua file frontend mana URL login yang dipanggil
grep -r "api/login" apps/admin/src --include="*.js" --include="*.jsx" -l
grep -r "api/auth/login" apps/admin/src --include="*.js" --include="*.jsx" -l
```

---

### 13. [ ] Ubah `GET /api/me` untuk Pakai `requireUser()`

**Masalah:** Endpoint `/api/me` pakai `currentUser()` (return null jika tidak login) sedangkan semua route lain pakai `requireUser()` (throw 401). Ini inkonsisten.

**File yang harus diubah:**
- `apps/admin/src/app/api/me/route.js`
- `apps/staff/src/app/api/me/route.js`

**Fix (pilih salah satu):**

```javascript
// Opsi A: Paksa login (konsisten)
import { requireUser, jsonError } from '@ephemeris/auth';

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}

// Opsi B: Tetap return null tapi tambahkan comment kenapa
// (jika frontend memang butuh cek "sudah login atau belum")
```

---

### 14. [ ] Tambahkan Input Length Limit pada `cleanText` di Bookings

**Masalah:** `cleanText` di bookings tidak ada limit panjang — user bisa kirim string 1MB untuk field `notes`. Bandingkan dengan payouts yang sudah ada `text.slice(0, max)`.

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 38-41
- `apps/admin/src/app/api/bookings/[id]/route.js` — baris 7-9
- `apps/staff/src/app/api/bookings/route.js` — baris 38-41
- `apps/staff/src/app/api/bookings/[id]/route.js` — baris 7-9

**Fix:** Sudah tercover jika kamu mengimplementasi poin 7 (pindahkan ke shared package dengan `cleanText(value, max = 500)`). Jika belum, minimal ubah:

```javascript
function cleanText(value, max = 500) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}
```

---

### 15. [ ] Kurangi Data yang Disimpan di Audit Log

**Masalah:** `writeAudit` menyimpan seluruh row before/after (termasuk semua field keuangan, data tamu). Tabel `audit_logs` akan membesar sangat cepat.

**File yang harus diubah:**
- `packages/auth/audit.js`

**Fix — Filter field sensitif/tidak perlu:**

```javascript
const AUDIT_EXCLUDE_FIELDS = new Set([
  'password_hash',
  'add_ons',        // bisa besar
]);

function sanitizeAuditData(data) {
  if (!data || typeof data !== 'object') return data;
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (AUDIT_EXCLUDE_FIELDS.has(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export async function writeAudit(client, { actorId, action, entityType, entityId, beforeData, afterData, request }) {
  // ... existing code ...
  await client.query(
    `INSERT INTO audit_logs ...`,
    [
      // ...
      beforeData ? JSON.stringify(sanitizeAuditData(beforeData)) : null,
      afterData ? JSON.stringify(sanitizeAuditData(afterData)) : null,
      // ...
    ]
  );
}
```

---

## 🟢 RINGAN — Best Practice

### 16. [ ] Tangani JSON Parse Error dengan Proper 400 Response

**Masalah:** Jika body bukan valid JSON, `request.json()` throw `SyntaxError` yang ditangkap catch sebagai 500.

**Fix — Buat helper di `@ephemeris/auth` atau `@ephemeris/db`:**

```javascript
// packages/auth/index.js — tambahkan export
export async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'Request body bukan JSON yang valid');
  }
}
```

Lalu ganti semua `await request.json()` dengan `await parseJsonBody(request)`.

---

### 17. [ ] Tambahkan Pagination pada GET Bookings & Payouts

**Masalah:** `GET /api/bookings` memuat SEMUA data tanpa LIMIT. Saat data banyak (1000+ bookings), response jadi lambat.

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 51
- `apps/admin/src/app/api/packages/route.js` — baris 10
- `apps/admin/src/app/api/payouts/route.js` — baris 7-27
- `apps/staff/src/app/api/bookings/route.js` — baris 54

**Fix:**

```javascript
export async function GET(request) {
  try {
    const user = await requireUser(['admin']);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 100);
    const offset = (page - 1) * limit;

    const { rows } = await query(
      `${bookingSelect} ORDER BY b.event_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countRows } = await query('SELECT COUNT(*) FROM bookings');
    const total = Number(countRows[0].count);

    return Response.json({
      bookings: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return jsonError(error);
  }
}
```

---

### 18. [ ] Pertimbangkan Integer Cents untuk Kalkulasi Keuangan

**Masalah:** `roundUsd()` menggunakan floating point yang bisa akumulasi rounding error pada chain kalkulasi.

**File yang harus diubah:**
- `packages/finance/index.js`

**Fix (opsional, jika akurasi penting):**

```javascript
// Kalkulasi pakai integer cents, convert ke USD di akhir saja
function toCents(usd) { return Math.round(Number(usd) * 100); }
function toUsd(cents) { return cents / 100; }

export function calculateBookingTotals({ adultCount, childCount, adultPriceUsd, childPriceUsd }) {
  const baseCents = (adultCount * toCents(adultPriceUsd)) + (childCount * toCents(childPriceUsd));
  const scCents = Math.round(baseCents * 0.10);
  const gstCents = Math.round(baseCents * 0.17);
  // ... semua kalkulasi dalam cents
  return {
    baseTotalUsd: toUsd(baseCents),
    serviceChargeUsd: toUsd(scCents),
    // ...
  };
}
```

---

### 19. [ ] Set Explicit Body Size Limit

**Masalah:** Tidak ada explicit body size limit di next config. Default Next.js = 1MB, tapi lebih baik eksplisit.

**File yang harus diubah:**
- `apps/admin/next.config.mjs`
- `apps/staff/next.config.mjs`

**Fix — Sudah tercover saat menambahkan security headers (poin 3). Opsional tambahkan:**

```javascript
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '512kb',
    },
  },
  // ... headers config
};
```

---

## ✅ Yang Sudah Bagus (Tidak Perlu Diubah)

- ✅ Semua SQL query pakai **parameterized queries** (`$1`, `$2`) — aman dari SQL injection
- ✅ Password hashing: **PBKDF2 SHA-256 (310.000 rounds)** — sangat kuat
- ✅ Session: **HMAC SHA-256 signing** — tidak bisa dipalsukan
- ✅ Cookie: `httpOnly`, `sameSite: lax`, `secure` in production
- ✅ CSRF: `assertSameOrigin()` di hampir semua mutating routes
- ✅ RBAC: `requireUser(['admin'])` di setiap protected route
- ✅ Audit logging untuk semua write operations
- ✅ Database constraints (CHECK, ENUM, NOT NULL, UNIQUE) sebagai defense terakhir
- ✅ Transaction wrapper dengan proper BEGIN/COMMIT/ROLLBACK
- ✅ Timing-safe password comparison (`crypto.timingSafeEqual`)

---

## 📊 Urutan Pengerjaan yang Disarankan

| Urutan | Poin | Estimasi | Kenapa duluan |
|:------:|------|----------|---------------|
| 1 | #1 + #2 | 2-3 jam | Install Zod + buat semua schemas (sekaligus fix validasi tanggal) |
| 2 | #5 | 2 menit | Satu baris tambahan `assertSameOrigin()` |
| 3 | #3 | 15 menit | Copy-paste security headers ke 3 config files |
| 4 | #8 | 30 menit | Validasi UUID di 5 route files |
| 5 | #10 + #11 | 10 menit | Pool config + SSL fix di 1 file |
| 6 | #12 | 15 menit | Hapus duplicate login routes |
| 7 | #6 + #7 + #14 | 1-2 jam | Buat shared helpers, refactor booking code, tambah length limit |
| 8 | #9 | 30 menit | Update proxy matcher |
| 9 | #4 | 1 jam | Pindahkan rate limit ke DB/Redis |
| 10 | #13, #15, #16 | 30 menit | Quick fixes: me route, audit filter, JSON parse |
| 11 | #17 | 1 jam | Pagination |
| 12 | #18, #19 | Opsional | Finance cents + body limit |
