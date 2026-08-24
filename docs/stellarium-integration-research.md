# Riset Integrasi Stellarium Web ke Ephemeris

Tanggal verifikasi: 22 Agustus 2026. Sumber dibatasi pada dua repository yang ditanyakan dan source code resmi di dalamnya. Catatan lisensi di bawah bukan nasihat hukum.

## Kesimpulan

Kedua repository **tidak perlu digabung dengan Git merge**.

- [`Stellarium/stellarium-web-engine`](https://github.com/Stellarium/stellarium-web-engine) adalah renderer planetarium C/JavaScript berbasis WebGL yang dikompilasi menjadi JavaScript + WebAssembly (`.wasm`); README menyebut engine ini memang dapat ditanam di website dan dibangun dengan Emscripten serta SCons ([README](https://github.com/Stellarium/stellarium-web-engine/blob/master/README.md)).
- [`astronomersiva/stellarium-web`](https://github.com/astronomersiva/stellarium-web) adalah GUI Vue lama yang memakai Stellarium Web Engine, bukan engine kedua. README-nya menyebut proyek ini “mostly Graphical User Interface” untuk engine C yang dikompilasi ke WebAssembly ([README](https://github.com/astronomersiva/stellarium-web/blob/master/README.md)).
- Fork GUI tersebut hanya memiliki tujuh commit dan commit terakhirnya bertanggal 21 Juni 2018 ([riwayat commit](https://github.com/astronomersiva/stellarium-web/commits/master/)). Toolchain-nya juga lama: Vue 2, webpack 3, axios 0.18, dan Docker image Node 9.3 ([package.json](https://github.com/astronomersiva/stellarium-web/blob/master/package.json), [Dockerfile](https://github.com/astronomersiva/stellarium-web/blob/master/Dockerfile)).
- Repository engine resmi sekarang sudah memiliki GUI Vue yang lebih baru di [`apps/web-frontend`](https://github.com/Stellarium/stellarium-web-engine/tree/master/apps/web-frontend). README upstream menyebut direktori itu sebagai GUI untuk engine dan static site, serta build-nya sekaligus membangun artefak WASM/JS ([README frontend](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/README.md)). Karena itu, jangan jadikan fork `astronomersiva` sebagai basis produksi baru.

Rekomendasi paling sederhana: bangun `apps/web-frontend` dari repository engine resmi sebagai aplikasi statis terpisah, deploy ke misalnya `sky.ephemeris.id`, lalu arahkan tombol **Sky Guide 3D** dari landing page ke URL tersebut. Ini menghindari port Vue-ke-React/Next yang besar, konflik bundler, dan pencampuran lisensi dalam bundle Next.js.

## Arsitektur upstream

Alurnya adalah:

```text
GUI Vue (apps/web-frontend)
        |
        v
stellarium-web-engine.js + stellarium-web-engine.wasm
        |
        +-- WebGL2 canvas
        +-- skydata/stars, DSO, sky cultures, landscapes
        +-- planet, comet, asteroid, satellite data
```

Build engine mengekspor factory bernama `StelWebEngine`, mengaktifkan WebGL2 dan pertumbuhan memory, serta menghasilkan `build/stellarium-web-engine.js` dan `.wasm` ([SConstruct](https://github.com/Stellarium/stellarium-web-engine/blob/master/SConstruct#L151-L177)). Frontend mengimpor kedua artefak itu, memasang engine ke `<canvas>`, lalu mendaftarkan sumber data astronomi ([App.vue](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/App.vue#L280-L340)). Makefile frontend menyalin hasil engine ke `src/assets/js/` sebelum frontend dibangun ([Makefile frontend](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/Makefile#L15-L31)).

## Build dan menjalankan

### Jalur yang direkomendasikan: frontend resmi yang sudah menyatu dengan engine

Gunakan Docker Desktop melalui WSL2/Linux karena Makefile upstream memakai shell GNU, `make`, volume mount, dan Emscripten.

```bash
git clone https://github.com/Stellarium/stellarium-web-engine.git
cd stellarium-web-engine/apps/web-frontend

make setup   # image build + compile engine JS/WASM + yarn install
make dev     # http://localhost:8080
make build   # hasil static production di dist/
make start   # uji dist di http://localhost:8080
```

Perintah dan urutan tersebut berasal dari [README frontend](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/README.md) dan [Makefile frontend](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/Makefile). Image build engine mengunci Emscripten 1.39.17 ([Dockerfile.jsbuild](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/Dockerfile.jsbuild)); jangan menggantinya dengan Emscripten terbaru sebelum ada build reproducible yang lolos tes.

### Engine saja

Jika ingin membuat GUI React sendiri, engine dapat dibangun dari root dengan `make js`, setelah environment Emscripten dan SCons aktif ([README engine](https://github.com/Stellarium/stellarium-web-engine/blob/master/README.md#build-the-javascript-version)). Contoh minimal tersedia di [`apps/simple-html`](https://github.com/Stellarium/stellarium-web-engine/tree/master/apps/simple-html), termasuk inisialisasi canvas, WASM, dan data source ([contoh HTML](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/simple-html/stellarium-web-engine.html)). Jalur ini jauh lebih mahal karena seluruh GUI, state, pencarian objek, lokasi, waktu, mobile UI, aksesibilitas, dan error handling harus dibuat ulang.

### Fork `astronomersiva` (hanya untuk reproduksi historis)

Repo lama mendokumentasikan `yarn`, `yarn run dev`, dan `yarn run build`, atau `make setup/dev/build/start` melalui Docker ([README](https://github.com/astronomersiva/stellarium-web/blob/master/README.md), [Makefile](https://github.com/astronomersiva/stellarium-web/blob/master/Makefile)). Jangan memasukkannya ke workspace pnpm Next.js: ia adalah aplikasi webpack/Vue independen dengan dependency lama.

## Integrasi ke landing Next.js

Landing saat ini sudah mempunyai link `Sky Guide 3D` ke `/sky` di `apps/landing/src/app/page.js`, dan route tersebut saat ini menampilkan implementasi `SkyExperience` lokal. Agar tidak merusak fitur yang sudah ada, lakukan integrasi bertahap:

1. Build dan uji frontend resmi di port 8080 dengan langkah di atas.
2. Deploy isi `dist/` sebagai static site terpisah, misalnya `https://sky.ephemeris.id`.
3. Tambahkan URL konfigurasi landing, misalnya `NEXT_PUBLIC_STELLARIUM_URL=https://sky.ephemeris.id` di `apps/landing/.env.local`.
4. Ganti target link desktop, mobile, dan CTA dari `/sky` ke nilai konfigurasi itu. Untuk development gunakan `http://localhost:8080`.
5. Buka di tab yang sama untuk pengalaman seperti satu produk. Jika memilih tab baru, gunakan `target="_blank" rel="noopener noreferrer"`.
6. Setelah stabil, putuskan apakah route lokal `/sky` dipertahankan sebagai fallback atau diubah menjadi redirect ke URL Stellarium.

Tidak perlu iframe karena kebutuhan pengguna hanya “klik lalu mengarah ke Sky Guide”. Redirect/link lebih sederhana, lebih mudah untuk layar penuh, geolocation, WebGL, dan isolasi kebijakan keamanan.

Alternatif same-origin adalah membangun frontend dengan base path `/stellarium/`, menaruh seluruh output `dist` (termasuk WASM dan skydata) di hosting statis yang dilayani pada path tersebut, serta menyediakan SPA fallback. Ini lebih rapuh: semua URL asset harus memakai base path yang benar, refresh deep link harus kembali ke `index.html`, dan server harus mengirim `.wasm` sebagai `application/wasm`. Jangan menyalin source Vue mentah ke `apps/landing`; yang dapat dilayani Next adalah hasil build statisnya.

## Data dan layanan eksternal

Frontend tidak cukup hanya dengan file `.wasm`.

- App mendaftarkan `skydata/stars`, sky cultures, DSO, landscape, Milky Way survey, asteroid, planet, comet, dan satellite data ([App.vue](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/App.vue#L333-L374)). Contoh datanya berada di [`apps/test-skydata`](https://github.com/Stellarium/stellarium-web-engine/tree/master/apps/test-skydata). Pastikan setiap URL tersebut menghasilkan data, bukan HTML 404.
- Search/detail memakai API `api.noctuasky.com` pada production ([`.env.production`](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/.env.production), [`sw_helpers.js`](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/assets/sw_helpers.js)).
- Deteksi lokasi memanggil browser geolocation, fallback `freegeoip.stellarium.org`, lalu reverse geocoding OpenStreetMap Nominatim; ringkasan objek juga dapat meminta Wikipedia ([`sw_helpers.js`](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/assets/sw_helpers.js)). Ini harus dicantumkan dalam privacy notice dan CSP/connect policy.
- Frontend menyediakan menu “Data Credits”; jangan menghapus atribusi itu saat melakukan branding ([App.vue](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/App.vue#L37-L48), [`data-credits-dialog.vue`](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/components/data-credits-dialog.vue)).
- Fork lama berisi Google Maps API key langsung di client ([`src/main.js`](https://github.com/astronomersiva/stellarium-web/blob/master/src/main.js)); ini alasan tambahan untuk tidak memakai fork tersebut tanpa audit dan penggantian key.

## Lisensi

Kedua repo memuat `LICENSE-AGPL-3.0.txt` dan source header menyatakan AGPLv3 atau lisensi komersial alternatif ([lisensi engine](https://github.com/Stellarium/stellarium-web-engine/blob/master/LICENSE-AGPL-3.0.txt), [lisensi GUI lama](https://github.com/astronomersiva/stellarium-web/blob/master/LICENSE-AGPL-3.0.txt), [header frontend resmi](https://github.com/Stellarium/stellarium-web-engine/blob/master/apps/web-frontend/src/App.vue#L1-L9)).

Implikasi praktis yang harus dikonfirmasi dengan penasihat hukum:

- AGPL mewajibkan modified version yang diakses melalui jaringan menawarkan Corresponding Source kepada pengguna ([AGPL §13](https://github.com/Stellarium/stellarium-web-engine/blob/master/LICENSE-AGPL-3.0.txt#L479-L488)).
- Modified source harus mempertahankan notices, menyatakan perubahan, dan dilisensikan sesuai AGPL; UI interaktif juga memiliki kewajiban appropriate legal notices ([AGPL §5](https://github.com/Stellarium/stellarium-web-engine/blob/master/LICENSE-AGPL-3.0.txt#L173-L204)).
- Menjalankan build Stellarium sebagai aplikasi statis terpisah dan menautkannya dari Next.js memberi batas teknis yang lebih jelas daripada menggabungkan engine ke bundle React, tetapi tidak menghapus kewajiban AGPL atas aplikasi Stellarium itu sendiri.
- Jika source Ephemeris harus tetap tertutup atau kewajiban AGPL tidak dapat diterima, minta lisensi komersial dari pemegang hak sebelum integrasi produksi.

## Risiko dan checklist rilis

| Risiko | Mitigasi minimum |
| --- | --- |
| Fork GUI 2018 dan dependency usang | Jangan gunakan fork `astronomersiva`; gunakan frontend dalam repo engine resmi dan jalankan audit dependency. |
| Toolchain engine lama/khusus | Gunakan image Emscripten yang dikunci upstream; pin commit yang sudah diuji. |
| WebGL2/WASM tidak tersedia atau perangkat lemah | Tampilkan error/fallback yang jelas; uji Android/iOS dan laptop resort. |
| Asset path, WASM MIME, atau SPA refresh salah | Smoke-test direct URL, reload deep link, `.wasm`, dan seluruh `skydata/*`. |
| Data astronomi besar dan memory bertumbuh | Ukur waktu muat, konsumsi RAM, cache headers, dan performa jaringan resort. |
| Geolocation dan request pihak ketiga | Consent/privacy notice, HTTPS, CSP yang eksplisit, serta uji allow/deny location. |
| Query `sc` menerima URL sky-culture kustom | Hapus fitur bila tidak dibutuhkan atau allowlist origin; jangan menerima sumber tak tepercaya. |
| API/CDN pihak ketiga gagal atau CORS berubah | Dokumentasikan domain, monitor error, dan self-host data yang lisensinya mengizinkan. |
| AGPL/atribusi | Sediakan halaman license/source, pertahankan Data Credits dan notices, lalu review legal sebelum rilis. |

Tes penerimaan minimum: tombol landing membuka Sky Guide; canvas tampil; objek dapat dicari; data bintang/planet termuat; geolocation bekerja saat diizinkan dan gagal dengan baik saat ditolak; refresh/deep link bekerja; mobile fullscreen dapat digunakan; serta link license, source, dan Data Credits terlihat.
