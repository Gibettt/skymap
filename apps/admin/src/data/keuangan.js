import { PACKAGE_CATALOG } from './bookings';

export const SERVICE_CHARGE_RATE = 0.10;
export const GST_RATE = 0.17;
export const OPERATION_SHARE_RATE = 0.50;
export const STAFF_COMMISSION_RATE = 0.05;
export const INTERNAL_COMMISSION_BASE_RATE = 0.10;
export const INTERNAL_COMMISSION_SHARE_RATE = 0.90;
export const CURRENCY = 'USD';

export const PELANGGAN = [
  { id: 'INT-001', nama: 'Ahmad Fauzi', email: 'internal@ephemeris.id', institusi: 'Le Meridien Maldives', role: 'internal' },
  { id: 'INT-002', nama: 'Siti Nurhaliza', email: 'siti@ephemeris.id', institusi: 'Le Meridien Maldives', role: 'internal' },
  { id: 'EXT-001', nama: 'Budi Santoso', email: 'external@ephemeris.id', institusi: 'External Sales Partner', role: 'external' },
];

export const OBSERVER_MAP = Object.fromEntries(PELANGGAN.map((p) => [p.nama, p]));

export function hitungDurasi(timeStart, timeEnd) {
  const [sh, sm] = timeStart.split(':').map(Number);
  const [eh, em] = timeEnd.split(':').map(Number);
  let menit = (eh * 60 + em) - (sh * 60 + sm);
  if (menit <= 0) menit += 24 * 60;
  return menit / 60;
}

const roundUsd = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function getPackageRate(packageName) {
  return PACKAGE_CATALOG.find((p) => p.name === packageName) || PACKAGE_CATALOG[0];
}

export function calculateBookingFinance(booking) {
  const packageRate = getPackageRate(booking.packageName || booking.telescope);
  const packageType = booking.packageType || packageRate.type;
  const adultCount = Number(booking.adultCount || 0);
  const childCount = Number(booking.childCount || 0);
  const adultPriceUsd = Number(booking.adultPriceUsd ?? packageRate.adultPriceUsd ?? 0);
  const childPriceUsd = Number(
    booking.childPriceUsd ?? (packageType === 'Kids' ? packageRate.childPriceUsd : adultPriceUsd * 0.5)
  );
  const adultTotalUsd = adultCount * adultPriceUsd;
  const childTotalUsd = childCount * childPriceUsd;
  const baseTotalUsd = roundUsd(adultTotalUsd + childTotalUsd);
  const serviceChargeUsd = roundUsd(baseTotalUsd * SERVICE_CHARGE_RATE);
  const gstUsd = roundUsd(baseTotalUsd * GST_RATE);
  const invoiceTotalUsd = roundUsd(baseTotalUsd + serviceChargeUsd + gstUsd);
  const operationShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const companyShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const staffRole = String(booking.staffRole || booking.staff_role || '').toLowerCase();
  const staffCommissionUsd = staffRole === 'internal'
    ? roundUsd(baseTotalUsd * INTERNAL_COMMISSION_BASE_RATE * INTERNAL_COMMISSION_SHARE_RATE)
    : roundUsd(operationShareUsd * STAFF_COMMISSION_RATE);
  const tipIncentiveUsd = roundUsd(booking.tipIncentiveUsd || 0);

  return {
    adultPriceUsd,
    childPriceUsd,
    baseTotalUsd,
    serviceChargeUsd,
    gstUsd,
    invoiceTotalUsd,
    operationShareUsd,
    companyShareUsd,
    staffCommissionUsd,
    tipIncentiveUsd,
    currency: CURRENCY,
  };
}

export function hitungHarga(booking) {
  return calculateBookingFinance(booking).baseTotalUsd;
}

export function formatUsd(angka) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(angka || 0));
}

export const formatRupiah = formatUsd;

export const PENGELUARAN = [
  { id: 1, kategori: 'Astronomer', deskripsi: 'Astronomer field allowance', jumlah: 420, bulan: '2026-08', tanggal: '2026-08-01' },
  { id: 2, kategori: 'Butler', deskripsi: 'Butler setup support', jumlah: 260, bulan: '2026-08', tanggal: '2026-08-03' },
  { id: 3, kategori: 'Equipment', deskripsi: 'Telescope and laser pointer maintenance', jumlah: 310, bulan: '2026-08', tanggal: '2026-08-05' },
  { id: 4, kategori: 'Transport', deskripsi: 'Beach setup transport', jumlah: 180, bulan: '2026-08', tanggal: '2026-08-06' },
  { id: 5, kategori: 'Astronomer', deskripsi: 'Astronomer field allowance', jumlah: 390, bulan: '2026-07', tanggal: '2026-07-01' },
  { id: 6, kategori: 'Equipment', deskripsi: 'Tripod replacement', jumlah: 220, bulan: '2026-07', tanggal: '2026-07-11' },
  { id: 7, kategori: 'Butler', deskripsi: 'Guest amenity support', jumlah: 150, bulan: '2026-07', tanggal: '2026-07-17' },
  { id: 8, kategori: 'Transport', deskripsi: 'Lagoon cart transfer', jumlah: 125, bulan: '2026-07', tanggal: '2026-07-24' },
];

export const PEMASUKAN_BULANAN = [
  { bulan: 'Mar', pemasukan: 1840, pengeluaran: 860 },
  { bulan: 'Apr', pemasukan: 2125, pengeluaran: 920 },
  { bulan: 'May', pemasukan: 2310, pengeluaran: 1040 },
  { bulan: 'Jun', pemasukan: 2680, pengeluaran: 1120 },
  { bulan: 'Jul', pemasukan: 2940, pengeluaran: 885 },
  { bulan: 'Aug', pemasukan: 697.5, pengeluaran: 1170 },
];

export const KATEGORI_PENGELUARAN = ['Semua', 'Astronomer', 'Butler', 'Equipment', 'Transport'];
