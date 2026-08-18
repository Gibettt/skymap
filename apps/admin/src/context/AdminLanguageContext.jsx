'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ephemeris_admin_language';

export const adminTranslations = {
  id: {
    nav_section: 'Navigasi',
    nav_overview: 'Overview',
    nav_bookings: 'Daftar Booking',
    nav_resorts: 'Resort Mitra',
    nav_finance: 'Keuangan',
    nav_packages: 'Packages',
    nav_users: 'Pengguna',
    nav_audit: 'Audit Log',
    nav_calendar: 'Kalender',
    nav_sky_guide: 'Sky Guide',
    nav_alerts: 'Peringatan',
    nav_settings: 'Pengaturan',
    active_stations: 'Stasiun Aktif',
    logout: 'Keluar',
    date: 'Tanggal',
    notifications: 'Notifikasi',
    loading: 'Memuat',
    new_count: '{count} baru',
    loading_notifications: 'Mengambil data notifikasi...',
    no_notifications: 'Belum ada booking atau payout baru.',
    open_notifications: 'Buka notifikasi',
    mark_all_read: 'Tandai Semua Dibaca',
    admin_settings: 'Pengaturan admin',
    toggle_language: 'Ubah bahasa',
    page_dashboard: 'Dasbor',
    page_booking_observation: 'Booking - Observasi',
    page_finance_report: 'Laporan Keuangan',
    page_staff_payout: 'Pencairan Staff',
    page_package_price: 'Package & Harga',
    page_user_management: 'Manajemen Pengguna',
    page_security: 'Keamanan',
    page_sky_calendar: 'PWA & Kalender Langit',
    page_monitoring: 'Monitoring',
    page_system: 'Sistem',
  },
  en: {
    nav_section: 'Navigation',
    nav_overview: 'Overview',
    nav_bookings: 'Booking List',
    nav_resorts: 'Partner Resorts',
    nav_finance: 'Finance',
    nav_packages: 'Packages',
    nav_users: 'Users',
    nav_audit: 'Audit Log',
    nav_calendar: 'Calendar',
    nav_sky_guide: 'Sky Guide',
    nav_alerts: 'Alerts',
    nav_settings: 'Settings',
    active_stations: 'Active Stations',
    logout: 'Sign out',
    date: 'Date',
    notifications: 'Notifications',
    loading: 'Loading',
    new_count: '{count} new',
    loading_notifications: 'Loading notifications...',
    no_notifications: 'No new bookings or payouts.',
    open_notifications: 'Open notifications',
    mark_all_read: 'Mark all as read',
    admin_settings: 'Admin settings',
    toggle_language: 'Change language',
    page_dashboard: 'Dashboard',
    page_booking_observation: 'Booking - Observation',
    page_finance_report: 'Finance Report',
    page_staff_payout: 'Staff Payout',
    page_package_price: 'Package & Pricing',
    page_user_management: 'User Management',
    page_security: 'Security',
    page_sky_calendar: 'PWA & Sky Calendar',
    page_monitoring: 'Monitoring',
    page_system: 'System',
  },
};

const literalIdToEn = {
  'Observatorium Nasional': 'National Observatory',
  Admin: 'Admin',
  Administrator: 'Administrator',
  Navigasi: 'Navigation',
  'Stasiun Aktif': 'Active Stations',
  Keluar: 'Sign out',
  Tanggal: 'Date',
  Notifikasi: 'Notifications',
  Memuat: 'Loading',
  'Mengambil data notifikasi...': 'Loading notifications...',
  'Belum ada booking atau payout baru.': 'No new bookings or payouts.',
  'Pengaturan admin': 'Admin settings',
  'Buka pengaturan admin': 'Open admin settings',
  'Buka notifikasi': 'Open notifications',
  'Toggle menu': 'Toggle menu',
  Dasbor: 'Dashboard',
  'Daftar Booking': 'Booking List',
  Keuangan: 'Finance',
  Pengguna: 'Users',
  Kalender: 'Calendar',
  Peringatan: 'Alerts',
  Pengaturan: 'Settings',
  Sistem: 'System',
  'Booking - Observasi': 'Booking - Observation',
  'Laporan Keuangan': 'Finance Report',
  'Pencairan Staff': 'Staff Payout',
  'Package & Harga': 'Package & Pricing',
  'Manajemen Pengguna': 'User Management',
  Keamanan: 'Security',
  'PWA & Kalender Langit': 'PWA & Sky Calendar',
  Monitoring: 'Monitoring',
  'Ikhtisar Sistem': 'System Overview',
  'Ringkasan operasional observatorium — 30 Juli 2026': 'Observatory operational summary — July 30, 2026',
  'Peringatan Kritis Aktif': 'Active Critical Alerts',
  'Total Booking': 'Total Bookings',
  'Seluruh periode aktif': 'All active periods',
  'dari total': 'of total',
  'Belum Signed': 'Unsigned',
  'Perlu tindakan': 'Action needed',
  'Tereksekusi sukses': 'Successfully completed',
  'Invoice Selesai': 'Completed Invoices',
  'vs. bulan lalu': 'vs. last month',
  'Stasiun Aktif': 'Active Stations',
  'Peringatan Terbuka': 'Open Alerts',
  Kritis: 'Critical',
  Lainnya: 'Others',
  'Finished Bulan Ini': 'Finished This Month',
  'Booking per Bulan — 2026': 'Bookings per Month — 2026',
  'Sampai Bulan': 'Through Month',
  'Bulan Dipilih': 'Selected Month',
  Historis: 'Historical',
  Proyeksi: 'Projection',
  'Grafik booking per bulan 2026': 'Monthly booking chart 2026',
  'Rata-rata / Bulan': 'Average / Month',
  Tertinggi: 'Highest',
  'Package Terlaris': 'Top Packages',
  'Proporsi package berdasarkan jumlah booking.': 'Package share by booking count.',
  'Grafik lingkaran package terlaris': 'Top package pie chart',
  'Prioritas Malam Ini': "Tonight's Priorities",
  Objek: 'Object',
  Waktu: 'Time',
  'belum signed': 'unsigned',
  'Lihat Jadwal Penuh →': 'View Full Schedule →',
  'Peringatan Aktif': 'Active Alerts',
  'Kelola Semua →': 'Manage All →',
  'Tidak Ada Peringatan': 'No Alerts',
  'Semua sistem berjalan normal.': 'All systems are operating normally.',
  'Sebaran Paket': 'Package Distribution',
  total: 'total',
  'Status Jaringan Stasiun': 'Station Network Status',
  'Kalender Booking Bulanan': 'Monthly Booking Calendar',
  'Menampilkan booking dari staff internal dan external berdasarkan data booking database.': 'Showing bookings from internal and external staff based on database records.',
  '+ Tambah Sesi': '+ Add Session',
  'All Staff Calendar': 'All Staff Calendar',
  Bulan: 'Month',
  Tahun: 'Year',
  'booking bulan ini': 'bookings this month',
  'Filter bulan dan tahun kalender': 'Filter calendar month and year',
  'Memuat booking...': 'Loading bookings...',
  'Tidak ada booking': 'No bookings',
  'Tanggal ini masih kosong.': 'This date is still empty.',
  'Tidak ada data ditemukan': 'No data found',
  'Booking Baru': 'New Booking',
  'Tambah Booking': 'Add Booking',
  'Simpan Perubahan': 'Save Changes',
  Batal: 'Cancel',
  Hapus: 'Delete',
  Tutup: 'Close',
  Terima: 'Accept',
  Tolak: 'Reject',
  Lihat: 'View',
  Edit: 'Edit',
  'Terima booking': 'Accept booking',
  'Tolak booking': 'Reject booking',
  'Cari tamu, paket, kamar, staff...': 'Search guest, package, room, staff...',
  Semua: 'All',
  'Staff-Driven Booking': 'Staff-Driven Booking',
  Aksi: 'Actions',
  'Review booking gagal.': 'Booking review failed.',
  diterima: 'accepted',
  ditolak: 'rejected',
  diperbarui: 'updated',
  dibuat: 'created',
  dihapus: 'deleted',
  'Tidak ada catatan tambahan yang terlampir.': 'No additional notes attached.',
  Dewasa: 'Adults',
  Anak: 'Children',
  'Tidak membawa anak (Couple / Dewasa saja)': 'No children (Couple / Adults only)',
  'Pilih service/package yang ingin dilihat atau digunakan untuk booking.': 'Select the service/package to view or use for booking.',
  'Paket Observasi': 'Observation Package',
  'Pencairan Staff': 'Staff Payout',
  'Belum ada request pencairan.': 'No payout requests yet.',
  'Pencairan staff': 'Staff payouts',
  'Pencairan requested.': 'Payout requested.',
  'Pencairan approved.': 'Payout approved.',
  'Pencairan paid.': 'Payout paid.',
  'Pencairan rejected.': 'Payout rejected.',
  'Alasan reject pencairan?': 'Reason for rejecting payout?',
  'Manajemen Peringatan': 'Alert Management',
  'Total Peringatan': 'Total Alerts',
  'Semua periode': 'All periods',
  'Perlu tindakan segera': 'Needs immediate action',
  'Tangani Semua': 'Handle All',
  'Log Aktivitas Peringatan': 'Alert Activity Log',
  Kejadian: 'Event',
  Sumber: 'Source',
  Tingkat: 'Level',
  Status: 'Status',
  Ditangani: 'Handled',
  'Menampilkan': 'Showing',
  dari: 'of',
  peringatan: 'alerts',
  'Tidak ada peringatan untuk filter yang dipilih.': 'No alerts for the selected filter.',
  'Manajemen Pengguna': 'User Management',
  'Tambah Pengguna': 'Add User',
  'Total Pengguna': 'Total Users',
  'Daftar Pengguna': 'User List',
  'Nama & Email': 'Name & Email',
  'Tidak Ada Pengguna': 'No Users',
  'Tidak ada pengguna yang cocok dengan kriteria pencarian atau filter saat ini.': 'No users match the current search or filter criteria.',
  'Belum pernah': 'Never',
  'Edit Pengguna': 'Edit User',
  'Hapus Pengguna': 'Delete User',
  'Tambah Baru': 'Add New',
  'Edit Data': 'Edit Data',
  'Peran Pengguna': 'User Role',
  'Nama Lengkap': 'Full Name',
  'Dr. Nama Lengkap': 'Dr. Full Name',
  'Nama institusi atau lembaga': 'Institution or organization name',
  'Pengguna dapat login dan menggunakan sistem.': 'User can sign in and use the system.',
  'Konfirmasi Hapus': 'Confirm Delete',
  'Ya, Hapus Pengguna': 'Yes, Delete User',
  'Pengguna ini memiliki': 'This user has',
  'Nama wajib diisi': 'Name is required',
  Aktif: 'Active',
  Nonaktif: 'Inactive',
  'Belum ada': 'None yet',
  'Booking Selesai': 'Completed Bookings',
  'Tutup Form': 'Close Form',
  '+ Tambah Package': '+ Add Package',
  'Tambah Package Baru': 'Add New Package',
  'Estimasi Umur Anak': 'Estimated Child Age',
  'Contoh: 6 - 15 tahun': 'Example: 6 - 15 years',
  'Tambah Package': 'Add Package',
  'Umur Anak': 'Child Age',
  'Belum ada audit log': 'No audit logs yet',
  'Pengaturan Sistem': 'System Settings',
  'Stasiun Online': 'Online Stations',
  'Pengaturan Umum': 'General Settings',
  'Nama Sistem': 'System Name',
  'Nama sistem observatorium': 'Observatory system name',
  'Zona Waktu': 'Time Zone',
  'Bahasa Antarmuka': 'Interface Language',
  'Bahasa Indonesia': 'Indonesian',
  'Email Administrator': 'Administrator Email',
  'Pengaturan umum berhasil disimpan.': 'General settings saved.',
  'Pengaturan notifikasi diperbarui.': 'Notification settings updated.',
  'Konfigurasi stasiun berhasil disimpan.': 'Station configuration saved.',
  'Waktu sesi minimum adalah 5 menit.': 'Minimum session time is 5 minutes.',
  'Pengaturan keamanan diperbarui.': 'Security settings updated.',
  'Semua pengaturan telah direset ke default.': 'All settings have been reset to default.',
  'Perubahan dibatalkan.': 'Changes cancelled.',
  'Simpan Pengaturan Umum': 'Save General Settings',
  'Email Peringatan': 'Alert Email',
  'Peringatan Cuaca': 'Weather Alerts',
  'Nonaktifkan Semua': 'Disable All',
  'Simpan Notifikasi': 'Save Notifications',
  'Konfigurasi Stasiun': 'Station Configuration',
  'Status & Parameter Stasiun': 'Station Status & Parameters',
  'Tes koneksi stasiun dimulai…': 'Station connection test started...',
  'Simpan Konfigurasi Stasiun': 'Save Station Configuration',
  'Batas Waktu Sesi (menit)': 'Session Timeout (minutes)',
  'Batas waktu sesi sangat pendek (<15 menit) dapat mengganggu sesi pengamatan aktif.': 'Very short session timeout (<15 minutes) may interrupt active observation sessions.',
  'Semua sesi aktif telah dihentikan.': 'All active sessions have been terminated.',
  'Hapus Semua Sesi': 'Delete All Sessions',
  'Simpan Pengaturan Keamanan': 'Save Security Settings',
  'Hapus Semua Log Sistem': 'Delete All System Logs',
  'Hapus Log': 'Delete Logs',
  'Mengembalikan semua pengaturan ke kondisi awal pabrik. Semua data konfigurasi akan hilang.': 'Reset all settings to factory defaults. All configuration data will be lost.',
  'Booking Date': 'Booking Date',
  'Event Date': 'Event Date',
  'Guest Name': 'Guest Name',
  'Room Number': 'Room Number',
  Nationality: 'Nationality',
  Package: 'Package',
  'Adult Pax': 'Adult Pax',
  'Child Pax': 'Child Pax',
  'Child Ages': 'Child Ages',
  Location: 'Location',
  'Start Time': 'Start Time',
  'End Time': 'End Time',
  'Commission Owner': 'Commission Owner',
  'Field Tip / Incentive': 'Field Tip / Incentive',
  'Signed by Guest': 'Signed by Guest',
  Notes: 'Notes',
  'Tamu Utama': 'Lead Guest',
  'Paket Observasi': 'Observation Package',
  'Tanggal Observasi': 'Observation Date',
  'Jam (Start - End)': 'Time (Start - End)',
  'Adults (Dewasa)': 'Adults',
  'Children (Anak)': 'Children',
  'Staff Owner': 'Staff Owner',
  Catatan: 'Notes',
  'Catatan khusus...': 'Special notes...',
  'Catatan Lengkap Form & Log Intake': 'Full Form Notes & Intake Log',
  'Berhasil Disalin!': 'Copied Successfully!',
  'Salin Seluruh Catatan': 'Copy All Notes',
  'Tutup Catatan': 'Close Notes',
  Jam: 'Time',
  'Komisi Staff': 'Staff Commission',
  'Rincian Catatan Lengkap & Log Form': 'Full Notes & Form Log Details',
  'Buka Catatan Lengkap (Popup)': 'Open Full Notes (Popup)',
  'Catatan Lengkap & Log Intake Form': 'Full Notes & Intake Log Form',
  'Menunggu Admin': 'Pending Review',
  Diterima: 'Accepted',
  Ditolak: 'Rejected',
  'Kalender Langit': 'Sky Calendar',
  'Buka Sky Guide': 'Open Sky Guide',
  'Lokasi Pilot Indonesia': 'Indonesia Pilot Location',
  'Nama lokasi': 'Location name',
  'Zona waktu IANA': 'IANA time zone',
  'Simpan Lokasi': 'Save Location',
  'Tambah Event Resort atau Meteor': 'Add Resort or Meteor Event',
  Judul: 'Title',
  Jenis: 'Type',
  'Arah panduan': 'Guide direction',
  Mulai: 'Starts',
  Selesai: 'Ends',
  Deskripsi: 'Description',
  'Tampilkan ke tamu': 'Show to guests',
  'Tambah Event': 'Add Event',
  'Event yang Dikelola': 'Managed Events',
  Arah: 'Direction',
  'Tanpa sumber': 'No source',
  Publik: 'Public',
  Sembunyikan: 'Hide',
  Publikasikan: 'Publish',
  'Belum ada event yang dikelola.': 'No managed events yet.',
};

const literalEnToId = Object.fromEntries(Object.entries(literalIdToEn).map(([id, en]) => [en, id]));

function translateLiteral(value, language) {
  const text = String(value || '');
  const trimmed = text.trim();
  if (!trimmed) return text;

  const dictionary = language === 'en' ? literalIdToEn : literalEnToId;
  let translated = dictionary[trimmed];

  if (!translated && language === 'en') {
    translated = trimmed
      .replace(/^(\d+) baru$/, '$1 new')
      .replace(/^(\d+) Peringatan Kritis Aktif$/, '$1 Active Critical Alerts')
      .replace(/^(\d+) Kritis$/, '$1 Critical')
      .replace(/^(\d+) Lainnya$/, '$1 Others')
      .replace(/^✓ Tangani Semua \((\d+)\)$/, '✓ Handle All ($1)')
      .replace(/^✓ (\d+) Ditangani$/, '✓ $1 Handled')
      .replace(/^Menampilkan (\d+) dari (\d+) peringatan$/, 'Showing $1 of $2 alerts')
      .replace(/^Menampilkan ([\d-]+) dari (\d+)$/, 'Showing $1 of $2')
      .replace(/^Pengguna "(.+)" berhasil ditambahkan$/, 'User "$1" added successfully')
      .replace(/^Data "(.+)" berhasil diperbarui$/, 'Data for "$1" updated successfully')
      .replace(/^Pengguna "(.+)" telah dihapus$/, 'User "$1" deleted')
      .replace(/^Booking (.+) diperbarui\.$/, 'Booking $1 updated.')
      .replace(/^Booking (.+) dibuat\.$/, 'Booking $1 created.')
      .replace(/^Booking (.+) dihapus\.$/, 'Booking $1 deleted.')
      .replace(/^Booking (.+) diterima\.$/, 'Booking $1 accepted.')
      .replace(/^Booking (.+) ditolak\.$/, 'Booking $1 rejected.')
      .replace(/^Booking baru dari staff (.+)$/, 'New booking from $1 staff')
      .replace(/^(.+) meminta pencairan \$(.+)$/, '$1 requested payout $$2')
      .replace(/^Edit — (.+)$/, 'Edit — $1')
      .replace(/^Total Jan-(.+)$/, 'Total Jan-$1')
      .replace(/^Tertinggi \((.+)\)$/, 'Highest ($1)')
      .replace(/^(\d+) booked · (\d+) belum signed$/, '$1 booked · $2 unsigned')
      .replace(/^(\d+) booking$/, '$1 bookings');
  }

  if (!translated || translated === trimmed) return text;
  return text.replace(trimmed, translated);
}

function translateElementTree(root, language) {
  if (!root || typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION'].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    const next = translateLiteral(node.nodeValue, language);
    if (next !== node.nodeValue) node.nodeValue = next;
  });

  root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach((element) => {
    ['placeholder', 'title', 'aria-label'].forEach((attr) => {
      if (element.hasAttribute(attr)) {
        const current = element.getAttribute(attr);
        const next = translateLiteral(current, language);
        if (next !== current) element.setAttribute(attr, next);
      }
    });
  });
}

const AdminLanguageContext = createContext({
  language: 'id',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export function AdminLanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    if (typeof window === 'undefined') return 'id';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'en' ? 'en' : 'id';
    } catch {
      return 'id';
    }
  });

  const setLanguage = useCallback((nextLanguage) => {
    const next = nextLanguage === 'en' ? 'en' : 'id';
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      // ignore storage/document failures
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'id' : 'en');
  }, [language, setLanguage]);

  const t = useCallback((key, fallback = '') => {
    const dict = adminTranslations[language] || adminTranslations.id;
    return dict[key] ?? adminTranslations.id[key] ?? fallback ?? key;
  }, [language]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.body;
    translateElementTree(root, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const next = translateLiteral(mutation.target.nodeValue, language);
          if (next !== mutation.target.nodeValue) mutation.target.nodeValue = next;
        }
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const next = translateLiteral(node.nodeValue, language);
            if (next !== node.nodeValue) node.nodeValue = next;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            translateElementTree(node, language);
          }
        });
        if (mutation.type === 'attributes') {
          translateElementTree(mutation.target, language);
        }
      }
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t]);

  return (
    <AdminLanguageContext.Provider value={value}>
      {children}
    </AdminLanguageContext.Provider>
  );
}

export function useAdminLanguage() {
  return useContext(AdminLanguageContext);
}
