'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import * as Astronomy from 'astronomy-engine';
import * as THREE from 'three';
import styles from './SkyExperience.module.css';

// ─── Default & Preset Locations ───────────────────────────────────
const DEFAULT_LOCATION = {
  name: 'Jakarta (Ephemeris Pilot HQ)',
  latitude: -6.2088,
  longitude: 106.8456,
  timezone: 'Asia/Jakarta',
};

const LOCATION_PRESETS = [
  { name: 'Jakarta (Ephemeris Pilot HQ)', latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta' },
  { name: 'Bosscha Observatory, Lembang', latitude: -6.8247, longitude: 107.6167, timezone: 'Asia/Jakarta' },
  { name: 'Bali Coastal Resort', latitude: -8.7482, longitude: 115.1672, timezone: 'Asia/Makassar' },
  { name: 'Le Meridien Maldives', latitude: 5.3725, longitude: 73.4912, timezone: 'Indian/Maldives' },
];

// ─── Constellations Data ───────────────────────────────────────────
const CONSTELLATIONS = [
  {
    name: 'Orion',
    stars: [
      { ra: 5.919, dec: 7.407 },    // Betelgeuse
      { ra: 5.242, dec: -8.201 },   // Rigel
      { ra: 5.418, dec: 6.349 },    // Bellatrix
      { ra: 5.795, dec: -9.669 },   // Saiph
      { ra: 5.533, dec: -0.299 },   // Mintaka
      { ra: 5.603, dec: -1.201 },   // Alnilam
      { ra: 5.679, dec: -1.942 },   // Alnitak
    ],
    lines: [
      [0, 2], [2, 4], [4, 5], [5, 6], [6, 3], [3, 1], [1, 5], [0, 6]
    ]
  },
  {
    name: 'Ursa Major',
    stars: [
      { ra: 11.062, dec: 61.751 }, // Dubhe
      { ra: 11.030, dec: 56.382 }, // Merak
      { ra: 11.897, dec: 53.694 }, // Phecda
      { ra: 12.257, dec: 57.032 }, // Megrez
      { ra: 12.900, dec: 55.959 }, // Alioth
      { ra: 13.398, dec: 54.925 }, // Mizar
      { ra: 13.792, dec: 49.313 }, // Alkaid
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]
    ]
  },
  {
    name: 'Crux',
    stars: [
      { ra: 12.443, dec: -63.099 }, // Acrux
      { ra: 12.789, dec: -59.688 }, // Mimosa
      { ra: 12.519, dec: -57.113 }, // Gacrux
      { ra: 12.251, dec: -58.748 }, // Imai
    ],
    lines: [
      [0, 2], [1, 3]
    ]
  }
];

// ─── Major Named Stars Dataset ────────────────────────────────────
const NAMED_STARS = [
  {
    id: 'sirius',
    name: 'Sirius',
    bayer: 'α CMa (Alpha Canis Majoris)',
    constellation: 'Canis Major (Anjing Besar)',
    ra: 6.7525,
    dec: -16.7161,
    mag: -1.46,
    color: '#9bb0ff',
    spectral: 'A1V + DA2',
    dist: '8.6 Tahun Cahaya (ly)',
    distKm: '81.4 Triliun km',
    luminosity: '25.4× Matahari',
    temp: '9,940 K',
    radius: '1.71 R☉',
    desc: 'Sirius adalah bintang paling terang di seluruh langit malam Bumi, bersinar hampir dua kali lebih terang dari Canopus. Sirius sebenarnya adalah sistem bintang biner yang terdiri dari bintang deret utama putih-kebiruan (Sirius A) dan katai putih redup (Sirius B). Sejak zaman peradaban Mesir Kuno, kemunculan Sirius sebelum fajar menandai meluapnya Sungai Nil.',
    facts: [
      'Bintang paling terang di langit malam dilihat dari seluruh penjuru Bumi.',
      'Sirius B adalah bintang katai putih pertama yang pernah ditemukan dalam sejarah astronomi.',
      'Sistem bintang ini bergerak mendekati tata surya kita dengan kecepatan 5,5 km/detik.',
    ],
    tip: 'Tampak berkelap-kelip dengan kilatan warna pelangi karena pembiasan atmosfer turbulen saat posisinya rendah di langit timur.',
  },
  {
    id: 'canopus',
    name: 'Canopus',
    bayer: 'α Car (Alpha Carinae)',
    constellation: 'Carina (Lunas Kapal)',
    ra: 6.3992,
    dec: -52.6957,
    mag: -0.74,
    color: '#f8f9ff',
    spectral: 'A9II (Raksasa Putih-Kuning)',
    dist: '310 Tahun Cahaya (ly)',
    distKm: '2.93 Kuadriliun km',
    luminosity: '10,700× Matahari',
    temp: '7,400 K',
    radius: '71 R☉',
    desc: 'Canopus adalah bintang paling terang kedua di langit malam. Merupakan bintang maharaksasa putih-kuning yang sangat masif dan bercahaya lebih dari 10.000 kali Matahari kita. Karena posisinya yang menonjol di belahan langit selatan, Canopus digunakan oleh wahana antariksa NASA sebagai bintang panduan navigasi orientasi sikap (attitude control).',
    facts: [
      'Bintang maharaksasa terang kedua di langit setelah Sirius.',
      'Bintang navigasi utama bagi misi antariksa antarplanet seperti Voyager dan Mariner.',
      'Sangat jelas dan tinggi terlihat di langit malam daerah tropis seperti Indonesia.',
    ],
    tip: 'Sangat mudah ditemukan di langit selatan, tampak sebagai titik putih menyilaukan di bawah Sirius.',
  },
  {
    id: 'alpha_centauri',
    name: 'Alpha Centauri / Rigil Kent',
    bayer: 'α Cen (Alpha Centauri)',
    constellation: 'Centaurus (Sentaurus)',
    ra: 14.6601,
    dec: -60.8339,
    mag: -0.27,
    color: '#fff4e8',
    spectral: 'G2V + K1V + M6V',
    dist: '4.37 Tahun Cahaya (ly)',
    distKm: '41.3 Triliun km',
    luminosity: '1.52× Matahari',
    temp: '5,790 K',
    radius: '1.22 R☉',
    desc: 'Sistem bintang terdekat dengan Tata Surya kita. Terdiri dari tiga bintang: Alpha Centauri A (bintang mirip Matahari), Alpha Centauri B (bintang jingga), dan Proxima Centauri (katai merah terdekat yang memiliki planet berbatu di zona layak huni). Alpha Centauri menjadi target utama penelitian penjelajahan antarbintang manusia di masa depan.',
    facts: [
      'Sistem bintang tetangga paling dekat dengan planet Bumi.',
      'Proxima Centauri berjarak hanya 4.24 tahun cahaya dan memiliki planet ekstrasurya Proxima b.',
      'Merupakan pasangan bintang kembar penunjuk arah (Pointer) menuju Salib Selatan.',
    ],
    tip: 'Gunakan teleskop astronomi dengan pembesaran 80x-100x untuk memisahkan bintang kembar Alpha Centauri A dan B.',
  },
  {
    id: 'arcturus',
    name: 'Arcturus',
    bayer: 'α Boo (Alpha Boötis)',
    constellation: 'Boötes (Sang Gembala)',
    ra: 14.2610,
    dec: 19.1825,
    mag: -0.05,
    color: '#ffd2a1',
    spectral: 'K1.5III (Raksasa Jingga)',
    dist: '36.7 Tahun Cahaya (ly)',
    distKm: '347 Triliun km',
    luminosity: '170× Matahari',
    temp: '4,286 K',
    radius: '25.4 R☉',
    desc: 'Arcturus adalah bintang raksasa jingga paling terang di belahan langit utara dan bintang paling terang keempat di seluruh langit malam. Bintang ini telah kehabisan bahan bakar hidrogen di intinya dan membengkak hingga diameter 25 kali lipat Matahari. Arcturus melesat melintasi piringan galaksi Bimasakti dengan kecepatan fantastis 122 km/detik.',
    facts: [
      'Bintang raksasa jingga terdekat dari tata surya kita.',
      'Cahaya Arcturus digunakan pada tahun 1933 untuk menyalakan lampu pameran dunia Chicago World Fair.',
      'Diperkirakan berasal dari galaksi katai kuno yang diserap oleh Bimasakti miliaran tahun lalu.',
    ],
    tip: 'Ikuti lengkungan ekor Biduk Besar (Big Dipper) untuk menemukan Arcturus ("Follow the arc to Arcturus").',
  },
  {
    id: 'vega',
    name: 'Vega',
    bayer: 'α Lyr (Alpha Lyrae)',
    constellation: 'Lyra (Kecapi)',
    ra: 18.6156,
    dec: 38.7836,
    mag: 0.03,
    color: '#cad8ff',
    spectral: 'A0V (Bintang Putih Kebiruan)',
    dist: '25.0 Tahun Cahaya (ly)',
    distKm: '236.5 Triliun km',
    luminosity: '40.1× Matahari',
    temp: '9,602 K',
    radius: '2.36 R☉',
    desc: 'Vega adalah bintang paling terang kelima di langit malam dan menjadi titik acuan dasar skala magnitudo nol dalam fotometri astronomi modern. Vega berotasi sangat cepat pada porosnya (hanya 12,5 jam per putaran), menyebabkannya membonjol di khatulistiwa. Memiliki cakram debu protoplanet tebal yang mengelilinginya.',
    facts: [
      'Bintang pertama selain Matahari yang pernah difoto oleh astronom (tahun 1850).',
      'Pernah menjadi Bintang Kutub Utara Bumi sekitar tahun 12.000 SM dan akan menjadi Bintang Kutub lagi pada tahun 13.727 M.',
      'Salah satu dari tiga sudut formasi Segitiga Musim Panas (Summer Triangle).',
    ],
    tip: 'Tampak bersinar biru-putih murni dan sangat terang di langit utara.',
  },
  {
    id: 'rigel',
    name: 'Rigel',
    bayer: 'β Ori (Beta Orionis)',
    constellation: 'Orion (Pemburu)',
    ra: 5.2423,
    dec: -8.2016,
    mag: 0.13,
    color: '#bbccff',
    spectral: 'B8Ia (Maharaksasa Biru)',
    dist: '860 Tahun Cahaya (ly)',
    distKm: '8.13 Kuadriliun km',
    luminosity: '120,000× Matahari',
    temp: '12,100 K',
    radius: '78.9 R☉',
    desc: 'Rigel adalah bintang maharaksasa biru yang luar biasa kuat di rasi Orion, memancarkan energi cahaya 120.000 kali lebih banyak dibanding Matahari. Rigel terletak di kaki kiri Orion sang Pemburu. Karena massanya yang sangat masif, Rigel suatu hari nanti akan mengakhiri hidupnya dalam ledakan supernova dahsyat tipe II.',
    facts: [
      'Bintang paling bercahaya dan bertenaga di seluruh rasi Orion.',
      'Menerangi awan gas gelap Nebula Kepala Penyihir (IC 2118) yang berada di dekatnya.',
      'Merupakan sistem bintang majemuk dengan setidaknya empat bintang pendamping.',
    ],
    tip: 'Sangat indah jika dikontraskan dengan warna merah membara Betelgeuse di sudut berlawanan rasi Orion.',
  },
  {
    id: 'betelgeuse',
    name: 'Betelgeuse',
    bayer: 'α Ori (Alpha Orionis)',
    constellation: 'Orion (Pemburu)',
    ra: 5.9195,
    dec: 7.4071,
    mag: 0.50,
    color: '#ff6f43',
    spectral: 'M1-2Ia-Iab (Maharaksasa Merah)',
    dist: '642 Tahun Cahaya (ly)',
    distKm: '6.07 Kuadriliun km',
    luminosity: '126,000× Matahari',
    temp: '3,600 K',
    radius: '887 R☉',
    desc: 'Betelgeuse adalah bintang maharaksasa merah raksasa yang berada di bahu kanan Orion. Ukuran fisiknya sangat mencengangkan — jika diletakkan di pusat Tata Surya kita, permukaan Betelgeuse akan menelan orbit Merkurius, Venus, Bumi, Mars, hingga melampaui orbit Jupiter! Bintang ini berada di tahap akhir evolusinya dan siap meledak supernova.',
    facts: [
      'Bintang raksasa yang diameternya mencapai hampir 900 kali diameter Matahari.',
      'Diprediksi akan meledak menjadi Supernova spektakuler yang bisa terlihat terang di siang hari.',
      'Kecerahannya berdenyut secara ritmis dalam siklus beberapa ratus hari.',
    ],
    tip: 'Warna jingga kemerahan sangat mencolok dan kontras dengan bintang-bintang biru di sekelilingnya.',
  },
  {
    id: 'antares',
    name: 'Antares',
    bayer: 'α Sco (Alpha Scorpii)',
    constellation: 'Scorpius (Kalajengking)',
    ra: 16.4901,
    dec: -26.4320,
    mag: 0.96,
    color: '#ff4422',
    spectral: 'M1.5Iab-Ib (Maharaksasa Merah)',
    dist: '550 Tahun Cahaya (ly)',
    distKm: '5.20 Kuadriliun km',
    luminosity: '75,900× Matahari',
    temp: '3,660 K',
    radius: '680 R☉',
    desc: 'Antares adalah jantung merah membara di rasi Kalajengking (Scorpius). Nama Antares berasal dari bahasa Yunani Kuno "Anti-Ares" yang berarti "Tandingan Mars", karena warna merah darahnya sering bersaing dengan warna planet Mars saat melintas dekat. Antares dikelilingi oleh awan debu kuning-jingga refleksi spektakuler di kawasan Rho Ophiuchi.',
    facts: [
      'Jantung Kalajengking yang berada tepat di jalur tebal galaksi Bimasakti.',
      'Memiliki bintang pendamping biru kecil (Antares B) yang mengorbitnya setiap 1.200 tahun.',
      'Salah satu bintang terbesar yang dapat dilihat dengan mata telanjang.',
    ],
    tip: 'Tampak merah menyala di pusat jalur galaksi Bimasakti selama musim kemarau di Indonesia.',
  },
  {
    id: 'acrux',
    name: 'Acrux',
    bayer: 'α Cru (Alpha Crucis)',
    constellation: 'Crux (Salib Selatan / Pari)',
    ra: 12.4433,
    dec: -63.0991,
    mag: 0.76,
    color: '#9bb0ff',
    spectral: 'B0.5IV + B1V',
    dist: '320 Tahun Cahaya (ly)',
    distKm: '3.03 Kuadriliun km',
    luminosity: '25,000× Matahari',
    temp: '28,000 K',
    radius: '7.8 R☉',
    desc: 'Acrux adalah bintang paling terang di rasi Salib Selatan (Southern Cross / Pari). Terdiri dari sistem bintang ganda biru yang sangat panas dan terang. Bintang ini menjadi simbol navigasi bahari legendaris bagi pelaut Nusantara dan belahan bumi selatan sejak ribuan tahun lalu untuk menentukan arah Kutub Selatan sejati.',
    facts: [
      'Bintang paling selatan di rasi Salib Selatan (kaki salib).',
      'Tergambar di bendera nasional Australia, Selandia Baru, Brasil, Samoa, dan Papua Nugini.',
      'Suhu permukaannya sangat tinggi mencapai 28.000 Kelvin.',
    ],
    tip: 'Tarik garis lurus dari Gacrux menembus Acrux sejauh 4,5 kali panjangnya untuk menemukan Kutub Selatan Langit.',
  },
  {
    id: 'aldebaran',
    name: 'Aldebaran',
    bayer: 'α Tau (Alpha Tauri)',
    constellation: 'Taurus (Banteng)',
    ra: 4.5987,
    dec: 16.5093,
    mag: 0.86,
    color: '#ff9e59',
    spectral: 'K5III (Raksasa Merah)',
    dist: '65.3 Tahun Cahaya (ly)',
    distKm: '617.7 Triliun km',
    luminosity: '439× Matahari',
    temp: '3,910 K',
    radius: '44.2 R☉',
    desc: 'Aldebaran adalah mata merah menyala sang Banteng di rasi Taurus. Namanya berasal dari bahasa Arab "Al-Dabaran" yang berarti "Sang Pengikut", karena posisinya yang selalu tampak mengikuti gugus bintang Pleiades (Tujuh Dara) di langit malam.',
    facts: [
      'Tampak berada di tengah gugus bintang Hyades, namun secara fisik berada 100 tahun cahaya lebih dekat ke Bumi.',
      'Wahana antariksa nirawak Pioneer 10 saat ini sedang meluncur menuju arah Aldebaran.',
      'Bintang raksasa dengan diameter 44 kali diameter Matahari kita.',
    ],
    tip: 'Tarik garis lurus dari Sabuk Orion ke arah kanan atas untuk langsung menemukan Aldebaran.',
  },
  {
    id: 'polaris',
    name: 'Polaris (Bintang Kutub)',
    bayer: 'α UMi (Alpha Ursae Minoris)',
    constellation: 'Ursa Minor (Beruang Kecil)',
    ra: 2.5303,
    dec: 89.2641,
    mag: 1.98,
    color: '#fff4e8',
    spectral: 'F7Ib (Maharaksasa Kuning)',
    dist: '433 Tahun Cahaya (ly)',
    distKm: '4.10 Kuadriliun km',
    luminosity: '2,500× Matahari',
    temp: '6,015 K',
    radius: '37.5 R☉',
    desc: 'Polaris adalah Bintang Kutub Utara Bumi saat ini, terletak hanya kurang dari 1 derajat dari Kutub Langit Utara sejati. Karena posisinya yang hampir segaris dengan sumbu rotasi Bumi, Polaris tampak diam tidak bergerak di langit malam sepanjang tahun sementara semua bintang lain berputar mengelilinginya.',
    facts: [
      'Bintang panduan navigasi arah utara sejati di belahan bumi utara.',
      'Merupakan bintang variabel denyut kelas Cepheid klasik terdekat dari Bumi.',
      'Merupakan sistem tiga bintang dengan bintang utama maharaksasa kuning.',
    ],
    tip: 'Tarik garis dari dua bintang terluar mangkuk Biduk Besar (Merak dan Dubhe) lurus ke atas sejauh 5 kali jarak keduanya.',
  },
];

// ─── Solar System Planets & Moon Detailed Dataset ─────────────────
const PLANET_DATA = [
  {
    body: Astronomy.Body.Moon,
    name: 'Bulan (Moon)',
    category: 'Satelit Alami Bumi',
    color: '#fef3c7',
    size: 3.4,
    dist: '384.400 km (0.00257 AU)',
    distKm: '384.400 km',
    diameter: '3.474 km',
    orbitalPeriod: '27.3 Hari',
    type: 'Satelit Alami',
    desc: 'Bulan adalah satu-satunya satelit alami Bumi dan benda langit terdekat yang sudah pernah dipijak manusia. Permukaannya dipenuhi kawah tubrukan meteorit purba, pegunungan tinggi, dan dataran basal lava gelap yang disebut "Mare" (Laut Bulan). Gravitasi Bulan bertanggung jawab atas pasang surut air laut di Bumi dan menstabilkan kemiringan sumbu rotasi planet kita.',
    facts: [
      'Bulan berada dalam penguncian pasang surut (tidal locking), sehingga sisi yang sama selalu menghadap ke Bumi.',
      'Pendaratan manusia pertama di Bulan dilakukan oleh Apollo 11 pada 20 Juli 1969 di Mare Tranquillitatis.',
      'Bulan menjauh dari Bumi secara perlahan sekitar 3,8 cm setiap tahun.',
    ],
    tip: 'Waktu terbaik mengamati kawah Bulan dengan teleskop adalah saat fase sabit atau kuarter, di sepanjang garis perbatasan terang-gelap (Terminator Line).',
  },
  {
    body: Astronomy.Body.Saturn,
    name: 'Saturnus (Saturn)',
    category: 'Planet Gas Raksasa Bercincin',
    color: '#fde68a',
    size: 2.5,
    dist: '1.42 Miliar km (9.58 AU)',
    distKm: '1.42 Miliar km',
    diameter: '116.460 km (9.1× Bumi)',
    orbitalPeriod: '29.46 Tahun',
    type: 'Ringed Gas Giant',
    desc: 'Saturnus adalah permata tata surya kita, terkenal dengan sistem cincin es raksasa spektakuler yang membentang selebar 282.000 km namun hanya setebal puluhan meter. Cincinnya terdiri dari miliaran bongkahan es air murni dan batuan. Saturnus memiliki 146 bulan yang telah teridentifikasi, dengan satelit raksasa Titan yang memiliki atmosfer tebal dan danau metana cair.',
    facts: [
      'Kerapatan Saturnus sangat rendah — jika ada bak air yang cukup besar, planet Saturnus akan mengapung di atas air!',
      'Celah gelap terkenal di cincinnya disebut Celah Cassini (Cassini Division) selebar 4.800 km.',
      'Satelitnya, Enceladus, menyemburkan gletser air hangat dari samudra bawah tanah ke luar angkasa.',
    ],
    tip: 'Cincin Saturnus dan satelit terbesarnya Titan dapat terlihat sangat jelas dengan teleskop amatir pembesaran 50x ke atas.',
  },
  {
    body: Astronomy.Body.Jupiter,
    name: 'Jupiter',
    category: 'Raja Para Planet (Gas Giant)',
    color: '#fed7aa',
    size: 2.9,
    dist: '628.7 Juta km (4.20 AU)',
    distKm: '628.7 Juta km',
    diameter: '139.820 km (11× Bumi)',
    orbitalPeriod: '11.86 Tahun',
    type: 'Gas Giant Planet',
    desc: 'Jupiter adalah planet terbesar di tata surya dengan massa 2,5 kali lebih besar dari gabungan semua planet lainnya. Terkenal dengan sabuk awan badai horizontal beraneka warna dan Bintik Merah Raksasa (Great Red Spot) — badai antisiklon raksasa selebar 1,3 kali Bumi yang telah mengamuk lebih dari 350 tahun.',
    facts: [
      'Memiliki 4 satelit besar Galilean yang dapat dilihat dari Bumi: Io, Europa, Ganymede, dan Callisto.',
      'Ganymede adalah bulan terbesar di tata surya, bahkan lebih besar dibanding planet Merkurius.',
      'Berotasi paling cepat di antara semua planet tata surya — satu hari di Jupiter hanya berlangsung 9 jam 55 menit.',
    ],
    tip: 'Dengan binokular atau teleskop kecil, Anda dapat melihat 4 titik cahaya kecil berjejer di sisi Jupiter (Bulan-Bulan Galilean).',
  },
  {
    body: Astronomy.Body.Mars,
    name: 'Mars (Planet Merah)',
    category: 'Planet Terestrial Berbatu',
    color: '#f87171',
    size: 1.8,
    dist: '78.3 Juta km (0.52 AU)',
    distKm: '78.3 Juta km',
    diameter: '6.779 km (0.53× Bumi)',
    orbitalPeriod: '687 Hari',
    type: 'Terrestrial Planet',
    desc: 'Mars adalah planet keempat dari Matahari, dikenal sebagai Planet Merah karena tanahnya yang kaya akan debu besi oksida (karat). Mars memiliki gunung berapi terbesar di tata surya (Olympus Mons setinggi 22 km) dan ngarai raksasa Valles Marineris yang membentang sepanjang 4.000 km.',
    facts: [
      'Memiliki dua tudung es kutub abadi yang terbuat dari es air beku dan karbon dioksida beku (dry ice).',
      'Memiliki dua bulan kecil berbentuk kentang bernama Phobos dan Deimos.',
      'Terdapat bukti kuat bahwa air cair pernah mengalir di permukaan Mars miliaran tahun lalu.',
    ],
    tip: 'Saat oposisi Mars (jarak terdekat ke Bumi), gunakan teleskop pembesaran 120x dengan filter merah/oranye untuk melihat tudung es kutub putihnya.',
  },
  {
    body: Astronomy.Body.Venus,
    name: 'Venus (Bintang Fajar / Kejora)',
    category: 'Planet Terestrial Terpanas',
    color: '#fef08a',
    size: 2.1,
    dist: '41.4 Juta km (0.28 AU)',
    distKm: '41.4 Juta km',
    diameter: '12.104 km (0.95× Bumi)',
    orbitalPeriod: '225 Hari',
    type: 'Terrestrial Planet',
    desc: 'Venus adalah objek alami paling terang ketiga di langit setelah Matahari dan Bulan. Sering dijuluki "Kembaran Bumi" karena ukuran dan massanya yang hampir sama, namun Venus mengalami efek rumah kaca tak terkendali yang menjadikannya planet terpanas di tata surya dengan suhu permukaan mencapai 465°C.',
    facts: [
      'Tekanan atmosfer di permukaan Venus 92 kali lipat tekanan atmosfer Bumi (setara kedalaman 900 meter di bawah laut).',
      'Berotasi terbalik (retrograde) — Matahari di Venus terbit di barat dan terbenam di timur.',
      'Menampilkan fase sabit dan cembung seperti Bulan jika diamati melalui teleskop.',
    ],
    tip: 'Sangat menyilaukan di langit barat setelah matahari terbenam atau di langit timur sebelum fajar.',
  },
  {
    body: Astronomy.Body.Mercury,
    name: 'Merkurius (Mercury)',
    category: 'Planet Terestrial Terdekat ke Matahari',
    color: '#cbd5e1',
    size: 1.4,
    dist: '91.7 Juta km (0.61 AU)',
    distKm: '91.7 Juta km',
    diameter: '4.879 km (0.38× Bumi)',
    orbitalPeriod: '88 Hari',
    type: 'Terrestrial Planet',
    desc: 'Merkurius adalah planet terkecil dan terdekat ke Matahari. Karena hampir tidak memiliki atmosfer untuk memerangkap panas, Merkurius mengalami fluktuasi suhu paling ekstrem di tata surya — mencapai 430°C di siang hari dan anjlok hingga -180°C di malam hari.',
    facts: [
      'Planet dengan kecepatan orbit tercepat mengelilingi Matahari (47 km/detik).',
      'Permukaannya dipenuhi kawah tubrukan mirip dengan permukaan Bulan.',
      'Satu hari matahari di Merkurius setara dengan 176 hari di Bumi.',
    ],
    tip: 'Paling baik diamati saat elongasi barat atau timur maksimum, rendah di cakrawala saat senja atau fajar.',
  },
];

// ─── Deep Sky Objects (Messier Catalog) ───────────────────────────
const DEEP_SKY_OBJECTS = [
  {
    id: 'm42',
    name: 'M42 — Nebula Orion',
    type: 'Nebula Emisi & Refleksi',
    constellation: 'Orion',
    ra: 5.588,
    dec: -5.391,
    mag: 4.0,
    dist: '1.344 Tahun Cahaya (ly)',
    distKm: '12.7 Kuadriliun km',
    color: '#ff66aa',
    desc: 'Nebula Orion adalah kawah pembentukan bintang baru paling spektakuler dan paling dekat dengan tata surya kita. Di jantung nebula ini terdapat gugus bintang muda Trapezium yang memancarkan radiasi ultraviolet kuat, menyinari awan gas hidrogen raksasa hingga berpendar.',
    facts: [
      'Dapat dilihat dengan mata telanjang di langit gelap sebagai kabut bercahaya pada pedang Orion.',
      'Merupakan tempat lahirnya ratusan calon sistem tata surya baru dengan cakram protoplanet.',
    ],
    tip: 'Tampak sebagai kabut kehijauan berbentuk sayap burung dengan 4 bintang Trapezium berkilau di tengahnya.',
  },
  {
    id: 'm31',
    name: 'M31 — Galaksi Andromeda',
    type: 'Galaksi Spiral Raksasa',
    constellation: 'Andromeda',
    ra: 0.712,
    dec: 41.269,
    mag: 3.4,
    dist: '2.5 Juta Tahun Cahaya (ly)',
    distKm: '23.6 Kuintiliun km',
    color: '#88ddff',
    desc: 'Galaksi Andromeda adalah galaksi spiral raksasa tetangga terdekat Bimasakti yang memuat lebih dari 1 triliun bintang. Andromeda sedang bergerak mendekati galaksi Bimasakti kita dengan kecepatan 110 km/detik dan diprediksi akan bertubrukan membentuk galaksi elips raksasa dalam 4,5 miliar tahun.',
    facts: [
      'Objek terjauh di alam semesta yang dapat dilihat dengan mata telanjang manusia.',
      'Memiliki diameter sekitar 220.000 tahun cahaya (dua kali lipat ukuran Bimasakti).',
    ],
    tip: 'Tampak seperti awan oval bercahaya lembut di binokular atau teleskop medan pandang lebar.',
  },
  {
    id: 'm45',
    name: 'M45 — Pleiades (Tujuh Dara)',
    type: 'Gugus Bintang Terbuka',
    constellation: 'Taurus',
    ra: 3.791,
    dec: 24.105,
    mag: 1.6,
    dist: '444 Tahun Cahaya (ly)',
    distKm: '4.20 Kuadriliun km',
    color: '#66ccff',
    desc: 'Pleiades adalah gugus bintang terbuka berusia muda (sekitar 100 juta tahun) yang terdiri dari bintang-bintang biru bertemperatur tinggi. Gugus ini diselimuti oleh kabut debu refleksi tipis yang memantulkan cahaya biru berlian bintang-bintang anggotanya.',
    facts: [
      'Mata telanjang biasanya dapat melihat 6 hingga 7 bintang paling terangnya.',
      'Menjadi inspirasi logo pabrikan mobil Jepang ternama (Subaru adalah nama Pleiades dalam bahasa Jepang).',
    ],
    tip: 'Paling memukau diamati menggunakan binokular 7x50 atau 10x50 dibanding teleskop pembesaran tinggi.',
  },
];

// ─── Procedural High-Res Planet Texture Generators ───────────────
function createProceduralMoonTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b8bcc4';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#656b78';
  ctx.beginPath(); ctx.ellipse(380, 180, 120, 80, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(260, 220, 140, 130, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(540, 190, 80, 70, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(600, 250, 90, 70, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(720, 200, 50, 40, 0.1, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  const tychoX = 420, tychoY = 380;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const len = 120 + ((i * 37) % 180);
    ctx.beginPath();
    ctx.moveTo(tychoX, tychoY);
    ctx.lineTo(tychoX + Math.cos(angle) * len, tychoY + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createProceduralJupiterTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const bands = [
    { y: 0, h: 60, col: '#c8b69b' },
    { y: 60, h: 40, col: '#8d5b4c' },
    { y: 100, h: 50, col: '#d7c7b2' },
    { y: 150, h: 55, col: '#9c5d41' },
    { y: 205, h: 50, col: '#e8ded0' },
    { y: 255, h: 60, col: '#a35e40' },
    { y: 315, h: 45, col: '#dccdbb' },
    { y: 360, h: 40, col: '#845749' },
    { y: 400, h: 112, col: '#baa48d' },
  ];
  bands.forEach((b) => {
    ctx.fillStyle = b.col;
    ctx.fillRect(0, b.y, 1024, b.h);
  });

  const grsX = 620, grsY = 285;
  const grsGrad = ctx.createRadialGradient(grsX, grsY, 5, grsX, grsY, 40);
  grsGrad.addColorStop(0, '#c2410c');
  grsGrad.addColorStop(0.6, '#ea580c');
  grsGrad.addColorStop(1, '#9a3412');
  ctx.fillStyle = grsGrad;
  ctx.beginPath();
  ctx.ellipse(grsX, grsY, 48, 26, 0.05, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createProceduralSaturnTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#8c7d61');
  grad.addColorStop(0.3, '#dfcfad');
  grad.addColorStop(0.5, '#ebdcc1');
  grad.addColorStop(0.7, '#d9c69f');
  grad.addColorStop(1, '#817357');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createProceduralSaturnRingTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(0.08, 'rgba(180, 160, 120, 0.25)');
  grad.addColorStop(0.25, 'rgba(230, 210, 170, 0.95)');
  grad.addColorStop(0.58, 'rgba(215, 195, 150, 0.9)');
  grad.addColorStop(0.60, 'rgba(10, 10, 10, 0.05)'); // Cassini Division Gap
  grad.addColorStop(0.66, 'rgba(10, 10, 10, 0.05)');
  grad.addColorStop(0.68, 'rgba(195, 175, 135, 0.75)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createProceduralMarsTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c85022';
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#6f2812';
  ctx.beginPath(); ctx.ellipse(450, 220, 110, 70, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(750, 300, 160, 90, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(512, 20, 140, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(512, 492, 100, 20, 0, 0, Math.PI * 2); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createProceduralVenusTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#e5d1a4');
  grad.addColorStop(0.5, '#f5e8c8');
  grad.addColorStop(1, '#dfc999');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createOpticalStarTexture() {
  if (typeof document === 'undefined') return null;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.06, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.18, 'rgba(220, 240, 255, 0.65)');
  grad.addColorStop(0.4, 'rgba(120, 180, 255, 0.2)');
  grad.addColorStop(0.7, 'rgba(60, 100, 220, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(c, 16); ctx.lineTo(c, size - 16);
  ctx.moveTo(16, c); ctx.lineTo(size - 16, c);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function toSpherePos(horizontal, radius = 90) {
  const alt = THREE.MathUtils.degToRad(horizontal.altitude);
  const az = THREE.MathUtils.degToRad(horizontal.azimuth);
  return new THREE.Vector3(
    radius * Math.cos(alt) * Math.sin(az),
    radius * Math.sin(alt),
    -radius * Math.cos(alt) * Math.cos(az)
  );
}

function formatDateDisplay(date, timezone) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: timezone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function getCardinalDirection(bearing) {
  if (bearing >= 337.5 || bearing < 22.5) return 'UTARA (N)';
  if (bearing < 67.5) return 'TIMUR LAUT (NE)';
  if (bearing < 112.5) return 'TIMUR (E)';
  if (bearing < 157.5) return 'TENGGARA (SE)';
  if (bearing < 202.5) return 'SELATAN (S)';
  if (bearing < 247.5) return 'BARAT DAYA (SW)';
  if (bearing < 292.5) return 'BARAT (W)';
  return 'BARAT LAUT (NW)';
}

// ─── Main Component ──────────────────────────────────────────────
export default function SkyExperience() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [events, setEvents] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState(1);

  // Geo
  const [geoPromptVisible, setGeoPromptVisible] = useState(true);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [calibrationToast, setCalibrationToast] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Viewport & Camera
  const [bearing, setBearing] = useState(180);
  const [pitch, setPitch] = useState(25);
  const [fov, setFov] = useState(60);

  // Floating Labels on Sky State
  const [floatingLabels, setFloatingLabels] = useState([]);
  const [showLabels, setShowLabels] = useState(true);

  // Stellarium View Toggles
  const [showConstellationLines, setShowConstellationLines] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showDeepSky, setShowDeepSky] = useState(true);
  const [showPlanets, setShowPlanets] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showGround, setShowGround] = useState(true);
  const [nightMode, setNightMode] = useState(false);

  // Selected Object & Search
  const [selectedObject, setSelectedObject] = useState(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventsDrawerOpen, setEventsDrawerOpen] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);

  const hostRef = useRef(null);
  const stateRef = useRef({ bearing, pitch, fov, showLabels, selectedObject });
  const runtimeRef = useRef(null);

  // Sync state ref
  useEffect(() => {
    stateRef.current = { bearing, pitch, fov, showLabels, selectedObject };
  }, [bearing, pitch, fov, showLabels, selectedObject]);

  // ─── Geolocation Detection ─────────────────────────────────────
  const detectLocationByIp = useCallback(async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          const locName = `${data.city || data.region || 'Lokasi Terdeteksi'}, ${data.country_name || 'Indonesia'}`;
          const newLoc = { name: locName, latitude: Number(data.latitude), longitude: Number(data.longitude), timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta', isUserGps: true };
          setLocation(newLoc);
          try { localStorage.setItem('ephemeris_user_location', JSON.stringify(newLoc)); } catch {}
          setCalibrationToast(`✓ Langit diselaraskan otomatis: ${locName}`);
          setTimeout(() => setCalibrationToast(''), 4500);
          return true;
        }
      }
    } catch {}
    return false;
  }, []);

  const requestUserLocation = useCallback((isManualTrigger = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      detectLocationByIp();
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setIsDetectingGps(false);
        setGeoPromptVisible(false);
        setLocationModalOpen(false);
        const lat = coords.latitude;
        const lon = coords.longitude;
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
        let locName = `Lokasi Anda (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, { signal: controller.signal, headers: { 'Accept-Language': 'id,en' } });
          clearTimeout(timeout);
          if (res.ok) {
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.municipality || data.address?.county || data.address?.state;
            const country = data.address?.country;
            if (city && country) locName = `${city}, ${country}`;
            else if (data.display_name) locName = data.display_name.split(',').slice(0, 2).join(',');
          }
        } catch {}
        const newLoc = { name: locName, latitude: lat, longitude: lon, timezone: userTz, isUserGps: true };
        setLocation(newLoc);
        try { localStorage.setItem('ephemeris_user_location', JSON.stringify(newLoc)); } catch {}
        setCalibrationToast(`✓ Posisi diselaraskan: ${locName}`);
        setTimeout(() => setCalibrationToast(''), 4500);
      },
      async () => {
        setIsDetectingGps(false);
        setGeoPromptVisible(false);
        const ipSuccess = await detectLocationByIp();
        if (!ipSuccess && isManualTrigger) {
          setCalibrationToast('⚠️ Izin GPS ditutup. Menggunakan koordinat default observatori.');
          setTimeout(() => setCalibrationToast(''), 4000);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [detectLocationByIp]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ephemeris_user_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) { setLocation(parsed); setGeoPromptVisible(false); return; }
      }
    } catch {}
    requestUserLocation(false);
  }, [requestUserLocation]);

  // Load events
  useEffect(() => {
    const today = new Date();
    const from = today.toISOString().slice(0, 10);
    const to = new Date(today.getTime() + 180 * 86400000).toISOString().slice(0, 10);
    Promise.all([
      fetch('/api/sky-settings').then((r) => r.ok ? r.json() : {}),
      fetch(`/api/sky-events?from=${from}&to=${to}`).then((r) => r.ok ? r.json() : { events: [] }),
    ]).then(([settings, calendar]) => {
      if (settings.location && !location.isUserGps) setLocation((prev) => (prev.isUserGps ? prev : settings.location));
      if (calendar.events) setEvents(calendar.events);
    }).catch(() => {});
  }, [location.isUserGps]);

  // Time machine tick
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => new Date(prev.getTime() + 1000 * timeSpeed));
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, timeSpeed]);

  // ─── 3D WebGL Scene Setup ─────────────────────────────────────────
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#010206');

    const camera = new THREE.PerspectiveCamera(stateRef.current.fov, 1, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    // High-Resolution Photo Textures
    const starTexture = createOpticalStarTexture();
    const textureLoader = new THREE.TextureLoader();
    const moonTex = textureLoader.load('/textures/planets/moonmap1k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const jupiterTex = textureLoader.load('/textures/planets/jupitermap.jpg');
    jupiterTex.colorSpace = THREE.SRGBColorSpace;
    const saturnTex = textureLoader.load('/textures/planets/saturnmap.jpg');
    saturnTex.colorSpace = THREE.SRGBColorSpace;
    const saturnRingTex = textureLoader.load('/textures/planets/saturnringcolor.jpg');
    saturnRingTex.colorSpace = THREE.SRGBColorSpace;
    const marsTex = textureLoader.load('/textures/planets/marsmap1k.jpg');
    marsTex.colorSpace = THREE.SRGBColorSpace;
    const venusTex = textureLoader.load('/textures/planets/venusmap.jpg');
    venusTex.colorSpace = THREE.SRGBColorSpace;

    // Scene Groups
    const celestialGroup = new THREE.Group();
    const milkyWayGroup = new THREE.Group();
    const bgStarsGroup = new THREE.Group();
    const namedStarsGroup = new THREE.Group();
    const constellationLinesGroup = new THREE.Group();
    const planetsGroup = new THREE.Group();
    const dsoGroup = new THREE.Group();
    const gridGroup = new THREE.Group();
    const groundGroup = new THREE.Group();

    scene.add(celestialGroup);
    celestialGroup.add(milkyWayGroup);
    celestialGroup.add(bgStarsGroup);
    celestialGroup.add(namedStarsGroup);
    celestialGroup.add(constellationLinesGroup);
    celestialGroup.add(planetsGroup);
    celestialGroup.add(dsoGroup);
    celestialGroup.add(gridGroup);
    scene.add(groundGroup);

    // Ground Plane & Horizon Ring
    const groundGeo = new THREE.CircleGeometry(120, 64);
    const groundMat = new THREE.MeshBasicMaterial({ color: '#03070d', side: THREE.DoubleSide });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.5;
    groundGroup.add(groundMesh);

    const horizonRingGeo = new THREE.TorusGeometry(95, 1.2, 8, 128);
    const horizonRingMat = new THREE.MeshBasicMaterial({ color: '#0c1e30', transparent: true, opacity: 0.5 });
    const horizonRing = new THREE.Mesh(horizonRingGeo, horizonRingMat);
    horizonRing.rotation.x = Math.PI / 2;
    groundGroup.add(horizonRing);

    // Azimuthal Coordinate Grid
    const gridHelper = new THREE.PolarGridHelper(90, 8, 8, 64, '#0e3a47', '#08212b');
    gridGroup.add(gridHelper);

    runtimeRef.current = {
      renderer, camera, scene, starTexture,
      moonTex, jupiterTex, saturnTex, saturnRingTex, marsTex, venusTex,
      celestialGroup, milkyWayGroup, bgStarsGroup, namedStarsGroup,
      constellationLinesGroup, planetsGroup, dsoGroup,
      gridGroup, groundGroup,
      clickableObjects: [],
      trackableObjects: [],
    };

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      camera.aspect = width / Math.max(height, 1);
      camera.fov = stateRef.current.fov;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    // Mouse & Touch Drag Controls
    let drag = null;
    let lastClickTime = 0;

    const onPointerDown = (e) => {
      drag = { x: e.clientX, y: e.clientY, bearing: stateRef.current.bearing, pitch: stateRef.current.pitch, moved: false };
      renderer.domElement.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!drag) return;
      const deltaX = e.clientX - drag.x;
      const deltaY = e.clientY - drag.y;
      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true;
      const sensitivity = Math.max(0.08, stateRef.current.fov / 60);
      setBearing((drag.bearing - deltaX * 0.32 * sensitivity + 360) % 360);
      setPitch(Math.max(-45, Math.min(88, drag.pitch + deltaY * 0.32 * sensitivity)));
    };

    const onPointerUp = (e) => {
      if (drag && !drag.moved) {
        const rect = host.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.params.Points = { threshold: 4 };
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(runtimeRef.current.clickableObjects, true);

        if (intersects.length > 0) {
          const hit = intersects[0].object.userData;
          if (hit?.item) setSelectedObject(hit.item);
        } else {
          const now = Date.now();
          if (now - lastClickTime < 350) setSelectedObject(null);
          lastClickTime = now;
        }
      }
      drag = null;
    };

    // Deep Telescope Zoom (1.0° to 90°)
    const onWheel = (e) => {
      e.preventDefault();
      setFov((prev) => {
        const speed = prev < 15 ? 0.015 : 0.04;
        return Math.max(1.0, Math.min(90, prev + e.deltaY * speed));
      });
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Pinch zoom for mobile
    let lastPinchDist = 0;
    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = lastPinchDist - dist;
        setFov((prev) => Math.max(1.0, Math.min(90, prev + delta * 0.15)));
        lastPinchDist = dist;
      }
    };
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    dom.addEventListener('touchmove', onTouchMove, { passive: true });

    let animId;
    let frameCount = 0;

    const animate = () => {
      const curr = stateRef.current;
      camera.fov = curr.fov;
      camera.updateProjectionMatrix();

      camera.rotation.order = 'YXZ';
      camera.rotation.y = THREE.MathUtils.degToRad(curr.bearing);
      camera.rotation.x = THREE.MathUtils.degToRad(-curr.pitch);

      // Compute Floating Labels screen positions
      frameCount++;
      if (frameCount % 2 === 0 && runtimeRef.current?.trackableObjects && curr.showLabels) {
        const rect = host.getBoundingClientRect();
        const visibleList = [];

        for (const trackObj of runtimeRef.current.trackableObjects) {
          const p = trackObj.pos.clone();
          p.project(camera);

          // Object is in front of camera and inside screen bounds
          if (p.z > 0 && p.z < 1 && p.x >= -1.1 && p.x <= 1.1 && p.y >= -1.1 && p.y <= 1.1) {
            const sx = (p.x * 0.5 + 0.5) * rect.width;
            const sy = (-p.y * 0.5 + 0.5) * rect.height;
            visibleList.push({
              item: trackObj.item,
              x: sx,
              y: sy,
              type: trackObj.type,
            });
          }
        }
        setFloatingLabels(visibleList);
      } else if (!curr.showLabels && floatingLabels.length > 0) {
        setFloatingLabels([]);
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchstart', onTouchStart);
      dom.removeEventListener('touchmove', onTouchMove);
      renderer.dispose();
      host.removeChild(dom);
      runtimeRef.current = null;
    };
  }, []);

  // ─── Celestial Object Coordinates Calculation & 3D Population ─────
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
    runtime.clickableObjects = [];
    runtime.trackableObjects = [];

    const cleanGroup = (grp) => {
      grp.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      grp.clear();
    };

    cleanGroup(runtime.milkyWayGroup);
    cleanGroup(runtime.bgStarsGroup);
    cleanGroup(runtime.namedStarsGroup);
    cleanGroup(runtime.constellationLinesGroup);
    cleanGroup(runtime.planetsGroup);
    cleanGroup(runtime.dsoGroup);

    runtime.gridGroup.visible = showGrid;
    runtime.groundGroup.visible = showGround;
    runtime.constellationLinesGroup.visible = showConstellationLines;

    const starTexture = runtime.starTexture;

    // ─── 1. Milky Way Volumetric Dust Nebula ─────────────────────────
    if (showMilkyWay) {
      const mwPositions = [];
      const mwColors = [];
      const mwCount = 2200;

      for (let i = 0; i < mwCount; i++) {
        const galLon = (i / mwCount) * 360;
        const spread = 8.5 + Math.sin(galLon * 0.017) * 4.5;
        const galLat = (Math.random() - 0.5) * spread * 2.2;
        const ra = (galLon / 15 + 18.0) % 24;
        const dec = Math.sin(THREE.MathUtils.degToRad(galLon)) * 62.8 + galLat;
        const hor = Astronomy.Horizon(currentTime, observer, ra, dec, 'normal');

        if (hor.altitude > -5) {
          const pt = toSpherePos(hor, 89);
          mwPositions.push(pt.x, pt.y, pt.z);
          const isCore = (galLon < 55 || galLon > 305);
          const brightness = isCore ? 0.38 + Math.random() * 0.3 : 0.12 + Math.random() * 0.18;
          const c = new THREE.Color();
          if (isCore) c.setHSL(0.08 + Math.random() * 0.04, 0.45, brightness);
          else c.setHSL(0.58 + Math.random() * 0.08, 0.25, brightness);
          mwColors.push(c.r, c.g, c.b);
        }
      }

      const mwGeo = new THREE.BufferGeometry();
      mwGeo.setAttribute('position', new THREE.Float32BufferAttribute(mwPositions, 3));
      mwGeo.setAttribute('color', new THREE.Float32BufferAttribute(mwColors, 3));
      const mwMat = new THREE.PointsMaterial({
        size: 3.6,
        map: starTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      runtime.milkyWayGroup.add(new THREE.Points(mwGeo, mwMat));
    }

    // ─── 2. Background Vector Star Field (7,500+ Crisp Stars) ────────
    const bgPositions = [];
    const bgColors = [];
    const starCount = 7500;

    for (let i = 0; i < starCount; i++) {
      const ra = ((i * 17.311 + Math.sin(i * 0.73) * 3.1) % 24 + 24) % 24;
      const u = ((i * 43.791 + Math.cos(i * 1.13) * 0.5) % 1);
      const dec = Math.asin(2 * u - 1) * (180 / Math.PI);
      const hor = Astronomy.Horizon(currentTime, observer, ra, dec, 'normal');

      if (hor.altitude > -4) {
        const pt = toSpherePos(hor, 90);
        bgPositions.push(pt.x, pt.y, pt.z);

        const colorRand = (i * 7.3) % 10;
        let starCol = '#cad8ff';
        if (colorRand < 1.2) starCol = '#ffd2a1';
        else if (colorRand < 3.0) starCol = '#fff4e8';
        else if (colorRand < 6.0) starCol = '#f8f9ff';
        else if (colorRand < 8.5) starCol = '#e0eaff';

        const c = new THREE.Color(starCol);
        const ext = hor.altitude < 12 ? 0.35 + (hor.altitude / 12) * 0.65 : 1.0;
        bgColors.push(c.r * ext, c.g * ext, c.b * ext);
      }
    }

    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.Float32BufferAttribute(bgPositions, 3));
    bgGeo.setAttribute('color', new THREE.Float32BufferAttribute(bgColors, 3));
    const bgMat = new THREE.PointsMaterial({
      size: 1.4,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    runtime.bgStarsGroup.add(new THREE.Points(bgGeo, bgMat));

    // ─── 3. Major Named Stars (Glowing 3D Optical Halos & Labels) ─────
    for (const star of NAMED_STARS) {
      const hor = Astronomy.Horizon(currentTime, observer, star.ra, star.dec, 'normal');
      if (hor.altitude > -8) {
        const pt = toSpherePos(hor, 88);
        const baseMag = Math.max(0.6, 3.2 - (star.mag * 0.5));

        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(baseMag * 0.35, 12, 12),
          new THREE.MeshBasicMaterial({ color: '#ffffff' })
        );
        mesh.position.copy(pt);

        const spriteMat = new THREE.SpriteMaterial({
          map: starTexture,
          color: star.color,
          transparent: true,
          opacity: Math.min(1.0, 0.65 + (2.0 - star.mag) * 0.18),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMat);
        const glowSize = baseMag * 4.2;
        sprite.scale.set(glowSize, glowSize, 1);
        mesh.add(sprite);

        const itemData = { ...star, altitude: hor.altitude, azimuth: hor.azimuth };
        mesh.userData = { type: 'star', item: itemData };
        runtime.namedStarsGroup.add(mesh);
        runtime.clickableObjects.push(mesh);

        if (hor.altitude > 0) {
          runtime.trackableObjects.push({ pos: pt, item: itemData, type: 'star' });
        }
      }
    }

    // ─── 4. Constellation Lines ──────────────────────────────────────
    if (showConstellationLines) {
      for (const constel of CONSTELLATIONS) {
        const starPositions = constel.stars.map((s) => {
          const h = Astronomy.Horizon(currentTime, observer, s.ra, s.dec, 'normal');
          return toSpherePos(h, 87.5);
        });

        const linePositions = [];
        for (const [idxA, idxB] of constel.lines) {
          const a = starPositions[idxA];
          const b = starPositions[idxB];
          if (a && b) linePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }

        if (linePositions.length > 0) {
          const lineGeo = new THREE.BufferGeometry();
          lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
          const lineMat = new THREE.LineBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.32,
          });
          runtime.constellationLinesGroup.add(new THREE.LineSegments(lineGeo, lineMat));
        }
      }
    }

    // ─── 5. Deep Sky Objects (Messier Catalog) ────────────────────────
    if (showDeepSky) {
      for (const dso of DEEP_SKY_OBJECTS) {
        const hor = Astronomy.Horizon(currentTime, observer, dso.ra, dso.dec, 'normal');
        if (hor.altitude > -5) {
          const pt = toSpherePos(hor, 87);
          const dsoSpriteMat = new THREE.SpriteMaterial({
            map: starTexture,
            color: dso.color,
            transparent: true,
            opacity: 0.45,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          const dsoSprite = new THREE.Sprite(dsoSpriteMat);
          dsoSprite.scale.set(5.5, 5.5, 1);
          dsoSprite.position.copy(pt);

          const coreMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.8, 1.5, 24),
            new THREE.MeshBasicMaterial({ color: dso.color, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
          );
          coreMesh.position.copy(pt);
          coreMesh.lookAt(0, 0, 0);

          const itemData = { ...dso, altitude: hor.altitude, azimuth: hor.azimuth };
          coreMesh.userData = { type: 'dso', item: itemData };

          runtime.dsoGroup.add(dsoSprite);
          runtime.dsoGroup.add(coreMesh);
          runtime.clickableObjects.push(coreMesh);

          if (hor.altitude > 0) {
            runtime.trackableObjects.push({ pos: pt, item: itemData, type: 'dso' });
          }
        }
      }
    }

    // ─── 6. True 3D Textured Planet Models (Saturn, Jupiter, Moon, Mars) ─
    if (showPlanets) {
      const PLANET_DEFINITIONS = [
        { ...PLANET_DATA[0], texture: runtime.moonTex },
        { ...PLANET_DATA[1], texture: runtime.saturnTex },
        { ...PLANET_DATA[2], texture: runtime.jupiterTex },
        { ...PLANET_DATA[3], texture: runtime.marsTex },
        { ...PLANET_DATA[4], texture: runtime.venusTex },
        { ...PLANET_DATA[5], texture: null },
      ];

      for (const pDef of PLANET_DEFINITIONS) {
        try {
          const equator = Astronomy.Equator(pDef.body, currentTime, observer, true, true);
          const hor = Astronomy.Horizon(currentTime, observer, equator.ra, equator.dec, 'normal');

          if (hor.altitude > -12) {
            const pt = toSpherePos(hor, 85);

            const mat = pDef.texture
              ? new THREE.MeshBasicMaterial({ map: pDef.texture })
              : new THREE.MeshBasicMaterial({ color: pDef.color });

            const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(pDef.size, 32, 32), mat);
            planetMesh.position.copy(pt);
            planetMesh.lookAt(0, 0, 0);

            const haloSprite = new THREE.Sprite(
              new THREE.SpriteMaterial({
                map: starTexture,
                color: pDef.color,
                transparent: true,
                opacity: 0.5,
                blending: THREE.AdditiveBlending,
              })
            );
            haloSprite.scale.set(pDef.size * 3.8, pDef.size * 3.8, 1);
            planetMesh.add(haloSprite);

            // Saturn's 3D Ring System
            if (pDef.name.includes('Saturnus')) {
              const ringGeo = new THREE.RingGeometry(pDef.size * 1.4, pDef.size * 2.8, 64);
              const pos = ringGeo.attributes.position;
              const uv = ringGeo.attributes.uv;
              for (let i = 0; i < pos.count; i++) {
                const vx = pos.getX(i);
                const vy = pos.getY(i);
                const r = Math.sqrt(vx * vx + vy * vy);
                const u = (r - pDef.size * 1.4) / (pDef.size * 1.4);
                uv.setXY(i, u, 0.5);
              }
              ringGeo.attributes.uv.needsUpdate = true;

              const ringMat = new THREE.MeshBasicMaterial({
                map: runtime.saturnRingTex,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.95,
              });
              const ringMesh = new THREE.Mesh(ringGeo, ringMat);
              ringMesh.rotation.x = Math.PI / 3.2;
              planetMesh.add(ringMesh);
            }

            // Jupiter's 4 Galilean Moons (Io, Europa, Ganymede, Callisto)
            if (pDef.name.includes('Jupiter')) {
              const moons = [
                { name: 'Io', color: '#facc15', dist: 4.5, size: 0.4 },
                { name: 'Europa', color: '#e2e8f0', dist: 6.2, size: 0.35 },
                { name: 'Ganymede', color: '#94a3b8', dist: 8.5, size: 0.5 },
                { name: 'Callisto', color: '#64748b', dist: 11.0, size: 0.45 },
              ];
              moons.forEach((m, idx) => {
                const angle = (currentTime.getTime() / 100000) * (4 - idx * 0.7) + idx * 1.5;
                const mMesh = new THREE.Mesh(
                  new THREE.SphereGeometry(m.size, 12, 12),
                  new THREE.MeshBasicMaterial({ color: m.color })
                );
                mMesh.position.set(Math.cos(angle) * m.dist, Math.sin(angle) * 0.8, Math.sin(angle) * m.dist);
                planetMesh.add(mMesh);
              });
            }

            // Moon Phase Calculation
            let moonInfo = '';
            let moonPhaseName = '';
            if (pDef.body === Astronomy.Body.Moon) {
              const phase = Astronomy.MoonPhase(currentTime);
              const illum = Astronomy.Illumination(Astronomy.Body.Moon, currentTime);
              const pct = ((illum.phase_fraction || illum.mag_fraction || 0.5) * 100).toFixed(0);
              moonInfo = `Fase: ${phase.toFixed(1)}° — ${pct}% Terang`;
              if (phase < 22.5) moonPhaseName = 'Bulan Baru 🌑';
              else if (phase < 67.5) moonPhaseName = 'Sabit Awal 🌒';
              else if (phase < 112.5) moonPhaseName = 'Kuarter Pertama 🌓';
              else if (phase < 157.5) moonPhaseName = 'Cembung Awal 🌔';
              else if (phase < 202.5) moonPhaseName = 'Bulan Purnama 🌕';
              else if (phase < 247.5) moonPhaseName = 'Cembung Akhir 🌖';
              else if (phase < 292.5) moonPhaseName = 'Kuarter Akhir 🌗';
              else moonPhaseName = 'Sabit Akhir 🌘';
            }

            const itemData = {
              ...pDef,
              ra: equator.ra,
              dec: equator.dec,
              altitude: hor.altitude,
              azimuth: hor.azimuth,
              moonInfo,
              moonPhaseName,
            };

            planetMesh.userData = { type: 'planet', item: itemData };
            runtime.planetsGroup.add(planetMesh);
            runtime.clickableObjects.push(planetMesh);

            if (hor.altitude > 0) {
              runtime.trackableObjects.push({ pos: pt, item: itemData, type: 'planet' });
            }
          }
        } catch {}
      }
    }
  }, [currentTime, location, showConstellationLines, showMilkyWay, showDeepSky, showPlanets, showGrid, showGround]);

  // ─── Mobile Gyroscope / Compass Sensor ───────────────────────────
  const toggleSensors = async () => {
    if (sensorActive) { setSensorActive(false); return; }
    try {
      if (typeof window.DeviceOrientationEvent !== 'undefined' && typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const granted = await window.DeviceOrientationEvent.requestPermission();
        if (granted !== 'granted') return;
      }
      const onOrientation = (e) => {
        const heading = typeof e.webkitCompassHeading === 'number' ? e.webkitCompassHeading : typeof e.alpha === 'number' ? (360 - e.alpha) % 360 : null;
        if (heading !== null) setBearing(heading);
        if (typeof e.beta === 'number') setPitch(Math.max(-30, Math.min(75, e.beta - 45)));
      };
      window.addEventListener('deviceorientationabsolute', onOrientation, true);
      window.addEventListener('deviceorientation', onOrientation, true);
      setSensorActive(true);
    } catch {}
  };

  // ─── Search ──────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    const list = [
      ...PLANET_DATA.map((p) => ({ ...p, category: 'Tata Surya (Planet/Bulan)' })),
      ...NAMED_STARS.map((s) => ({ ...s, category: 'Bintang Utama' })),
      ...DEEP_SKY_OBJECTS.map((d) => ({ ...d, category: 'Deep Sky (Messier)' })),
    ];
    return list.filter((item) => item.name.toLowerCase().includes(q) || (item.constellation && item.constellation.toLowerCase().includes(q)));
  }, [searchQuery]);

  const focusOnObject = (item) => {
    setSelectedObject(item);
    setSearchModalOpen(false);
    try {
      const obs = new Astronomy.Observer(location.latitude, location.longitude, 0);
      const hor = Astronomy.Horizon(currentTime, obs, item.ra, item.dec, 'normal');
      setBearing(hor.azimuth);
      setPitch(Math.max(-10, Math.min(80, hor.altitude)));
      setFov((prev) => Math.min(prev, 25));
    } catch {}
  };

  const telescopeZoomIn = () => {
    if (!selectedObject) return;
    try {
      const obs = new Astronomy.Observer(location.latitude, location.longitude, 0);
      const hor = Astronomy.Horizon(currentTime, obs, selectedObject.ra, selectedObject.dec, 'normal');
      setBearing(hor.azimuth);
      setPitch(Math.max(-10, Math.min(80, hor.altitude)));
      setFov(selectedObject.type === 'Planet' || selectedObject.type === 'Satelit Alami' || selectedObject.body ? 3.0 : 6.5);
    } catch {}
  };

  const resetWideView = () => {
    setFov(60);
  };

  return (
    <main className={`${styles.page} ${nightMode ? styles.nightMode : ''}`}>
      {/* 3D WebGL Canvas Viewport */}
      <div ref={hostRef} className={styles.viewport} aria-label="Ephemeris 3D Stellarium Sky" />

      {/* Floating 3D/2D Object Labels on Sky View */}
      {showLabels && (
        <div className={styles.floatingLabelsLayer}>
          {floatingLabels.map((lbl, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.objectLabel} ${lbl.type === 'planet' ? styles.objectLabelPlanet : lbl.type === 'dso' ? styles.objectLabelDso : ''} ${selectedObject?.name === lbl.item.name ? styles.active : ''}`}
              style={{ left: lbl.x, top: lbl.y }}
              onClick={() => setSelectedObject(lbl.item)}
            >
              {lbl.type === 'planet' ? '🪐 ' : lbl.type === 'dso' ? '✨ ' : '★ '}
              {lbl.item.name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* Telescope Mode Active Badge */}
      {fov < 15 && (
        <div className={styles.telescopeModeBadge}>
          <span>🔭 Mode Teleskop ({Math.round(60 / fov)}x Zoom)</span>
          <button type="button" className={styles.closeTelescopeBtn} onClick={resetWideView}>
            Reset (1x)
          </button>
        </div>
      )}

      {/* Top Glass Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandGroup}>
          <Link href="/" className={styles.brandLogo}>
            <span>★</span> Ephemeris <span>Sky Guide</span>
          </Link>
          <div className={styles.brandDivider} />
          <button
            type="button"
            className={styles.locationBadge}
            onClick={() => setLocationModalOpen(true)}
            title="Klik untuk mengubah atau mendeteksi lokasi GPS Anda"
          >
            <span className={styles.gpsPulse} />
            📍 <strong>{location.name}</strong>
          </button>
        </div>

        <div className={styles.topActions}>
          <button type="button" className={styles.actionBtn} onClick={() => setSearchModalOpen(true)}>
            🔍 Cari Langit
          </button>
          <button type="button" className={`${styles.actionBtn} ${eventsDrawerOpen ? styles.active : ''}`} onClick={() => setEventsDrawerOpen((p) => !p)}>
            📅 Event Langit ({events.length})
          </button>
          <button type="button" className={`${styles.actionBtn} ${sensorActive ? styles.active : ''}`} onClick={toggleSensors}>
            🧭 {sensorActive ? 'Sensor Aktif' : 'Kompas HP'}
          </button>
          <button type="button" className={`${styles.actionBtn} ${nightMode ? styles.active : ''}`} onClick={() => setNightMode((p) => !p)}>
            🔴 {nightMode ? 'Night Mode ON' : 'Night Vision'}
          </button>
        </div>
      </header>

      {/* Calibration Toast Alert */}
      {calibrationToast && <div className={styles.calibrationToast}>{calibrationToast}</div>}

      {/* Initial Geolocation Permission Banner */}
      {geoPromptVisible && !location.isUserGps && (
        <div className={styles.locationPromptBanner}>
          <div className={styles.promptContent}>
            <div className={styles.promptTitle}>📍 Selaraskan Langit dengan Posisi Anda</div>
            <div className={styles.promptSubtitle}>Aktifkan lokasi agar posisi rasi bintang dan waktu terbit planet persis sesuai titik pandang Anda.</div>
          </div>
          <div className={styles.promptActions}>
            <button type="button" className={styles.enableGpsBtn} onClick={() => requestUserLocation(true)} disabled={isDetectingGps}>
              {isDetectingGps ? 'Mendeteksi...' : '🎯 Aktifkan Lokasi'}
            </button>
            <button type="button" className={styles.dismissPromptBtn} onClick={() => setGeoPromptVisible(false)}>✕</button>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {locationModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setLocationModalOpen(false)}>
          <div className={styles.locationModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.locationModalHeader}>
              <h2 className={styles.locationModalTitle}>📍 Pilih Lokasi Observasi</h2>
              <button type="button" className={styles.closeDrawerBtn} onClick={() => setLocationModalOpen(false)}>✕</button>
            </div>
            <button type="button" className={styles.locationGpsTrigger} onClick={() => requestUserLocation(true)} disabled={isDetectingGps}>
              🎯 {isDetectingGps ? 'Mendeteksi Koordinat GPS Anda...' : 'Deteksi Otomatis Posisi Saya (GPS)'}
            </button>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Preset Observatori & Resort:
            </div>
            <div className={styles.locationPresetGrid}>
              {LOCATION_PRESETS.map((preset, idx) => (
                <div
                  key={idx}
                  className={`${styles.locationPresetCard} ${location.name === preset.name ? styles.active : ''}`}
                  onClick={() => {
                    setLocation(preset);
                    setLocationModalOpen(false);
                    setCalibrationToast(`✓ Peta langit dialihkan ke ${preset.name}`);
                    setTimeout(() => setCalibrationToast(''), 3500);
                  }}
                >
                  <div className={styles.locationPresetName}>{preset.name}</div>
                  <div className={styles.locationPresetCoords}>
                    Lat: {preset.latitude.toFixed(2)}°, Lon: {preset.longitude.toFixed(2)}°
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compass HUD Overlay (Top Left) */}
      <div className={styles.hudOverlay}>
        <div className={styles.hudCard}>
          <span className={styles.hudAzimuth}>{String(Math.round(bearing)).padStart(3, '0')}°</span>
          <span className={styles.hudCardinal}>{getCardinalDirection(bearing)}</span>
          <span className={styles.hudPitch}>Alt: {Math.round(pitch)}°</span>
        </div>
        <div className={styles.fovIndicator}>
          FOV: {fov.toFixed(1)}° {fov < 15 ? '🔭 Teleskop' : fov < 35 ? '🔍 Binokular' : '👁️ Mata'}
        </div>
      </div>

      {/* ─── Object Inspector Panel (LEFT SIDE — Stellarium Style) ─── */}
      {selectedObject && (
        <aside className={styles.inspectorDrawer}>
          <div className={styles.inspectorInner}>
            {/* Header */}
            <div className={styles.inspectorHeader}>
              <div>
                <h2 className={styles.inspectorTitle}>{selectedObject.name}</h2>
                <div className={styles.inspectorSubtitle}>
                  {selectedObject.bayer ? `${selectedObject.bayer} · ` : ''}
                  {selectedObject.constellation || selectedObject.category || selectedObject.type || 'Benda Langit'}
                </div>
              </div>
              <button type="button" className={styles.closeDrawerBtn} onClick={() => setSelectedObject(null)} aria-label="Tutup Panel">✕</button>
            </div>

            {/* Quick Action Buttons (Telescope Bidik / Reset) */}
            <div className={styles.inspectorActions}>
              <button type="button" className={styles.telescopeZoomBtn} onClick={telescopeZoomIn}>
                🔭 Bidik Teleskop ({fov < 15 ? 'Zoom Lebih Dekat' : 'Perbesar 3D'})
              </button>
              {fov < 30 && (
                <button type="button" className={styles.wideViewBtn} onClick={resetWideView}>
                  👁️ Pandangan Lebar (1x)
                </button>
              )}
            </div>

            {/* Prominent Cosmological Distance Box */}
            <div className={styles.distanceBadge}>
              <div>
                <div className={styles.distanceBadgeLabel}>📏 Jarak dari Bumi</div>
                <div className={styles.distanceBadgeValue}>{selectedObject.dist || 'Tata Surya'}</div>
              </div>
              {selectedObject.distKm && (
                <div style={{ textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                  {selectedObject.distKm}
                </div>
              )}
            </div>

            {/* Penjelasan & Karakteristik Lengkap */}
            <div className={styles.inspectorSectionTitle}>📖 Penjelasan & Karakteristik</div>
            <div className={styles.inspectorDesc}>
              {selectedObject.desc || 'Benda langit pengamatan malam terpilih.'}
            </div>

            {/* Moon Phase Banner */}
            {selectedObject.moonInfo && (
              <div className={styles.inspectorTip} style={{ marginBottom: 10 }}>
                <b>{selectedObject.moonPhaseName || '🌕'}</b><br />
                {selectedObject.moonInfo}
              </div>
            )}

            {/* Precision Astronomical Data Grid */}
            <div className={styles.inspectorSectionTitle}>📊 Data Observasi Astronomi</div>
            <div className={styles.inspectorGrid}>
              <div className={styles.inspectorItem}>
                <div className={styles.inspectorLabel}>Kecerahan (Mag)</div>
                <div className={styles.inspectorValue}>
                  {selectedObject.mag !== undefined ? selectedObject.mag.toFixed(2) : 'Bervariasi'}
                </div>
              </div>
              <div className={styles.inspectorItem}>
                <div className={styles.inspectorLabel}>Tipe Spektral</div>
                <div className={styles.inspectorValue}>
                  {selectedObject.spectral || selectedObject.type || 'Planet'}
                </div>
              </div>
              <div className={styles.inspectorItem}>
                <div className={styles.inspectorLabel}>Altitude (Tinggi)</div>
                <div className={styles.inspectorValue}>
                  {selectedObject.altitude !== undefined ? `${selectedObject.altitude.toFixed(1)}°` : '-'}
                </div>
              </div>
              <div className={styles.inspectorItem}>
                <div className={styles.inspectorLabel}>Azimuth (Arah)</div>
                <div className={styles.inspectorValue}>
                  {selectedObject.azimuth !== undefined ? `${selectedObject.azimuth.toFixed(1)}°` : '-'}
                </div>
              </div>
              {selectedObject.temp && (
                <div className={styles.inspectorItem}>
                  <div className={styles.inspectorLabel}>Suhu Permukaan</div>
                  <div className={styles.inspectorValue}>{selectedObject.temp}</div>
                </div>
              )}
              {selectedObject.luminosity && (
                <div className={styles.inspectorItem}>
                  <div className={styles.inspectorLabel}>Luminositas</div>
                  <div className={styles.inspectorValue}>{selectedObject.luminosity}</div>
                </div>
              )}
              {selectedObject.diameter && (
                <div className={styles.inspectorItem}>
                  <div className={styles.inspectorLabel}>Diameter</div>
                  <div className={styles.inspectorValue}>{selectedObject.diameter}</div>
                </div>
              )}
              {selectedObject.orbitalPeriod && (
                <div className={styles.inspectorItem}>
                  <div className={styles.inspectorLabel}>Periode Orbit</div>
                  <div className={styles.inspectorValue}>{selectedObject.orbitalPeriod}</div>
                </div>
              )}
            </div>

            {/* Fakta Menarik */}
            {selectedObject.facts && selectedObject.facts.length > 0 && (
              <>
                <div className={styles.inspectorSectionTitle}>💡 Fakta Menarik</div>
                <div className={styles.inspectorFacts}>
                  {selectedObject.facts.map((fact, fIdx) => (
                    <div key={fIdx} style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 5, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#38bdf8' }}>•</span>
                      {fact}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Telescope Observation Guide */}
            {selectedObject.tip && (
              <>
                <div className={styles.inspectorSectionTitle}>🔭 Panduan Pengamatan Teleskop</div>
                <div className={styles.inspectorTip}>
                  {selectedObject.tip}
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      {/* Events Drawer (Slide in from Right) */}
      {eventsDrawerOpen && (
        <aside className={styles.eventsDrawer}>
          <div className={styles.inspectorHeader}>
            <div>
              <h2 className={styles.inspectorTitle}>📅 Kalender Astronomi</h2>
              <div className={styles.inspectorSubtitle}>Data Resmi NASA · IAU · IMO</div>
            </div>
            <button type="button" className={styles.closeDrawerBtn} onClick={() => setEventsDrawerOpen(false)}>✕</button>
          </div>
          {events.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', padding: 20 }}>
              Belum ada event yang dipublikasikan.
            </div>
          ) : (
            events.slice(0, 10).map((evt) => (
              <div key={evt.id} className={styles.eventCard}>
                <div className={styles.eventCardHeader}>
                  <span className={styles.eventCardTitle}>{evt.title}</span>
                  <span className={styles.eventCardDate}>{evt.startsAt ? evt.startsAt.slice(0, 10) : ''}</span>
                </div>
                <div className={styles.eventCardDesc}>{evt.description}</div>
              </div>
            ))
          )}
        </aside>
      )}

      {/* Search Modal */}
      {searchModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setSearchModalOpen(false)}>
          <div className={styles.searchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.searchHeader}>
              <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Cari Bintang (Sirius), Planet (Saturnus, Mars, Bulan), Rasi (Orion)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button type="button" className={styles.closeDrawerBtn} onClick={() => setSearchModalOpen(false)}>✕</button>
            </div>
            <div className={styles.searchResultsList}>
              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  Ketik nama bintang (Sirius, Betelgeuse), planet (Saturnus, Jupiter), atau rasi (Orion)...
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div key={idx} className={styles.searchItem} onClick={() => focusOnObject(item)}>
                    <div>
                      <div className={styles.searchItemTitle}>{item.name}</div>
                      <div className={styles.searchItemCategory}>{item.category} {item.constellation ? `· ${item.constellation}` : ''}</div>
                    </div>
                    <div className={styles.searchItemMeta}>
                      {item.dist || 'Bidik ↗'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Dock: Toolbars & Time Machine Controller */}
      <div className={styles.bottomDock}>
        {/* Stellarium View Toggles Bar */}
        <div className={styles.toggleBar}>
          <button type="button" className={`${styles.toggleBtn} ${showLabels ? styles.active : ''}`} onClick={() => setShowLabels((p) => !p)} title="Tampilkan Nama-Nama Benda Langit">
            🏷️ Nama Objek
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showConstellationLines ? styles.active : ''}`} onClick={() => setShowConstellationLines((p) => !p)}>
            🌌 Rasi Bintang
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showMilkyWay ? styles.active : ''}`} onClick={() => setShowMilkyWay((p) => !p)}>
            💫 Bimasakti
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showDeepSky ? styles.active : ''}`} onClick={() => setShowDeepSky((p) => !p)}>
            ✨ Nebula & Messier
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showPlanets ? styles.active : ''}`} onClick={() => setShowPlanets((p) => !p)}>
            🪐 Planet & Bulan
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showGrid ? styles.active : ''}`} onClick={() => setShowGrid((p) => !p)}>
            🧭 Grid Langit
          </button>
          <button type="button" className={`${styles.toggleBtn} ${showGround ? styles.active : ''}`} onClick={() => setShowGround((p) => !p)}>
            🏝️ Horizon Pantai
          </button>
        </div>

        {/* Time Machine Controller Bar */}
        <div className={styles.timeMachineBar}>
          <div className={styles.timeDisplay} suppressHydrationWarning>
            ⏱️ {formatDateDisplay(currentTime, location.timezone)}
          </div>
          <div className={styles.timeControls}>
            <button type="button" className={styles.timeControlBtn} onClick={() => setCurrentTime((prev) => new Date(prev.getTime() - 3600 * 1000))} title="Mundur 1 Jam">
              -1h
            </button>
            <button type="button" className={`${styles.timeControlBtn} ${isPlaying ? styles.active : ''}`} onClick={() => setIsPlaying((p) => !p)} title={isPlaying ? 'Jeda' : 'Jalankan'}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" className={styles.timeControlBtn} onClick={() => setCurrentTime((prev) => new Date(prev.getTime() + 3600 * 1000))} title="Maju 1 Jam">
              +1h
            </button>
            <button type="button" className={styles.nowBtn} onClick={() => { setCurrentTime(new Date()); setIsPlaying(false); }} title="Waktu Sekarang">
              NOW
            </button>
          </div>
          <div className={styles.timeSliderGroup}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Scrub:</span>
            <input
              type="range" min="-12" max="12" step="0.25" defaultValue="0"
              className={styles.timeSlider}
              onChange={(e) => {
                const hoursOffset = parseFloat(e.target.value);
                setCurrentTime(new Date(Date.now() + hoursOffset * 3600 * 1000));
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
