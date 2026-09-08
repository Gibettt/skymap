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
`030_access_role_integrity.sql` in order. Migration `030` repairs incompatible
role assignments and enforces that every user's access role matches their base
portal role.
