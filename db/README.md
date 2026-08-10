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

5. Create `.env.local` in the project root:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ephemeris
SESSION_SECRET=replace-with-a-long-random-secret-at-least-32-chars
```

6. Start the app:

```bash
npm run dev
```

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
- can finish experience
- can mark Signed by Guest

External:
- only sees own bookings
- new bookings become Pending Review
- cannot mark Signed by Guest
```
