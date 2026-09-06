# Searah

Platform carpooling berbasis koridor tertutup untuk komunitas kampus dan institusi. Sistem menghubungkan pengemudi dan penumpang yang menempuh rute searah, membagi beban bahan bakar, serta mencatat dampak penurunan emisi secara permanen.

## 1. Latar Belakang dan Masalah

Kemacetan di koridor komuter kampus menghasilkan pemborosan bahan bakar dan emisi kendaraan pribadi. Sebagian besar kendaraan roda empat hanya membawa satu orang pengemudi.

Layanan ride-hailing komersial membebankan tarif tinggi dan potongan komisi platform yang besar. Di sisi lain, carpooling terbuka tanpa batas koridor rentan terhadap masalah keselamatan dan sering beralih fungsi menjadi taksi gelap ilegal.

Searah membatasi interaksi perjalanan di dalam koridor tetap milik institusi. Komuter terverifikasi berbagi kursi kosong dengan tarif berplafon rendah yang menutupi biaya operasional tanpa mencari keuntungan komersial.

## 2. Prinsip Desain dan Batasan

Searah dibangun berdasarkan empat prinsip teknis:

1. Koridor tertutup. Setiap perjalanan wajib terikat pada koridor yang terdaftar. Pengguna saling mengenal lingkungan institusi asal mereka.
2. Penegakan aturan di tingkat basis data. Batas tarif per kilometer, kuota perjalanan per hari, dan kapasitas kursi ditegakkan langsung oleh mesin PostgreSQL menggunakan trigger. Aturan tidak dapat diterobos melalui manipulasi klien.
3. Integritas temporal data dampak. Penghematan bahan bakar dan reduksi emisi dihitung sekali saat perjalanan selesai. Angka disimpan permanen di tabel ledger bersama versi rumus.
4. Privasi bertahap. Nomor telepon dan alamat email pengemudi disembunyikan dari daftar publik. Kontak pribadi baru dibuka setelah kedua pihak menyepakati pemesanan.

## 3. Tumpukan Teknologi

Sistem menggunakan tumpukan teknologi modern:

- Antarmuka: React 18, Vite 7, TypeScript, Tailwind CSS, Radix UI, Wouter, TanStack Query, Recharts.
- Backend: Express 5, Node.js 20, TypeScript lewat tsx, express-session, connect-pg-simple, bcryptjs, helmet.
- Basis data: PostgreSQL pada penyedia Neon, diakses melalui driver HTTP `@neondatabase/serverless` dan Drizzle ORM.
- Pengujian: Vitest dengan cakupan v8.
- Hosting: Vercel Serverless Function melalui berkas api/index.ts.

## 4. Arsitektur Sistem

Aplikasi menggunakan pola monorepo dengan pemisahan direktori:

- `client/`: Kode sumber antarmuka pengguna berbasis komponen React.
- `server/`: Server Express, handler rute API, middleware sesi, dan lapisan akses penyimpanan.
- `shared/`: Berkas TypeScript yang dipakai bersama oleh klien dan server, mencakup skema Drizzle, skema validasi Zod, algoritma pencocokan, dan rumus dampak lingkungan.
- `migrations/`: Skrip SQL mentah untuk mendefinisikan fungsi PL/pgSQL dan trigger mesin basis data.
- `docs/`: Dokumentasi teknis arsitektur, rencana pengujian, dan relasi entitas.

## 5. Skema Basis Data dan Trigger Mesin

Basis data terdiri dari sebelas tabel utama:

1. `institusi`: Data organisasi penjamin identitas pengguna.
2. `koridor`: Rute komuter tetap dengan batas geografis dan plafon tarif.
3. `users`: Akun pengguna, peran, skor kepercayaan, dan data verifikasi identitas.
4. `kendaraan`: Kendaraan terdaftar beserta konsumsi bahan bakar dalam km per liter.
5. `trips`: Penawaran perjalanan oleh pengemudi dengan koordinat asal dan tujuan.
6. `bookings`: Pemesanan kursi perjalanan oleh penumpang.
7. `ratings`: Penilaian reputasi antar pengguna setelah perjalanan selesai.
8. `incidents`: Laporan insiden keselamatan dan tombol darurat.
9. `parameter_dampak`: Parameter acuan emisi dan harga bahan bakar.
10. `ledger_dampak`: Catatan permanen penghematan liter bahan bakar, emisi karbon, dan rupiah per pemesanan.
11. `session`: Tabel penyimpanan sesi aktif yang dikelola oleh connect-pg-simple.

Tiga trigger kepatuhan berjalan di tingkat PostgreSQL:

1. `trg_cek_plafon_tarif`: Menolak perjalanan bila tarif per kursi melebihi plafon tarif koridor dikalikan jarak kilometer perjalanan. Mode sosial wajib bernilai nol rupiah.
2. `trg_cek_maks_trip_aktif`: Membatasi setiap pengemudi hanya dapat memiliki maksimal dua perjalanan aktif pada hari kalender yang sama.
3. `trg_cek_kursi_penuh`: Mencegah penambahan pemesanan jika akumulasi kursi aktif melampaui kapasitas kursi yang tersedia pada perjalanan.

## 6. Algoritma Pencocokan Perjalanan

Modul `shared/matching.ts` menyaring dan memberi skor kecocokan antara perjalanan yang ditawarkan dan rute pemesan.

Jarak geografis dihitung memakai rumus Haversine. Bobot penilaian tersusun dari empat komponen:

- Kecocokan asal: bobot 0,35.
- Kecocokan tujuan: bobot 0,35.
- Kedekatan waktu keberangkatan: bobot 0,20.
- Penalti deviasi rute: pengurangan hingga 0,10.

Skor kecocokan maksimum yang dapat dicapai bernilai 0,90. Nilai ini bukan kegagalan hitung, melainkan kompensasi atas penalti deviasi penjemputan.

## 7. Ledger Dampak Lingkungan

Modul `shared/dampak.ts` mengelola metodologi penghitungan dampak lingkungan:

1. Liter BBM dihemat dihitung dari jarak kilometer dibagi angka konsumsi kendaraan, lalu dikalikan faktor pengalihan moda 0,6.
2. Reduksi emisi karbon dihitung dari liter bahan bakar dihemat dikalikan koefisien emisi bensin 2,32 kg CO2e per liter.
3. Penghematan rupiah dihitung dari liter bahan bakar dihemat dikalikan harga bahan bakar acuan Rp10.000 per liter.

Nilai parameter dibaca dari tabel `parameter_dampak`. Setiap baris ledger memuat versi rumus `dampak-1.0.0` agar penghitungan di masa lalu tetap dapat diaudit.

## 8. Keamanan dan Privasi

Keamanan dibangun dengan pendekatan berlapis:

- Kata sandi diacak menggunakan bcrypt dengan sepuluh putaran garam.
- Sesi disimpan pada basis data PostgreSQL menggunakan cookie beratribut httpOnly dan sameSite.
- Helm memasang header keamanan Content Security Policy, X-Frame-Options DENY, dan Referrer-Policy no-referrer.
- Pembatas laju membatasi sepuluh permintaan per lima belas menit untuk endpoint otentikasi.
- Endpoint kontak `/api/bookings/:id/kontak` menolak menampilkan nomor telepon sebelum pemesanan berstatus terkonfirmasi.

## 9. Akun Demo untuk Pengujian

Skrip pengisian data awal menyediakan tiga akun demo siap pakai:

| Peran | Alamat Email | Kata Sandi | Tujuan Uji Coba |
|---|---|---|---|
| Pengemudi | driver@searah.id | searah123 | Membuat perjalanan, menetapkan rute, menguji tarif |
| Penumpang | passenger@searah.id | searah123 | Mencari tumpangan, memesan kursi, melihat rincian dampak |
| Administrator | admin@searah.id | searah123 | Memantau statistik sistem, mengelola insiden keselamatan |

Seluruh akun telah terisi dengan data riwayat perjalanan selesai dan keterikatan koridor kampus.

## 10. Struktur Berkas Repositori

Struktur berkas utama proyek tersusun sebagai berikut:

```text
searah/
├── client/
│   ├── src/
│   │   ├── components/       # Komponen tata letak, navigasi, dan tema
│   │   ├── pages/            # Halaman rute aplikasi
│   │   │   ├── Landing.tsx   # Halaman muka
│   │   │   ├── Dashboard.tsx # Dasbor aktivitas
│   │   │   ├── Trips.tsx     # Pencarian perjalanan
│   │   │   ├── Dampak.tsx    # Halaman analitik dampak Recharts
│   │   │   └── Kepatuhan.tsx # Dokumentasi dan simulator trigger
│   │   └── lib/              # Konfigurasi query client dan utilitas
├── server/
│   ├── auth.ts               # Autentikasi sesi dan pengacakan sandi
│   ├── routes.ts             # Definisi rute Express dan trigger handler
│   ├── seed.ts               # Skrip inisialisasi data demo
│   └── storage.ts            # Antarmuka dan implementasi Drizzle Neon
├── shared/
│   ├── schema.ts             # Definisi tabel PostgreSQL dan skema Zod
│   ├── matching.ts           # Logika Haversine dan pembobotan skor
│   ├── matching.test.ts      # 31 unit test modul pencocokan
│   ├── dampak.ts             # Rumus penghematan BBM dan emisi
│   └── dampak.test.ts        # 17 unit test modul dampak lingkungan
├── migrations/
│   └── 001_trigger_kepatuhan.sql # Definisi trigger PostgreSQL
├── script/
│   ├── build.ts              # Skrip kompilasi Vite dan esbuild
│   └── jalankan-sql.ts       # Runner SQL mentah ke Neon
└── docs/
    ├── DESIGN.md             # Dokumen desain sistem (IEEE 1016)
    ├── TEST.md               # Dokumen rencana pengujian (IEEE 829)
    └── ERD.md                # Diagram relasi entitas basis data
```

## 11. Prasyarat Lingkungan

Sebelum menjalankan aplikasi, pastikan perangkat lokal memiliki:

- Node.js versi 20 atau yang lebih baru.
- Manajer paket npm versi 10 ke atas.
- Basis data PostgreSQL Neon dengan URL koneksi aktif.

## 12. Instalasi dan Konfigurasi

Jalankan langkah berikut untuk memasang aplikasi:

1. Kloning repositori ke mesin lokal:
   ```bash
   git clone https://github.com/ghazyurbayani/searah-itechno.git
   cd searah-itechno
   ```
2. Pasang dependensi proyek:
   ```bash
   npm install
   ```
3. Salin berkas lingkungan dan isi variabel:
   ```bash
   cp .env.example .env
   ```
   Pastikan variabel `DATABASE_URL` dan `SESSION_SECRET` telah terisi.

## 13. Skrip Perintah Kerja

Tersedia perintah otomasi berikut:

- `npm run check`: Menjalankan pemeriksaan tipe TypeScript statis.
- `npm run test`: Menjalankan 48 unit test Vitest pada modul shared.
- `npm run test:coverage`: Menghasilkan laporan cakupan kode pengujian.
- `npm run build`: Membangun aset statis klien dan bundel server CJS.
- `npm run dev`: Menjalankan server pengembangan lokal.
- `npm run demo:reset`: Mengosongkan basis data dan mengisi data demo realistis.

## 14. Penerapan ke Vercel

Aplikasi dikonfigurasi untuk berjalan di Vercel menggunakan konfigurasi `vercel.json`. Fungsi serverless menangani permintaan API melalui titik masuk `api/index.ts`, sedangkan bundel web dilayani dari direktori hasil kompilasi `dist/public`.

Variabel lingkungan `DATABASE_URL` dan `SESSION_SECRET` wajib didaftarkan pada panel pengaturan Vercel Project Settings.

## 15. Keterbatasan dan Rencana Pengembangan

Sistem saat ini memiliki beberapa keterbatasan:

1. Perhitungan jarak menggunakan garis lurus lingkaran besar Haversine, bukan jarak rute jalan raya riil. Rencana berikutnya mengintegrasikan OpenStreetMap dan OSRM routing engine.
2. Faktor pengalihan moda 0,6 masih merupakan asumsi awal proyek. Validasi lapangan melalui survei komuter diperlukan untuk menentukan rasio pengalihan yang lebih presisi.
3. Content Security Policy masih memerlukan arahan unsafe-inline karena Vite menyuntikkan skrip runtime saat kompilasi.

## 16. Lisensi

Hak Cipta 2026 Tim Searah. Didistribusikan di bawah lisensi MIT.
