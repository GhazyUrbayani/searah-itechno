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

Keputusan teknis sistem merujuk pada berkas keputusan desain DECISIONS.md:

- KD-01: Penyambungan klien langsung ke rute API nyata mendahului perbaikan basis data untuk memastikan fungsi jaringan aktif.
- KD-02: Algoritma jarak Haversine di TypeScript murni dipilih menggantikan PostGIS guna menyederhanakan pengujian dan mempercepat evaluasi.
- KD-03: Polling berkala TanStack Query menggantikan WebSocket untuk menjamin kompatibilitas fungsi serverless Vercel.
- KD-06: Seluruh metode penyimpanan diubah asinkron mengikuti karakteristik driver HTTP Neon.
- KD-11: Penghapusan rute pendaftaran otomatis di sisi klien untuk mencegah manipulasi peran pengguna.
- KD-14: Penggunaan bcrypt dan hash tiruan pada email tak terdaftar untuk mencegah serangan enumerasi akun.
- KD-15: Penyimpanan sesi di tabel basis data Postgres via connect-pg-simple untuk mencegah kehilangan sesi saat cold start.
- KD-16: Pengambilan id pengemudi dan penumpang langsung dari sesi aktif untuk mencegah eskalasi kepemilikan.
- KD-17: Pembatasan visibilitas nomor telepon dan email hingga pemesanan terkonfirmasi.
- KD-20: Penyimpanan hasil ledger dampak secara statis saat pemesanan selesai guna menjamin integritas audit historis.
- KD-21: Penegakan aturan plafon tarif, kuota perjalanan, dan batas kursi menggunakan trigger PostgreSQL untuk mencegah race condition.
