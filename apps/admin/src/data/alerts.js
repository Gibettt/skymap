export const ALERTS = [
  { id: 1, severity: 'Kritis', title: 'Ledakan Komet Terdeteksi', body: 'Peningkatan magnitudo mendadak (outburst) pada komet 12P/Pons-Brooks terpantau.', source: 'Sistem Deteksi Otomatis', time: '12 menit lalu', isOpen: true },
  { id: 2, severity: 'Kritis', title: 'Peringatan Jarak Dekat NEO', body: 'Asteroid 2024 PT5 menyusut jarak MOID-nya dengan bumi. Analisis orbit ulang diperlukan.', source: 'JPL NEO Guard', time: '1 jam lalu', isOpen: true },
  { id: 3, severity: 'Peringatan', title: 'Cuaca Buruk: Penutupan Kubah', body: 'Kecepatan angin melebihi batas aman (60 km/jam). Kubah observatorium ditutup secara otomatis.', source: 'Stasiun Mauna Kea', time: '3 jam lalu', isOpen: true },
  { id: 4, severity: 'Peringatan', title: 'Kualitas Melihat (Seeing) Buruk', body: 'Kondisi atmosfer sangat tidak stabil. Seeing saat ini > 2.5". Pengamatan resolusi tinggi dibatalkan.', source: 'Stasiun Lembang', time: '5 jam lalu', isOpen: true },
  { id: 5, severity: 'Info', title: 'Kalibrasi Instrumen Selesai', body: 'Kalibrasi rutin teleskop Ritchey-Chrétien 400mm telah selesai dilakukan.', source: 'Stasiun Paranal', time: '12 jam lalu', isOpen: false },
  { id: 6, severity: 'Info', title: 'Update Data Ephemeris', body: 'Sinkronisasi data orbital terbaru dari MPC (Minor Planet Center) berhasil.', source: 'Sistem Pusat', time: '1 hari lalu', isOpen: false },
  { id: 7, severity: 'Kritis', title: 'Gangguan Pendingin CCD', body: 'Suhu sensor kamera CCD tidak stabil, fluktuasi di luar batas toleransi (-20°C).', source: 'Stasiun La Palma', time: '1 hari lalu', isOpen: false },
  { id: 8, severity: 'Peringatan', title: 'Kelembaban Udara Tinggi', body: 'Sensor mendeteksi kelembaban mendekati 90%. Risiko embun pada optik sekunder teleskop Dobson.', source: 'Stasiun Siding Spring', time: '2 hari lalu', isOpen: false },
];
