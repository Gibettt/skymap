# Ephemeris MySQL

MySQL development berjalan melalui container Docker `ephemeris-mysql` dan menyimpan data di volume `ephemeris-mysql-data`.

## Koneksi DBeaver

- Host: `localhost`
- Port: `3306`
- Database: `ephemeris`
- Username: `root`
- Password: `mysql`
- Saved connection: `Ephemeris MySQL`

Password ini hanya untuk lingkungan development lokal.

## Menjalankan database

Pastikan Docker Desktop aktif, lalu jalankan:

```powershell
docker start ephemeris-mysql
```

Periksa statusnya dengan:

```powershell
docker ps --filter name=ephemeris-mysql
```

## Migrasi ulang dari PostgreSQL

```powershell
corepack pnpm db:migrate:mysql
```

Migrasi memakai PostgreSQL `postgres://postgres:postgres@localhost:5432/ephemeris` sebagai sumber dan MySQL `mysql://root:mysql@localhost:3306/ephemeris` sebagai target secara default.

> Perintah migrasi mengosongkan tabel target MySQL sebelum menyalin ulang data. Jangan jalankan jika MySQL sudah berisi perubahan yang belum dicadangkan.

Skema MySQL ada di [`schema.sql`](./schema.sql). PostgreSQL lama tidak dihapus dan dapat tetap dipakai sebagai salinan cadangan selama masa transisi.

For an existing MySQL database, run `028_invoices.sql` once to add customer
invoices and paid staff-payout receipts without replacing existing data.
Then run `029_customer_payment_confirmation.sql` and
`030_access_role_integrity.sql`, `031_dynamic_sky_event_types.sql`, and
`032_sky_event_image_upload.sql`, `033_public_resort_profiles.sql`, then
`034_configurable_booking_tax.sql` in order. Migration `030` repairs incompatible
role assignments and enforces that every user's access role matches their base
portal role. Migration `031` enables resort-managed sky event types, and migration
`032` stores uploaded event images for the public landing page. Migration `033`
adds staff-managed public resort descriptions, contact details, and cover images.
Migration `034` stores the selected customer tax label and rate on bookings and
generated invoices.
Migration `035_invoice_staff_signatures.sql` adds persistent guest signatures
captured by internal staff to customer invoices.
Migration `036_invoice_resort_tracking.sql` tracks whether a signed customer
invoice has been entered into the resort finance system.
Migration `037_monthly_invoice_submissions.sql` adds resort-scoped monthly
invoice submissions from Internal Staff to the Admin invoice inbox.
Migration `038_monthly_invoice_staff_signatures.sql` stores one responsible
Internal Staff signature for each resort's monthly invoice register.
