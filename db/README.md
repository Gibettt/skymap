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

Then run `db/migrations/018_sky_guide_internal_ownership.sql` once to move Sky Guide
management authority from Admin to active Internal staff at the database boundary.

Then run `db/migrations/019_resort_calendar_and_booking_assignment.sql` once to scope
events per resort and add the external-review/internal-assignment booking flow.

Then run `db/migrations/020_user_presence.sql` once to store staff heartbeat and
activity timestamps for the realtime Admin presence view.

Then run `db/migrations/021_resort_staff_coverage.sql` once to add the resort
coverage read model and protect activation, deactivation, and last-staff changes.

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
- exclusively manages Sky Guide events and observatory coordinates
- earns commission only; star rewards are bypassed

External:
- belongs to one resort profile but sees only bookings they created
- new bookings wait for approval by Internal staff at the same resort
- can submit and view bookings, but cannot change operational status
- earns commission plus monthly star rewards on chargeable packages
```
