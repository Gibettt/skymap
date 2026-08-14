# 📋 TODO Perbaikan — Ephemeris Project

> Hasil audit codebase 13 Agustus 2026 (diperbarui sore).
> Centang `[x]` setelah selesai diperbaiki.

---

## 🔴 KRITIS — Harus Segera Diperbaiki

### 1. [x] Install Zod & Buat Shared Validation Schemas

**Status:** ❌ Belum dikerjakan — folder `packages/db/validators/` belum ada, Zod belum terinstal.

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
- `apps/admin/src/app/api/bookings/route.js` — POST (baris 58+)
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

### 2. [x] Validasi `eventDate`, `timeStart`, `timeEnd` di Booking

**Status:** ❌ Belum — field tanggal/waktu masih dimasukkan langsung tanpa validasi format.

**Masalah:** Field tanggal/waktu dimasukkan langsung dari body tanpa validasi. Jika formatnya salah, PostgreSQL akan tolak dengan error 500 (bukan 400).

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js`
- `apps/staff/src/app/api/bookings/route.js`

**Fix:** Sudah tercover jika kamu mengimplementasi Zod schema dari poin 1 di atas (field `eventDate`, `timeStart`, `timeEnd` sudah ada di schema).

---

### 3. [x] Tambahkan Security Headers di Semua Apps

**Status:** ❌ Belum — `admin` & `staff` config kosong (`{}`). Landing hanya punya header parsial untuk `/sky/:path*` (Permissions-Policy & Referrer-Policy), bukan security headers global.

**Masalah:** Tidak ada proteksi clickjacking, MIME sniffing, dll di admin & staff. Landing hanya partial.

**File yang harus diubah:**
- `apps/admin/next.config.mjs` — saat ini `const nextConfig = {};`
- `apps/staff/next.config.mjs` — saat ini `const nextConfig = {};`
- `apps/landing/next.config.mjs` — tambahkan security headers global di samping yang sudah ada untuk `/sky/:path*`

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

> **Catatan untuk landing:** Gabungkan dengan header existing untuk `/sky/:path*`.

---

### 4. [x] Pindahkan Rate Limiting ke Database/Redis

**Status:** ❌ Belum — masih in-memory `new Map()`.

**Masalah:** Rate limit login menggunakan `new Map()` in-memory — hilang saat restart, tidak efektif di serverless (Vercel).

**File yang harus diubah:**
- `packages/auth/handlers.js` — baris 11-21

**Kondisi saat ini:**

```javascript
const loginAttempts = new Map();

function checkRateLimit(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const attempts = (loginAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (attempts.length >= 10) return false;
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return true;
}
```

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

### 5. [x] Tambahkan `assertSameOrigin` di Feedback POST

**Status:** ❌ Belum — `POST /api/feedback/[token]` di landing **tidak memanggil `assertSameOrigin()`**.

**Masalah:** Endpoint feedback POST terbuka tanpa CSRF protection. Import `assertSameOrigin` juga belum ada.

**File yang harus diubah:**
- `apps/landing/src/app/api/feedback/[token]/route.js` — baris 1 dan 31

**Kondisi saat ini (baris 1, 31-33):**

```javascript
import { jsonError } from '@ephemeris/auth';
// ...
export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
```

**Fix:**

```javascript
// SESUDAH
import { assertSameOrigin, jsonError } from '@ephemeris/auth';

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);  // ← tambahkan baris ini
    const { token } = await params;
```

---

## 🟡 PENTING — Perlu Diperbaiki

### 6. [x] Perbaiki Booking Code Agar Tidak Duplikat

**Status:** ❌ Belum — masih hanya 6 digit timestamp, berpotensi bentrok.

**Masalah:** `bookingCode()` hanya menggunakan 6 digit terakhir timestamp — bisa bentrok jika 2 booking dibuat pada milidetik yang sama.

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 30-32
- `apps/staff/src/app/api/bookings/route.js` — baris 30-32

**Kondisi saat ini (kedua file identik):**

```javascript
function bookingCode() {
  return `LM-SKY-${Date.now().toString().slice(-6)}`;
}
```

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

### 7. [x] Pindahkan Logika Booking yang Duplikat ke Shared Package

**Status:** ❌ Belum — `cleanText`, `cleanList`, `bookingSelect`, `bookingCode`, `token` masih di-copy-paste antara admin dan staff. `packages/db/helpers.js` belum ada.

**Masalah:** ~400 baris duplikat di admin & staff. Sesuai aturan AGENTS.md: logika bersama harus lewat `packages/*`.

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
    p.package_type,
    p.experience_type,
    p.location,
    u.name AS staff_name,
    u.role AS staff_role,
    r.name AS resort_name,
    r.code AS resort_code,
    r.location AS resort_location,
    ft.token AS feedback_token,
    ft.status AS feedback_status,
    fs.rating,
    fs.comment
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  JOIN users u ON u.id = b.staff_id
  LEFT JOIN resorts r ON r.id = b.resort_id
  LEFT JOIN feedback_tokens ft ON ft.booking_id = b.id
  LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
`;
```

---

### 8. [x] Validasi UUID pada Path Parameters `[id]`

**Status:** ❌ Belum — semua route `[id]` langsung pakai `id` dari params tanpa validasi format UUID.

**Masalah:** ID bukan UUID → PostgreSQL error → 500 Internal Server Error (harusnya 400).

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

Atau buat helper tanpa Zod:

```javascript
// packages/db/helpers.js
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(id) {
  if (!UUID_RE.test(id)) {
    throw new ApiError(400, 'ID tidak valid');
  }
  return id;
}
```

---

### 9. [x] Tambahkan API Routes ke Proxy Middleware Matcher

**Status:** ❌ Belum — proxy hanya match `/dashboard/:path*`.

**Masalah:** Proxy middleware hanya match `/dashboard/:path*`, API routes tidak tercover. Jika satu route handler lupa memanggil `requireUser()`, endpoint terbuka.

**File yang harus diubah:**
- `apps/admin/src/proxy.js` — saat ini `matcher: '/dashboard/:path*'`
- `apps/staff/src/proxy.js` — saat ini `matcher: '/dashboard/:path*'`

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

### 10. [x] Konfigurasi Database Pool dengan Proper Settings

**Status:** ❌ Belum — pool dibuat tanpa `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`.

**Masalah:** Default max = 10 koneksi per app. Dengan 3 apps bisa overload PostgreSQL.

**File yang harus diubah:**
- `packages/db/index.js` — baris 11-14

**Kondisi saat ini:**

```javascript
pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
```

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

### 11. [x] Perbaiki SSL Config untuk Production

**Status:** ❌ Belum — masih `rejectUnauthorized: false` hardcoded.

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

### 12. [x] Hapus / Bersihkan Duplicate Login/Logout Routes

**Status:** ⚠️ Sebagian diperbaiki — route duplikat masih **ada secara fisik**, tapi sekarang hanya berisi re-export ke `/api/auth/*`.

**Kondisi saat ini:**

```javascript
// apps/admin/src/app/api/login/route.js (44 bytes)
export { POST } from '../auth/login/route';

// apps/admin/src/app/api/logout/route.js (45 bytes)
export { POST } from '../auth/logout/route';

// Sama di apps/staff/
```

**Masalah yang tersisa:** Walaupun bukan duplikat penuh lagi, dua URL paths (`/api/login` + `/api/auth/login`) tetap memperluas attack surface. Sebaiknya hapus re-export dan pastikan frontend hanya memakai `/api/auth/login`.

**File yang harus dihapus (jika frontend sudah pakai `/api/auth/login`):**
- `apps/admin/src/app/api/login/route.js`
- `apps/admin/src/app/api/logout/route.js`
- `apps/staff/src/app/api/login/route.js`
- `apps/staff/src/app/api/logout/route.js`

**Cara cek mana yang dipakai:**

```bash
# Cari di semua file frontend mana URL login yang dipanggil
grep -r "api/login" apps/admin/src --include="*.js" --include="*.jsx" -l
grep -r "api/auth/login" apps/admin/src --include="*.js" --include="*.jsx" -l
```

---

### 13. [x] Ubah `GET /api/me` untuk Pakai `requireUser()`

**Status:** ❌ Belum — masih pakai `currentUser()`.

**Masalah:** Endpoint `/api/me` pakai `currentUser()` (return null jika tidak login) sedangkan semua route lain pakai `requireUser()` (throw 401). Ini inkonsisten.

**Kondisi saat ini (kedua file identik):**

```javascript
import { currentUser, jsonError } from '@ephemeris/auth';

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ user: null });
    return Response.json({ user });
  } catch (err) {
    return jsonError(err);
  }
}
```

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

### 14. [x] Tambahkan Input Length Limit pada `cleanText` di Bookings

**Status:** ❌ Belum — `cleanText` di booking routes admin & staff tidak ada parameter max length.

**Masalah:** User bisa kirim string 1MB untuk field `notes`. Bandingkan dengan payouts yang sudah ada `text.slice(0, max)`.

**Kondisi saat ini di booking routes:**

```javascript
// apps/admin/src/app/api/bookings/route.js (baris 38-41)
function cleanText(value) {
  const text = String(value || '').trim();
  return text || null;
}
```

**Di payouts sudah benar:**

```javascript
// apps/admin/src/app/api/payouts/[id]/route.js
function cleanText(v, max = 500) {
  const text = String(v ?? '').trim();
  return text ? text.slice(0, max) : null;
}
```

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — baris 38-41
- `apps/admin/src/app/api/bookings/[id]/route.js`
- `apps/staff/src/app/api/bookings/route.js` — baris 38-41
- `apps/staff/src/app/api/bookings/[id]/route.js`

**Fix:** Sudah tercover jika kamu mengimplementasi poin 7 (pindahkan ke shared package dengan `cleanText(value, max = 500)`). Jika belum, minimal ubah:

```javascript
function cleanText(value, max = 500) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}
```

---

### 15. [x] Kurangi Data yang Disimpan di Audit Log

**Status:** ❌ Belum — `writeAudit` menyimpan seluruh row before/after tanpa filter.

**Masalah:** `writeAudit` menyimpan seluruh row before/after (termasuk semua field keuangan, data tamu). Tabel `audit_logs` akan membesar sangat cepat.

**Kondisi saat ini:**

```javascript
// packages/auth/audit.js
export async function writeAudit(client, { actorId, action, entityType, entityId, beforeData, afterData, request }) {
  const ip =
    request?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    request?.headers?.get?.('x-real-ip') ||
    null;

  await client.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      actorId, action, entityType, entityId,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData  ? JSON.stringify(afterData)  : null,
      ip,
    ],
  );
}
```

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

### 16. [x] Tangani JSON Parse Error dengan Proper 400 Response

**Status:** ❌ Belum — tidak ada helper `parseJsonBody`. Semua route pakai `await request.json()` langsung.

**Masalah:** Jika body bukan valid JSON, `request.json()` throw `SyntaxError` yang ditangkap catch sebagai 500.

**Fix — Buat helper di `@ephemeris/auth`:**

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

### 17. [x] Tambahkan Pagination pada GET Bookings & Payouts

**Status:** ❌ Belum — semua GET endpoint memuat SEMUA data tanpa LIMIT.

**Masalah:** Saat data banyak (1000+ bookings), response jadi lambat.

**Kondisi saat ini:**

```javascript
// apps/admin/src/app/api/bookings/route.js (baris 51)
const { rows } = await query(`${bookingSelect} ORDER BY b.event_date DESC, b.created_at DESC`);

// apps/admin/src/app/api/packages/route.js
const { rows } = await query('SELECT * FROM packages ORDER BY created_at DESC');

// apps/staff/src/app/api/bookings/route.js
const { rows } = await query(`${bookingSelect} ORDER BY b.event_date DESC, b.time_start DESC`);
```

> **Catatan:** `audit-logs` route sudah punya LIMIT (baris 8, max 200). ✅

**File yang harus diubah:**
- `apps/admin/src/app/api/bookings/route.js` — GET
- `apps/admin/src/app/api/packages/route.js` — GET
- `apps/admin/src/app/api/payouts/route.js` — GET
- `apps/staff/src/app/api/bookings/route.js` — GET

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

### 18. [x] Pertimbangkan Integer Cents untuk Kalkulasi Keuangan

**Status:** ❌ Belum — masih floating point `roundUsd()`.

**Masalah:** `roundUsd()` menggunakan floating point yang bisa akumulasi rounding error pada chain kalkulasi.

**Kondisi saat ini:**

```javascript
// packages/finance/index.js (baris 21)
const roundUsd = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
```

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

### 19. [x] Set Explicit Body Size Limit

**Status:** ❌ Belum — tidak ada konfigurasi body size limit.

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

### 20. [x] (BARU) Validasi Input di Route Notifications PATCH

**Status:** ❌ Belum.

**Masalah:** `apps/admin/src/app/api/notifications/route.js` PATCH menerima array `ids` dan memasukkannya ke query `ANY($2::uuid[])` tanpa validasi format UUID per elemen. Jika ID bukan UUID valid, PostgreSQL akan error 500.

**File yang harus diubah:**
- `apps/admin/src/app/api/notifications/route.js` — baris 124-140

**Kondisi saat ini (baris 124-140):**

```javascript
const body = await request.json();
const ids = Array.isArray(body.ids) ? body.ids : [body.id];
const cleanIds = ids
  .map((id) => String(id || '').trim())
  .filter(Boolean)
  .slice(0, 50);

// ... langsung masuk ke query:
const { rows } = await transaction(async (client) => client.query(
  `UPDATE notifications
   SET read_at = COALESCE(read_at, now())
   WHERE recipient_user_id = $1
     AND id = ANY($2::uuid[])
   RETURNING id, read_at`,
  [user.id, cleanIds]
));
```

**Fix:** Tambahkan validasi UUID untuk setiap elemen `cleanIds` sebelum query.

---

## ✅ Yang Sudah Bagus (Tidak Perlu Diubah)

- ✅ Semua SQL query pakai **parameterized queries** (`$1`, `$2`) — aman dari SQL injection
- ✅ Password hashing: **PBKDF2 SHA-256 (310.000 rounds)** — sangat kuat
- ✅ Session: **HMAC SHA-256 signing** — tidak bisa dipalsukan
- ✅ Cookie: `httpOnly`, `sameSite: lax`, `secure` in production
- ✅ CSRF: `assertSameOrigin()` di semua mutating routes internal (**kecuali** feedback landing — poin #5)
- ✅ RBAC: `requireUser(['admin'])` di setiap protected route
- ✅ Audit logging untuk semua write operations
- ✅ Database constraints (CHECK, ENUM, NOT NULL, UNIQUE) sebagai defense terakhir
- ✅ Transaction wrapper dengan proper BEGIN/COMMIT/ROLLBACK
- ✅ Timing-safe password comparison (`crypto.timingSafeEqual`)
- ✅ Login/logout route handler sudah di-refactor ke `@ephemeris/auth` (`createLoginHandler`, `createLogoutHandler`)
- ✅ Audit-logs GET endpoint sudah punya LIMIT (max 200)
- ✅ Notifications route sudah memiliki `assertSameOrigin` dan `requireUser(['admin'])`

---

## 📊 Urutan Pengerjaan yang Disarankan

| Urutan | Poin | Estimasi | Kenapa duluan |
|:------:|------|----------|---------------|
| 1 | #5 | 2 menit | Satu baris tambahan `assertSameOrigin()` di feedback |
| 2 | #1 + #2 | 2-3 jam | Install Zod + buat semua schemas (sekaligus fix validasi tanggal) |
| 3 | #3 | 15 menit | Copy-paste security headers ke 3 config files |
| 4 | #8 + #20 | 30 menit | Validasi UUID di semua route `[id]` + notifications |
| 5 | #10 + #11 | 10 menit | Pool config + SSL fix di 1 file |
| 6 | #12 | 15 menit | Hapus re-export login/logout routes |
| 7 | #6 + #7 + #14 | 1-2 jam | Buat shared helpers, refactor booking code, tambah length limit |
| 8 | #9 | 30 menit | Update proxy matcher |
| 9 | #4 | 1 jam | Pindahkan rate limit ke DB/Redis |
| 10 | #13, #15, #16 | 30 menit | Quick fixes: me route, audit filter, JSON parse |
| 11 | #17 | 1 jam | Pagination |
| 12 | #18, #19 | Opsional | Finance cents + body limit |

---

## 📝 Catatan Perubahan Struktur Sejak Audit Awal

Berikut hal-hal **baru** yang terdeteksi di codebase dibanding audit awal:

| Komponen Baru | Path | Keterangan |
|--------------|------|------------|
| Audit Logs API | `apps/admin/src/app/api/audit-logs/route.js` | GET endpoint dengan LIMIT. ✅ Sudah bagus |
| Notifications API | `apps/admin/src/app/api/notifications/route.js` | GET + PATCH. Perlu validasi UUID (poin #20) |
| Sky Events API (landing) | `apps/landing/src/app/api/sky-events/route.js` | Read-only endpoint untuk publik |
| Sky Settings API (landing) | `apps/landing/src/app/api/sky-settings/route.js` | Read-only endpoint untuk publik |
| Packages API (staff) | `apps/staff/src/app/api/packages/route.js` | Staff bisa lihat packages |
| LoginClient component | `packages/ui/LoginClient.jsx` | Shared login UI component |
| Auth session module | `packages/auth/session.js` | Session handling terpisah |
| Sky calendar module | `packages/sky/calendar.js` | Kalkulasi kalender astronomi |
| Sky events module | `packages/sky/events.js` | Data event astronomi |
| DB Migrations (9 file) | `db/migrations/001-009` | Schema evolution history |
| Login re-exports | `apps/*/src/app/api/login/route.js` | Re-export ke auth (lihat poin #12) |
