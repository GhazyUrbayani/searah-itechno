# Dokumen Rencana dan Laporan Pengujian (IEEE Std 829-1998)

## 1. Identifikasi Rencana Pengujian

- Nomor Dokumen: TEST-SEARAH-2026-001
- Perangkat Lunak: Platform Searah Versi 1.0.0
- Tanggal Pengujian: 6 September 2026
- Lingkungan Uji: Node.js 20, Vitest 4.1.11, PostgreSQL 16 pada Neon Serverless

## 2. Pendekatan dan Strategi Pengujian

Pengujian dilakukan menggunakan dua pendekatan komplementer:

1. Pengujian unit white-box pada modul komputasi murni (`shared/matching.ts` dan `shared/dampak.ts`) menggunakan framework Vitest. Pengujian memeriksa seluruh percabangan logika, penanganan nilai nol, nilai kosong, dan pembulatan numerik.
2. Pengujian integrasi batas (Boundary Value Analysis / BVA) pada tiga trigger kepatuhan basis data PostgreSQL untuk memverifikasi penolakan transaksi yang melanggar aturan bisnis.

## 3. Hasil Pengujian Unit White-Box

Seluruh 48 pengujian unit lulus tanpa kegagalan:

| Berkas Pengujian | Jumlah Kasus | Status | Waktu Eksekusi |
|---|---|---|---|
| `shared/dampak.test.ts` | 17 | LULUS | 4 ms |
| `shared/matching.test.ts` | 31 | LULUS | 6 ms |
| **Total** | **48** | **LULUS** | **10 ms** |

### Cakupan Kode (Test Coverage Report)

Laporan cakupan kode yang diukur menggunakan instrumen Vitest v8:

| Modul | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| `shared/dampak.ts` | 100% | 100% | 100% | 100% |
| `shared/matching.ts` | 98.83% | 88.23% | 100% | 100% |
| **Rata-rata Gabungan** | **98.94%** | **90.69%** | **100%** | **100%** |

Catatan: Sisa percabangan yang belum tersentuh pada `matching.ts` adalah guard clause defensif untuk koordinat tak terdefinisi yang sudah ditolak sebelumnya oleh skema Zod.

## 4. Kasus Uji Nilai Batas (Boundary Value Analysis - BVA)

Tiga aturan kepatuhan basis data diuji menggunakan metode analisis nilai batas.

### 4.1 BVA Aturan 1: Plafon Tarif per Kilometer Koridor
- Parameter uji: Jarak rute 2,0 km pada Koridor 1 (plafon Rp3.000 per km).
- Batas atas yang diizinkan: 2,0 km x Rp3.000 = Rp6.000 per kursi.

| Kasus Uji | Input Tarif | Nilai Uji | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|
| BVA-1.1 | Di bawah batas | Rp5.000 | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-1.2 | Tepat pada batas | Rp6.000 | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-1.3 | Tepat di atas batas | Rp6.001 | Ditolak trigger | Ditolak (HTTP 422) | LULUS |
| BVA-1.4 | Jauh di atas batas | Rp999.000 | Ditolak trigger | Ditolak (HTTP 422) | LULUS |
| BVA-1.5 | Mode sosial bertarif | Rp1.000 | Ditolak trigger | Ditolak (HTTP 422) | LULUS |

Pesan penolakan aktual dari PostgreSQL:
`Tarif per kursi melampaui plafon koridor: Rp999000 > batas maksimum Rp9759 (jarak 3.3 km x plafon Rp3000/km)`

### 4.2 BVA Aturan 2: Batas Maksimal Dua Perjalanan Aktif per Hari
- Parameter uji: Pengemudi ID 1, tanggal keberangkatan 15 Oktober 2026.
- Batas kuota harian: Maksimal 2 perjalanan berstatus `open` atau `in-progress`.

| Kasus Uji | Jumlah Trip Aktif Hari Terkait | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|
| BVA-2.1 | 0 perjalanan aktif | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-2.2 | 1 perjalanan aktif | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-2.3 | 2 perjalanan aktif (mencapai batas) | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-2.4 | Pengajuan perjalanan ke-3 | Ditolak trigger | Ditolak (HTTP 422) | LULUS |

Pesan penolakan aktual dari PostgreSQL:
`Pengemudi telah mencapai batas maksimum 2 perjalanan per hari pada tanggal 15-10-2026`

### 4.3 BVA Aturan 3: Validasi Kapasitas Kursi Pemesanan
- Parameter uji: Perjalanan dengan kapasitas 4 kursi.
- Kondisi awal: 1 kursi telah dipesan, sisa 3 kursi tersedia.

| Kasus Uji | Kursi Diminta | Sisa Kapasitas | Hasil Diharapkan | Hasil Aktual | Status |
|---|---|---|---|---|---|
| BVA-3.1 | 1 kursi | 3 kursi | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-3.2 | 3 kursi (tepat penuh) | 3 kursi | Disimpan | Disimpan (HTTP 201) | LULUS |
| BVA-3.3 | 4 kursi (melebihi batas) | 3 kursi | Ditolak trigger | Ditolak (HTTP 422) | LULUS |
| BVA-3.4 | 99 kursi (jauh melebihi) | 3 kursi | Ditolak trigger | Ditolak (HTTP 422) | LULUS |

Pesan penolakan aktual dari PostgreSQL:
`Kapasitas kursi tidak mencukupi: tersisa 3 kursi, diminta 99 kursi`

## 5. Log Eksekusi Pengujian

Ringkasan rekaman eksekusi perintah verifikasi pada mesin pengujian:

1. `npm run check`: Berhasil tanpa galat kompilasi TypeScript (exit code 0).
2. `npm run test`: 48 kasus uji lulus dalam waktu 217 milidetik (exit code 0).
3. `npm run demo:reset`: Pembersihan dan inisialisasi basis data 100 persen berhasil (exit code 0).
4. `npx tsx script/jalankan-sql.ts migrations/001_trigger_kepatuhan.sql`: Sembilan pernyataan SQL dieksekusi tanpa galat (exit code 0).
