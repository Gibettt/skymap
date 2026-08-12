# Ephemeris SQL Setup

Target database: PostgreSQL.

## DBeaver Steps

1. Create a PostgreSQL database, for example:

```sql
CREATE DATABASE ephemeris;
```

2. Connect DBeaver to that database.

3. Run `db/schema.sql`.

4. Run `db/seed.sql`.

5. Create `.env.local` in **each app folder** (`apps/landing`, `apps/admin`, `apps/staff`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ephemeris
SESSION_SECRET=replace-with-a-long-random-secret-at-least-32-chars
# Hanya di produksi dengan subdomain, agar sesi dibagi antar app:
SESSION_COOKIE_DOMAIN=.ephemeris.id
```

6. Start semua app dari root monorepo:

```bash
pnpm install
pnpm dev
```

Setiap app berjalan di port berbeda: landing `:3000`, admin `:3001`, staff `:3002`.

## Demo Accounts

```text
Admin:    admin@ephemeris.id / admin123
Internal: internal@ephemeris.id / internal123
External: external@ephemeris.id / external123
```

## Role Rules

```text
Admin:
- full dashboard access
- package/price management
- audit log
- all booking and finance reports

Internal:
- operational booking access
- can see all internal and external staff bookings
- staff-created bookings become Pending Review until admin accepts or rejects them
- can finish experience
- can mark Signed by Guest

External:
- belongs to one resort profile
- sees bookings from the same resort profile
- new bookings become Pending Review until admin accepts or rejects them
- cannot mark Signed by Guest
```
