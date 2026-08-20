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

For an existing database created before this refactor, back up the database and run
`db/migrations/015_booking_rbac_rewards_and_resorts.sql` once. It migrates legacy
booking/payout values before replacing their constraints and read models.

Then run `db/migrations/016_package_inclusions.sql` once to add the ordered
Including items managed by Admin and backfill the existing package content.

Then run `db/migrations/017_package_schedule.sql` once to add the Schedule field,
backfill existing package schedules, and make Admin the source used by Landing.

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
- sees and manages all bookings assigned to their own resort
- can complete, cancel, sign, and reschedule resort bookings
- earns commission only; star rewards are bypassed

External:
- belongs to one resort profile but sees only bookings they created
- new bookings are stored immediately with active status
- can submit and view bookings, but cannot change operational status
- earns commission plus monthly star rewards on chargeable packages
```
