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
  // Alerts and audit
  'Aman': 'Safe',
  'Dipantau': 'Monitored',
  'Informasi': 'Information',
  'Notifikasi sistem': 'System notification',
  'Pelaku': 'Actor',
  'Entitas': 'Entity',
  'Gagal memuat audit log.': 'Failed to load audit logs.',
  // Booking operations
  'Kamar / Vila': 'Room / Villa',
  'Detail Reservasi Tamu': 'Guest Reservation Details',
  'Package Observasi Terpilih': 'Selected Observation Package',
  'Tamu / Guest': 'Guest',
  'Paket / Package': 'Package',
  'Jadwal / Schedule': 'Schedule',
  '+ Booking Baru': '+ New Booking',
  Dasar: 'Base',
  Pertama: 'First',
  Sebelumnya: 'Prev',
  Berikutnya: 'Next',
  Terakhir: 'Last',
  'Tamu Utama (Lead Guest)': 'Lead Guest',
  'Tamu 2 (Pasangan/Pendamping)': 'Guest 2 (Partner/Companion)',
  'Data Anak': 'Children Data',
  'Cari kode booking, nama paket, tamu, kamar, staf...': 'Search booking code, package, guest, room, staff...',
  'Selesaikan booking': 'Complete booking',
  'Batalkan booking': 'Cancel booking',
  'Jadwalkan ulang': 'Reschedule',
  'Tanggal baru (YYYY-MM-DD)': 'New date (YYYY-MM-DD)',
  'Waktu mulai (HH:MM)': 'Start time (HH:MM)',
  'Waktu selesai (HH:MM)': 'End time (HH:MM)',
  'Alasan reschedule': 'Reschedule reason',
  'Permintaan tamu': 'Guest request',
  'Reschedule gagal.': 'Reschedule failed.',
  'Booking berhasil dijadwalkan ulang.': 'Booking rescheduled successfully.',
  'Hari Ini': 'Today',
  'Tanggal Terpilih': 'Selected Date',
  // Finance and payouts
  'Pratinjau Struk Digital': 'Digital Receipt Preview',
  'Laporan Komisi Staff': 'Staff Commission Report',
  'Satu pemilik komisi per booking': 'Single commission owner per booking',
  'ID Staff': 'Staff ID',
  'Komisi Dibayar': 'Commission Paid',
  'Ringkasan Resort & Review / Tip Lapangan': 'Resort & Review Summary / Field Tip',
  'Tip tidak bercampur dengan komisi staff': 'Tips are kept separate from staff commission',
  'Resort 50%': 'Resort 50%',
  'Perusahaan 50%': 'Company 50%',
  Peringkat: 'Rating',
  Komentar: 'Comment',
  Jumlah: 'Amount',
  Pembayaran: 'Payment',
  Proses: 'Process',
  'Komisi / Bonus': 'Commission / Bonus',
  // Package management
  'Kembali ke daftar package': 'Back to package list',
  'Lengkapi informasi package untuk landing dan staff.': 'Complete the package information for landing and staff.',
  'Informasi Package': 'Package Information',
  'Kolom bertanda wajib harus diisi': 'Required fields must be completed',
  'Gambar Package': 'Package Image',
  'Deskripsi Singkat': 'Short Description',
  Termasuk: 'Including',
  'Tambahkan fasilitas yang didapat tamu. Urutannya digunakan di landing dan staff.': 'Add the facilities guests receive. Their order is used on landing and staff.',
  'Contoh: Every Thursday | 19:30 - 20:30': 'Example: Every Thursday | 19:30 - 20:30',
  'Pilih resort': 'Select resort',
  'Drag & drop atau pilih gambar': 'Drag and drop or select an image',
  'Ringkasan singkat isi package untuk staff.': 'A short package summary for staff.',
  'Contoh: Beverages': 'Example: Beverages',
  'Gambar maksimal 2MB.': 'Maximum image size is 2MB.',
  'Hanya 1 gambar yang diperbolehkan.': 'Only one image is allowed.',
  'Kelola nama package, harga, status aktif, dan estimasi umur anak.': 'Manage package names, prices, active status, and estimated child age.',
  'Pengaturan Dinamis Star & Reward': 'Dynamic Star & Reward Settings',
  'Simpan Pengaturan Reward': 'Save Reward Settings',
  'Daftar Package': 'Package List',
  Gambar: 'Image',
  Pengalaman: 'Experience',
  Reward: 'Reward',
  'Pengaturan star dan reward berhasil disimpan.': 'Star and reward settings saved successfully.',
  'Memuat data package...': 'Loading package data...',
  'Edit Package': 'Edit Package',
  'Package tidak ditemukan.': 'Package not found.',
  'Gagal memuat data package.': 'Failed to load package data.',
  'Gagal membuat package.': 'Failed to create package.',
  'Gagal memperbarui package.': 'Failed to update package.',
  'Menyimpan...': 'Saving...',
  'Simpan Perubahan': 'Save Changes',
  'Aktifkan package': 'Activate package',
  'Package berbayar (komisi & star berlaku)': 'Paid package (commission and stars apply)',
  // Dashboard and settings
  Dipesan: 'Booked',
  'Perlu tindakan': 'Action needed',
  'Tereksekusi sukses': 'Successfully completed',
  'vs. bulan lalu': 'vs. last month',
  'Notifikasi Aktif': 'Active Notifications',
  'Sesi Login': 'Login Session',
  'batas waktu aktif': 'active timeout',
  'Pengaturan Umum': 'General Settings',
  'Konfigurasi dasar sistem': 'Basic system configuration',
  'Maks. Sesi Bersamaan': 'Max. Concurrent Sessions',
  'Retensi Data (hari)': 'Data Retention (days)',
  'Konfigurasi Stasiun': 'Station Configuration',
  Kode: 'Code',
  Koordinat: 'Coordinates',
  Pemeliharaan: 'Maintenance',
  'Online/Offline': 'Online/Offline',
  'Skala Seeing:': 'Seeing Scale:',
  'Sangat Baik': 'Excellent',
  Baik: 'Good',
  Sedang: 'Moderate',
  Buruk: 'Poor',
  'Auto Logout (menit)': 'Auto Logout (minutes)',
  'Maks. Percobaan Login': 'Max. Login Attempts',
  'Kedaluwarsa Kata Sandi (hari)': 'Password Expiry (days)',
  'Perhatian:': 'Attention:',
  'Autentikasi Dua Faktor (2FA) tidak aktif. Aktifkan untuk meningkatkan keamanan akun administrator.': 'Two-Factor Authentication (2FA) is disabled. Enable it to improve administrator account security.',
  'Zona Berbahaya': 'Danger Zone',
  'Tindakan ini tidak dapat dibatalkan': 'This action cannot be undone',
  'Identitas & Lokalisasi': 'Identity & Localization',
  'Informasi utama sistem dan preferensi regional': 'Core system information and regional preferences',
  'Kanal Pemberitahuan': 'Notification Channels',
  'Atur metode notifikasi untuk peristiwa sistem dan pengamatan': 'Configure notification methods for system and observation events',
  'Kelola ketersediaan dan parameter operasional setiap stasiun observatorium': 'Manage availability and operating parameters for each observatory station',
  'Kontrol Akses & Autentikasi': 'Access Control & Authentication',
  'Konfigurasi kebijakan keamanan login dan sesi pengguna': 'Configure login and user-session security policies',
  // Users and resorts
  'Staff Internal': 'Internal Staff',
  'Staff External': 'External Staff',
  Institusi: 'Institution',
  'Login Terakhir': 'Last Login',
  'Nomor Telepon': 'Phone Number',
  Kota: 'City',
  'Cari nama, email, institusi...': 'Search name, email, institution...',
  'Kota domisili': 'City of residence',
  '+ Tambah Resort Mitra': '+ Add Partner Resort',
  'Resort & Kode': 'Resort & Code',
  'Lokasi & Zona Waktu': 'Location & Time Zone',
  'Koordinat GPS': 'GPS Coordinates',
  'Spot Observasi': 'Observation Spots',
  'Kontak PIC': 'PIC Contact',
  'Staf & Booking': 'Staff & Bookings',
  'Nama Resort Mitra *': 'Partner Resort Name *',
  'Kode Resort (Singkatan) *': 'Resort Code (Abbreviation) *',
  'Lokasi / Pulau / Atoll': 'Location / Island / Atoll',
  'Zona Waktu (Timezone)': 'Time Zone',
  'Latitude GPS (°)': 'GPS Latitude (°)',
  'Longitude GPS (°)': 'GPS Longitude (°)',
  'Titik Pengamatan Astronomi (Observation Spots)': 'Astronomy Observation Spots',
  'Nama PIC Resort (Concierge/FO)': 'Resort PIC Name (Concierge/FO)',
  'Nomor Telepon PIC': 'PIC Phone Number',
  'Email Reservasi': 'Reservation Email',
  'WhatsApp (kode negara)': 'WhatsApp (country code)',
  'Status Operasional': 'Operational Status',
  'Aktif (Menerima Reservasi)': 'Active (Accepting Reservations)',
  'Nonaktif (Suspended)': 'Inactive (Suspended)',
  'Hapus Resort Mitra?': 'Delete Partner Resort?',
  'demi menjaga integritas laporan keuangan.': 'to preserve financial reporting integrity.',
  'Cari nama resort, kode, lokasi, PIC...': 'Search resort name, code, location, PIC...',
  'Edit Data Resort': 'Edit Resort Data',
  'Hapus Resort': 'Delete Resort',
  'Contoh: Le Meridien Maldives Resort & Spa': 'Example: Le Meridien Maldives Resort & Spa',
  'Contoh: LMM': 'Example: LMM',
  'Contoh: Thilamaafushi, Lhaviyani Atoll': 'Example: Thilamaafushi, Lhaviyani Atoll',
  'Pisahkan dengan koma. Contoh: Sunset Beach, Helipad, Main Jetty, Water Villa Deck': 'Separate with commas. Example: Sunset Beach, Helipad, Main Jetty, Water Villa Deck',
  'Contoh: Resort Concierge': 'Example: Resort Concierge',
  'Contoh: +960-000-0100': 'Example: +960-000-0100',
  'Contoh: 9607771234': 'Example: 9607771234',
  // Sky events
  'Semua Kategori': 'All Categories',
  'Astronomi & Gerhana (NASA/IAU)': 'Astronomy & Eclipses (NASA/IAU)',
  'Hujan Meteor (IMO)': 'Meteor Showers (IMO)',
  'Event Khusus Resort': 'Special Resort Events',
  'Semua Status': 'All Statuses',
  'Publik (Tayang di PWA)': 'Public (Shown in PWA)',
  'Draft (Tersembunyi)': 'Draft (Hidden)',
  'Nama Peristiwa & Fenomena': 'Event & Phenomenon Name',
  'Jadwal / Puncak': 'Schedule / Peak',
  Kategori: 'Category',
  'Sumber Ilmiah': 'Scientific Source',
  'Arah Langit': 'Sky Direction',
  'Status PWA': 'PWA Status',
  'di atas untuk memuat kalender resmi secara otomatis.': 'above to load the official calendar automatically.',
  'Periode Aktif:': 'Active Period:',
  'Malam Puncak:': 'Peak Night:',
  'Asal Debu:': 'Dust Origin:',
  'Organisasi Resmi:': 'Official Organization:',
  'Titik Koordinat Observatori Pilot': 'Pilot Observatory Coordinates',
  'Nama Lokasi': 'Location Name',
  'Latitude (Lintang)': 'Latitude',
  'Longitude (Bujur)': 'Longitude',
  'Zona Waktu (IANA)': 'Time Zone (IANA)',
  'Judul Event / Fenomena *': 'Event / Phenomenon Title *',
  'Jenis Kategori': 'Category Type',
  'Astronomi & Gerhana': 'Astronomy & Eclipses',
  'Hujan Meteor': 'Meteor Shower',
  'Arah Panduan Langit': 'Sky Guide Direction',
  'Utara & Selatan (Seluruh Langit)': 'North & South (Entire Sky)',
  'Langit Utara': 'Northern Sky',
  'Langit Selatan': 'Southern Sky',
  'Waktu Mulai / Puncak *': 'Start / Peak Time *',
  'Waktu Selesai (Opsional)': 'End Time (Optional)',
  'URL Referensi / Sumber': 'Reference / Source URL',
  'Deskripsi Edukasi & Pengamatan': 'Education & Observation Description',
  'Tampilkan ke tamu di aplikasi publik (PWA Sky Guide)': 'Show to guests in the public app (PWA Sky Guide)',
  'Cari fenomena, sumber NASA/IAU...': 'Search phenomena, NASA/IAU sources...',
  'Contoh: Puncak Hujan Meteor Perseids 2026': 'Example: Perseids Meteor Shower Peak 2026',
  'Tuliskan keterangan fenomena langit, tips pengamatan di teleskop, atau panduan untuk tamu...': 'Write a description of the sky phenomenon, telescope observation tips, or guest guidance...',
  // Generic table and accessibility labels
  'Tanggal Booking': 'Booking Date',
  'Tanggal Event': 'Event Date',
  'Nama Tamu': 'Guest Name',
  'Nomor Kamar': 'Room Number',
  Kebangsaan: 'Nationality',
  'Pax Dewasa': 'Adult Pax',
  'Pax Anak': 'Child Pax',
  'Usia Anak': 'Child Ages',
  'Waktu Mulai': 'Start Time',
  'Waktu Selesai': 'End Time',
  'Pemilik Komisi': 'Commission Owner',
  'Tip / Insentif Lapangan': 'Field Tip / Incentive',
  'Ditandatangani Tamu': 'Signed by Guest',
  'Toggle sidebar': 'Toggle sidebar',
  'Tutup preview': 'Close preview',
  'Unggah file': 'Upload file',
  'Log Audit': 'Audit Log',
  Tindakan: 'Action',
  Info: 'Info',
  Selesai: 'Finished',
  Pengamat: 'Observer',
  Stasiun: 'Station',
  Peran: 'Role',
  Nama: 'Name',
  Lokasi: 'Location',
  Jadwal: 'Schedule',
  'Harga Dewasa': 'Adult',
  'Harga Anak': 'Child',
  Berbayar: 'Chargeable',
  Gratis: 'Free',
  'Atas permintaan': 'Upon request',
  'Unit Dewasa': 'Adult Unit',
  'Unit Anak': 'Child Unit',
  'Ambang Bintang': 'Star Threshold',
  'Bonus Bintang Penuh USD': 'Full Star Bonus USD',
  '+ Tambah Inclusion': '+ Add Inclusion',
  'Gambar dipilih': 'Selected image',
  'JPEG, PNG, WebP, maksimal 2MB': 'JPEG, PNG, WebP, maximum 2MB',
  'Tambah Resort Mitra': 'Add Partner Resort',
  'Lokasi & Timezone': 'Location & Time Zone',
  'Resort & Review Summary / Tip Lapangan': 'Resort & Review Summary / Field Tip',
  '9 Besar IMO': 'IMO Top 9',
  'Tutup Menu': 'Close Menu',
  'Tutup menu': 'Close menu',
  'Toggle bahasa': 'Toggle language',
  'Apakah Anda yakin ingin menghapus pengguna': 'Are you sure you want to delete user',
  'yang terkait': 'related',
  'Cari nama, email, institusi…': 'Search name, email, institution…',
  'Data booking tidak valid': 'Invalid booking data',
  'Data package tidak valid': 'Invalid package data',
  'Data payout tidak valid': 'Invalid payout data',
  'Data resort tidak valid': 'Invalid resort data',
  'Data sky event tidak valid': 'Invalid sky-event data',
  'Data pengaturan langit tidak valid': 'Invalid sky settings data',
  'ID tidak valid': 'Invalid ID',
  'Resort tidak ditemukan.': 'Resort not found.',
  'Kode resort sudah digunakan oleh resort lain.': 'The resort code is already used by another resort.',
  'Kode resort sudah terdaftar, gunakan kode lain.': 'The resort code is already registered; use another code.',
  'Gambar tidak ditemukan': 'Image not found',
  'Dashboard / Admin / Peringatan': 'Dashboard / Admin / Alerts',
  'Pantau dan tangani peringatan sistem observatorium secara real-time.': 'Monitor and handle observatory system alerts in real time.',
  'Diperbarui otomatis setiap 60 detik': 'Automatically updated every 60 seconds',
  Terbuka: 'Open',
  Tamu: 'Guest',
  'Klik tombol di kanan untuk membuka popup tampilan teks catatan lengkap di depan layar.': 'Click the button on the right to open the full notes in a popup.',
  'Batalkan oleh Tamu': 'Cancel Guest',
  Selesaikan: 'Complete',
  'Kode Booking': 'Booking Code',
  Ditandatangani: 'Signed',
  'Tambah Inclusion': 'Add Inclusion',
  'Total pendapatan tervalidasi': 'Total validated revenue',
  'Keuangan Langsung': 'Live Finance',
  'USD Terkonfirmasi': 'USD Confirmed',
  'Reset ke Default': 'Reset to Default',
  'Tes Koneksi': 'Test Connection',
  'Sesi akan berakhir setelah tidak aktif selama ini': 'The session will end after this period of inactivity',
  'Logout paksa setelah durasi ini meski sedang aktif': 'Force logout after this duration even when active',
  'Akun dikunci setelah melewati batas ini': 'The account is locked after exceeding this limit',
  'Isi 0 untuk menonaktifkan kedaluwarsa kata sandi': 'Enter 0 to disable password expiry',
  'Opsi Keamanan Lanjutan': 'Advanced Security Options',
  'Ekspor Log Audit': 'Export Audit Log',
  'Admin / Manajemen': 'Admin / Management',
  'Kelola akun, peran, dan hak akses seluruh pengguna sistem Ephemeris.': 'Manage accounts, roles, and access rights for all Ephemeris users.',
  'Terdaftar dalam sistem': 'Registered in the system',
  'Akses Penuh': 'Full Access',
  'Staf Obs.': 'Obs. Staff',
  'Peneliti Luar': 'External Researcher',
  'Status Akun': 'Account Status',
  Perhatian: 'Warning',
  'Manajemen Resort & Lokasi Observasi': 'Resort & Observation Location Management',
  'Kelola master resort mitra, titik pengamatan astronomi (observation spots), dan koordinat GPS.': 'Manage partner resorts, astronomy observation spots, and GPS coordinates.',
  'Memuat data resort...': 'Loading resort data...',
  'Tidak ada resort ditemukan.': 'No resorts found.',
  'Lengkapi informasi resort, titik observasi lapangan, dan koordinat GPS.': 'Complete the resort information, field observation spots, and GPS coordinates.',
  'Titik kumpul observasi ini akan muncul sebagai opsi lokasi saat staf external membuat booking.': 'These observation meeting points will appear as location options when external staff create a booking.',
  'Konfirmasi penghapusan data resort': 'Confirm resort deletion',
  'Jika resort ini telah memiliki riwayat booking atau staf terhubung, sistem akan otomatis mengubah statusnya menjadi': 'If this resort already has booking history or connected staff, the system will automatically change its status to',
  'Pusat Intelijen Astronomi & Kalender Langit': 'Astronomy Intelligence & Sky Calendar Center',
  'Pusat Sky Guide': 'Sky Guide Hub',
  'Kelola peristiwa astronomi resmi, gerhana matahari/bulan, hujan meteor tahunan, dan jadwal pengamatan resort.': 'Manage official astronomy events, solar/lunar eclipses, annual meteor showers, and resort observation schedules.',
  'Tambah Event Baru': 'Add New Event',
  'Buka PWA Tamu ↗': 'Open Guest PWA ↗',
  'Total Event Dikelola': 'Total Managed Events',
  'tayang di PWA publik': 'published in the public PWA',
  'Hujan Meteor Dunia': 'Global Meteor Showers',
  'Fenomena NASA / IAU': 'NASA / IAU Phenomena',
  'Gerhana, Oposisi, Bulan Baru': 'Eclipses, Oppositions, New Moons',
  'Observatori Pilot Aktif': 'Active Pilot Observatory',
  'Katalog Hujan Meteor (IMO)': 'Meteor Shower Catalog (IMO)',
  'Hari Antariksa Sedunia (UN & Space Days)': 'World Space Days (UN & Space Days)',
  'Koordinat & Lokasi Observasi': 'Coordinates & Observation Location',
  'Memuat data kalender langit...': 'Loading sky calendar data...',
  'Dokumen Resmi ↗': 'Official Document ↗',
  'Belum ada event langit yang sesuai. Klik tombol': 'No matching sky events yet. Click the',
  'Sinkronisasi 1-Klik NASA/IAU': '1-Click Sync NASA/IAU',
  'Katalog Resmi Hujan Meteor Tahunan (IMO & IAU Meteor Center)': 'Official Annual Meteor Shower Catalog (IMO & IAU Meteor Center)',
  'Data referensi standar internasional untuk perencanaan malam pengamatan bintang dan event spesial di resort mitra.': 'International standard reference data for planning stargazing nights and special events at partner resorts.',
  'Sinkronkan Semua ke Kalender Tamu': 'Sync All to Guest Calendar',
  'Buat Event Resort': 'Create Resort Event',
  'Kalender Hari Antariksa & Misi Bersejarah Dunia (PBB / NASA / ESA)': 'World Space Days & Historic Missions Calendar (UN / NASA / ESA)',
  'Momen perayaan global ilmu antariksa yang dapat digunakan sebagai tema edukasi dan promosi program astronomi resort.': 'Global space-science celebrations that can be used for education themes and resort astronomy program promotions.',
  'Jadwalkan di Kalender': 'Schedule in Calendar',
  'Koordinat GPS ini digunakan oleh mesin kalkulasi astronomi (Astronomy Engine & NASA Algorithms) untuk menghitung waktu terbit/terbenam matahari, sudut iluminasi bulan, serta elevasi benda langit secara presisi.': 'These GPS coordinates are used by the astronomy calculation engine (Astronomy Engine & NASA Algorithms) to precisely calculate sunrise/sunset times, lunar illumination angles, and celestial-object elevation.',
  'Pilih Preset Observatori / Resort:': 'Select Observatory / Resort Preset:',
  'Simpan Koordinat Observatori': 'Save Observatory Coordinates',
  'Klik untuk preview': 'Click to preview',
  'Ledakan Komet Terdeteksi': 'Comet Outburst Detected',
  'Peningkatan magnitudo mendadak (outburst) pada komet 12P/Pons-Brooks terpantau.': 'A sudden magnitude increase (outburst) was observed on comet 12P/Pons-Brooks.',
  'Sistem Deteksi Otomatis': 'Automated Detection System',
  'Peringatan Jarak Dekat NEO': 'NEO Close-Approach Alert',
  'Asteroid 2024 PT5 menyusut jarak MOID-nya dengan bumi. Analisis orbit ulang diperlukan.': 'Asteroid 2024 PT5 has a decreasing MOID distance from Earth. A new orbital analysis is required.',
  'Cuaca Buruk: Penutupan Kubah': 'Severe Weather: Dome Closure',
  'Kecepatan angin melebihi batas aman (60 km/jam). Kubah observatorium ditutup secara otomatis.': 'Wind speed exceeded the safe limit (60 km/h). The observatory dome was closed automatically.',
  'Kualitas Melihat (Seeing) Buruk': 'Poor Seeing Quality',
  'Kondisi atmosfer sangat tidak stabil. Seeing saat ini > 2.5". Pengamatan resolusi tinggi dibatalkan.': 'Atmospheric conditions are highly unstable. Current seeing is > 2.5". High-resolution observations were cancelled.',
  'Kalibrasi Instrumen Selesai': 'Instrument Calibration Completed',
  'Kalibrasi rutin teleskop Ritchey-ChrÃ©tien 400mm telah selesai dilakukan.': 'Routine calibration of the 400mm Ritchey-ChrÃ©tien telescope has been completed.',
  'Update Data Ephemeris': 'Ephemeris Data Update',
  'Sinkronisasi data orbital terbaru dari MPC (Minor Planet Center) berhasil.': 'The latest orbital data from the MPC (Minor Planet Center) was synchronized successfully.',
  'Sistem Pusat': 'Central System',
  'Gangguan Pendingin CCD': 'CCD Cooling Fault',
  'Suhu sensor kamera CCD tidak stabil, fluktuasi di luar batas toleransi (-20Â°C).': 'The CCD camera sensor temperature is unstable and fluctuating outside the tolerance limit (-20Â°C).',
  'Kelembaban Udara Tinggi': 'High Humidity',
  'Sensor mendeteksi kelembaban mendekati 90%. Risiko embun pada optik sekunder teleskop Dobson.': 'The sensor detected humidity approaching 90%. There is a risk of condensation on the Dobsonian telescope secondary optics.',
  Peringatan: 'Warning',
  '12 menit lalu': '12 minutes ago',
  '1 jam lalu': '1 hour ago',
  '3 jam lalu': '3 hours ago',
  '5 jam lalu': '5 hours ago',
  '12 jam lalu': '12 hours ago',
  '1 hari lalu': '1 day ago',
  '2 hari lalu': '2 days ago',
  Menunggu: 'Pending',
  Reguler: 'Regular',
  Privat: 'Private',
  'Anak-anak': 'Kids',
  Komunal: 'Communal',
  'Pengalaman Selesai': 'Finished Experience',
  Dibatalkan: 'Cancelled',
  'Dijadwalkan Ulang': 'Rescheduled',
  'Dibatalkan Tamu': 'Cancelled by Guest',
  'Dibatalkan Cuaca': 'Cancelled due to Weather',
  reguler: 'regular',
  privat: 'private',
  anak: 'kids',
  komunal: 'communal',
  'Admin / Pengaturan': 'Admin / Settings',
  'Hapus Resort Mitra': 'Delete Partner Resort',
  Permintaan: 'Request',
  permintaan: 'request',
  poin: 'pts',
  bintang: 'stars',
  'transaksi selesai': 'completed transactions',
  'aktivitas terakhir': 'recent activities',
  kanal: 'channels',
  'package berbayar selesai': 'paid completed packages',
  'riwayat booking': 'booking history',
  'Perbarui informasi': 'Update information for',
  'untuk landing dan staff': 'for landing and staff',
  Kamar: 'Room',
  Rasi: 'Constellation',
  Staf: 'Staff',
  '≤ 0.7″ Sangat Baik': '≤ 0.7″ Excellent',
  '0.8–1.0″ Baik': '0.8–1.0″ Good',
  '1.1–1.5″ Sedang': '1.1–1.5″ Moderate',
  '> 1.5″ Buruk': '> 1.5″ Poor',
};

const literalEnToId = Object.fromEntries(Object.entries(literalIdToEn).map(([id, en]) => [en, id]));

function translateLiteral(value, language) {
  const text = String(value || '');
  const trimmed = text.trim();
  if (!trimmed) return text;

  const dictionary = language === 'en' ? literalIdToEn : literalEnToId;
  let translated = dictionary[trimmed];

  // Preserve icons and sentence punctuation that React renders in the same
  // text node, while translating the readable part in the middle.
  if (!translated) {
    const leadingMatch = trimmed.match(/^([^\p{L}\p{N}]*)([\s\S]+)$/u);
    const prefix = leadingMatch?.[1] || '';
    let core = leadingMatch?.[2] || trimmed;
    const trailingMatch = core.match(/^([\s\S]*?)([.!?:;,/]+)$/u);
    const suffix = trailingMatch?.[2] || '';
    core = trailingMatch?.[1] || core;
    const coreTranslation = dictionary[core];
    if (coreTranslation) translated = `${prefix}${coreTranslation}${suffix}`;
  }

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
      .replace(/^(\d+) booking$/, '$1 bookings')
      .replace(/^(\d+) riwayat booking$/, '$1 booking records')
      .replace(/^Upload selesai: (.+)$/, 'Upload complete: $1')
      .replace(/^Menghapus (.+)$/, 'Remove $1')
      .replace(/^Upload gagal: (.+)$/, 'Upload failed: $1')
      .replace(/^Coba lagi (.+)$/, 'Retry $1')
      .replace(/^Hapus (.+)$/, 'Delete $1')
      .replace(/^Mengupload (.+)$/, 'Uploading $1');
    if (translated === trimmed) translated = trimmed.replace(/^Stasiun (.+)$/, '$1 Station');
  } else if (!translated && language === 'id') {
    translated = trimmed
      .replace(/^(\d+) new$/, '$1 baru')
      .replace(/^(\d+) Active Critical Alerts$/, '$1 Peringatan Kritis Aktif')
      .replace(/^(\d+) Critical$/, '$1 Kritis')
      .replace(/^(\d+) Others$/, '$1 Lainnya')
      .replace(/^Showing (\d+) of (\d+) alerts$/, 'Menampilkan $1 dari $2 peringatan')
      .replace(/^Showing ([\d-]+) of (\d+)$/, 'Menampilkan $1 dari $2')
      .replace(/^User "(.+)" added successfully$/, 'Pengguna "$1" berhasil ditambahkan')
      .replace(/^Data for "(.+)" updated successfully$/, 'Data "$1" berhasil diperbarui')
      .replace(/^User "(.+)" deleted$/, 'Pengguna "$1" telah dihapus')
      .replace(/^Booking (.+) updated\.$/, 'Booking $1 diperbarui.')
      .replace(/^Booking (.+) created\.$/, 'Booking $1 dibuat.')
      .replace(/^Booking (.+) deleted\.$/, 'Booking $1 dihapus.')
      .replace(/^Booking (.+) accepted\.$/, 'Booking $1 diterima.')
      .replace(/^Booking (.+) rejected\.$/, 'Booking $1 ditolak.')
      .replace(/^New booking from (.+) staff$/, 'Booking baru dari staff $1')
      .replace(/^(.+) requested payout \$(.+)$/, '$1 meminta pencairan $$$2')
      .replace(/^Highest \((.+)\)$/, 'Tertinggi ($1)')
      .replace(/^(\d+) bookings$/, '$1 booking')
      .replace(/^(\d+) booking records$/, '$1 riwayat booking')
      .replace(/^Upload complete: (.+)$/, 'Upload selesai: $1')
      .replace(/^Remove (.+)$/, 'Menghapus $1')
      .replace(/^Upload failed: (.+)$/, 'Upload gagal: $1')
      .replace(/^Retry (.+)$/, 'Coba lagi $1')
      .replace(/^Delete (.+)$/, 'Hapus $1')
      .replace(/^Uploading (.+)$/, 'Mengupload $1');
    if (translated === trimmed) translated = trimmed.replace(/^(.+) Station$/, 'Stasiun $1');
  }

  if (!translated || translated === trimmed) return text;
  return text.replace(trimmed, translated);
}

function translateElementTree(root, language) {
  if (!root || typeof document === 'undefined') return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) {
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

  root.querySelectorAll?.('[placeholder],[title],[aria-label],[data-label]').forEach((element) => {
    ['placeholder', 'title', 'aria-label', 'data-label'].forEach((attr) => {
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
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'data-label'] });
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
