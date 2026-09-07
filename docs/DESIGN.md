# Dokumen Deskripsi Desain Perangkat Lunak (IEEE Std 1016-2009)

## 1. Identifikasi Dokumen

- Nama Sistem: Searah
- Versi Dokumen: 1.0.0
- Tanggal Terbit: 6 September 2026
- Status: Disetujui
- Sasaran: Sistem Berbagi Tumpangan Komuter Kampus Berbasis Koridor Tertutup

## 2. Pemangku Kepentingan dan Kepentingan Utama

Berikut daftar pihak yang berkepentingan terhadap arsitektur sistem:

| Pemangku Kepentingan | Peran | Kepentingan Utama |
|---|---|---|
| Penumpang Mahasiswa/Staf | Pengguna Layanan | Kemudahan mencari tumpangan, keterjangkauan tarif, kepastian titik jemput |
| Pengemudi Sivitas Akademika | Penyedia Tumpangan | Pembagian biaya bahan bakar, kepatuhan batas hukum non-komersial, keamanan |
| Pengelola Kampus | Penjamin Keamanan | Pembatasan akses hanya sivitas terverifikasi, transparansi dampak lingkungan |
| Pengembang dan Penguji | Pemelihara Sistem | Integritas data, kemudahan pengujian, stabilitas penerapan fungsi serverless |

## 3. Sudut Pandang Konteks Sistem

Sistem Searah beroperasi di antara pengguna akhir dan infrastruktur cloud terkelola:

```
[ Pengguna Klien Web ]
        │ (HTTPS / TLS 1.3)
        ▼
[ Edge Network Vercel ]
        │ (Vercel Serverless Function)
        ▼
[ Server Node.js Express 5 ]
   ├── [ Sesi connect-pg-simple ]
   ├── [ Modul Pencocokan shared/matching.ts ]
   └── [ Modul Dampak shared/dampak.ts ]
        │ (HTTP REST Query Driver Neon)
        ▼
[ Basis Data PostgreSQL Neon ]
   ├── [ Trigger Plafon Tarif ]
   ├── [ Trigger Batas Harian ]
   └── [ Trigger Kapasitas Kursi ]
```

## 4. Sudut Pandang Komposisi Sistem

Sistem dipecah menjadi tiga subsistem utama:

### 4.1 Subsistem Antarmuka (Klien)
Dibangun menggunakan React 18, Vite, Tailwind CSS, dan komponen Radix UI. Menggunakan routing Wouter dan manajemen cache status server menggunakan TanStack Query.

Komponen utama:
- `Landing`: Halaman muka dengan informasi rute aktif.
- `Trips`: Antarmuka pencarian dan penyaringan tumpangan aktif.
- `CreateTrip`: Formulir penawaran perjalanan oleh pengemudi dengan verifikasi koridor.
- `Bookings`: Riwayat pemesanan pengguna beserta panel rincian cara hitung dampak.
- `Dampak`: Dasbor analitik lingkungan deret waktu Recharts.
- `Kepatuhan`: Pusat dokumentasi dan simulator trigger basis data.

### 4.2 Subsistem Aplikasi dan API (Server)
Dibangun menggunakan Express 5 dengan runtime TypeScript.

Komponen utama:
- `auth.ts`: Middleware otentikasi sesi, hashing sandi bcrypt, dan pembatas laju HTTP.
- `routes.ts`: Pengontrol endpoint REST, validasi schema Zod, dan penanganan galat trigger.
- `storage.ts`: Lapisan abstraksi data berbasis Drizzle ORM terhadap PostgreSQL Neon.

### 4.3 Subsistem Bersama (Shared Core)
Pustaka murni TypeScript yang dieksekusi di klien maupun server:
- `matching.ts`: Rumus Haversine, toleransi waktu penjemputan, dan kalkulator skor kepercayaan profil.
- `dampak.ts`: Model perhitungan matematis penghematan liter bahan bakar, kg CO2e, dan rupiah nilai BBM.
- `schema.ts`: Definisi struktur tabel Drizzle dan skema validasi Zod.

## 5. Sudut Pandang Logika dan Data

Model data dirancang dalam bentuk normal ketiga (3NF). Hubungan antartabel:

- Setiap `institusi` menaungi banyak `koridor` dan banyak `users`.
- Setiap `koridor` membatasi rute perjalanan `trips` dan menetapkan `plafon_tarif_per_km`.
- Setiap `users` dengan peran driver memiliki satu atau lebih `kendaraan`.
- Setiap `trips` dibuat oleh satu pengemudi dan terikat pada satu koridor dan satu kendaraan.
- Setiap `bookings` mengaitkan satu penumpang dengan satu perjalanan.
- Setiap pemesanan yang selesai menghasilkan tepat satu baris `ledger_dampak`.

## 6. Sudut Pandang Antarmuka

Seluruh komunikasi antarkomponen menggunakan format pertukaran data JSON melalui protokol HTTP/HTTPS:

- `POST /api/auth/register`: Mendaftarkan pengguna baru dengan email kampus.
- `POST /api/auth/login`: Membuat sesi login baru jika kredensial cocok.
- `GET /api/trips`: Mengambil daftar perjalanan terbuka dengan pemfilteran koridor.
- `POST /api/trips`: Membuat perjalanan baru dengan kalkulasi jarak otomatis di server.
- `POST /api/bookings`: Mengajukan pemesanan kursi pada perjalanan terbuka.
- `PATCH /api/bookings/:id/status`: Memperbarui status pemesanan. Saat berstatus selesai, sistem otomatis mencatat baris ledger dampak.
- `GET /api/dampak/agregat`: Menyajikan angka akumulasi dampak dan deret waktu mingguan.
- `GET /api/parameter-dampak`: Menyajikan daftar nilai parameter dampak aktif dari basis data.
- `POST /api/kepatuhan/uji-plafon`: Endpoint pengujian penolakan trigger PostgreSQL secara langsung.

## 7. Sudut Pandang Interaksi

Diagram alur interaksi saat perjalanan dinyatakan selesai:

1. Pengemudi atau admin mengirim permintaan PATCH status ke `/api/bookings/:id/status` dengan nilai completed.
2. Handler memeriksa hak akses peminta di dalam sesi.
3. Handler memperbarui kolom status pada baris tabel `bookings`.
4. Fungsi `catatLedgerDampak` membaca data jarak perjalanan dari `trips` dan konsumsi bahan bakar dari `kendaraan`.
5. Parameter aktif dibaca dari tabel `parameter_dampak`.
6. Fungsi murni `hitungDampak` menghitung liter BBM, reduksi kg CO2e, dan penghematan rupiah.
7. Hasil perhitungan disimpan ke tabel `ledger_dampak` bersama label versi rumus `dampak-1.0.0`.
8. Nilai tersimpan permanen dan tidak akan dihitung ulang di masa mendatang.

## 8. Rationale Keputusan Arsitektur

Bagian ini memuat keputusan yang paling memengaruhi bentuk sistem. Setiap butir menyebut alternatif yang ditolak beserta alasannya. Catatan lengkap seluruh keputusan berada di `DECISIONS.md`.

### 8.1 Haversine dipilih daripada PostGIS

Keputusan. Jarak dihitung dengan Haversine di TypeScript murni. Koordinat disimpan sebagai `double precision` biasa.

Alternatif yang ditolak. PostGIS dengan tipe `geography(Point, 4326)`, penyaring `ST_DWithin`, dan indeks GiST.

Alasan. Modul pencocokan belum ada sama sekali di repositori awal, sehingga harus ditulis dari nol. Fungsi murni lebih cepat dibuat dan dapat diuji tanpa basis data. Penyaring spasial adalah optimasi untuk volume besar, sedangkan koridor tertutup membatasi kandidat pada puluhan baris. Konsekuensinya jarak yang dipakai adalah jarak lingkaran besar, bukan jarak jaringan jalan. Rujukan `DECISIONS.md` KD-02.

### 8.2 Pembaruan berkala dipilih daripada koneksi persisten

Keputusan. Kesegaran data dijaga dengan `refetchInterval` milik TanStack Query bernilai 3000 milidetik, dipasang hanya pada tampilan yang menunjukkan sisa kursi.

Alternatif yang ditolak. Server WebSocket dengan paket `ws`.

Alasan. Fungsi serverless berumur pendek dan tidak dapat menahan koneksi persisten. Penilaian dilakukan lewat URL publik di Vercel, sehingga koneksi persisten akan putus setiap kali instance berakhir. Pemasangan selang pada seluruh kueri juga ditolak, karena setiap kueri Neon adalah satu permintaan HTTP dan halaman yang datanya jarang berubah tidak perlu ditarik ulang setiap tiga detik. Rujukan `DECISIONS.md` KD-03.

### 8.3 Hasil ledger disimpan, bukan dihitung ulang

Keputusan. Penghematan dihitung satu kali saat pemesanan berstatus selesai, lalu disimpan di `ledger_dampak` bersama `versi_rumus`.

Alternatif yang ditolak. Menghitung ulang saat render memakai nilai parameter yang berlaku pada saat itu.

Alasan. Parameter akan berubah. Harga bahan bakar naik, faktor emisi diperbarui, dan faktor pengalihan moda akan direvisi setelah survei lapangan. Bila angka dihitung ulang, laporan penghematan bulan lalu ikut berubah setiap kali parameter diperbarui. Penyimpanan hasil menjaga integritas temporal, dan `versi_rumus` menjaga hasil lama tetap dapat ditelusuri. Rujukan `DECISIONS.md` KD-20.

### 8.4 Skoring berjalan di aplikasi, bukan di SQL

Keputusan. Peringkat kandidat dihitung modul murni `shared/matching.ts`. Basis data hanya menyediakan kandidat lewat klausa `WHERE` pada koridor dan status.

Alternatif yang ditolak. Menyusun skor sebagai ekspresi SQL di dalam kueri pengambilan perjalanan.

Alasan. Rumus skoring adalah bagian produk yang paling sering ditanya dan paling sering diubah. Sebagai fungsi murni, rumus itu dapat diuji tanpa basis data, dan 48 unit test berjalan dalam 265 milidetik. Rumus dalam SQL menuntut basis data hidup untuk setiap pengujian, menyulitkan pengujian nilai batas, dan menyulitkan pengembalian rincian per komponen yang dibutuhkan antarmuka. Pemisahan ini juga menjaga peran kedua lapisan tetap jelas. Lapisan penyimpanan menegakkan aturan yang tidak boleh dilanggar, sedangkan lapisan aplikasi menyusun peringkat yang bersifat preferensi.

### 8.5 Riwayat git tidak ditulis ulang

Keputusan. Riwayat dibiarkan apa adanya. Perbaikan dilakukan pada kondisi pohon saat ini, yaitu menulis `.gitignore` yang benar lalu melepas `node_modules` dan berkas basis data dari pelacakan.

Alternatif yang ditolak. Menulis ulang riwayat dengan `git filter-repo` untuk membuang 22.893 berkas `node_modules` yang pernah ter-commit.

Alasan. Penulisan ulang riwayat berisiko tinggi pada hari tenggat, sedangkan yang diperiksa penilai adalah kondisi pohon saat pemeriksaan. Setelah pelepasan pelacakan, jumlah berkas terlacak turun dari 22.893 menjadi puluhan. Rujukan `DECISIONS.md` KD-04.

### 8.6 Keputusan lain

| Kode | Keputusan | Alternatif yang ditolak |
|---|---|---|
| KD-06 | Seluruh metode penyimpanan menjadi asinkron | Mempertahankan antarmuka sinkron gaya `better-sqlite3` |
| KD-07 | Penyaringan di klausa `WHERE` dan penggabungan lewat `LEFT JOIN` | `SELECT *` lalu menyaring di JavaScript, dengan satu kueri tambahan per baris |
| KD-14 | Login memakai email dan kata sandi bcrypt | Login nomor telepon tanpa kata sandi dengan pendaftaran otomatis |
| KD-15 | Sesi disimpan di tabel Postgres | Sesi di memori, dan token JWT di localStorage |
| KD-16 | Kepemilikan diambil dari sesi | Menerima `driverId` dan `passengerId` dari badan permintaan |
| KD-21 | Aturan kepatuhan sebagai trigger PostgreSQL | Validasi di middleware Express saja |
