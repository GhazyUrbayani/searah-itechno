# Diagram Hubungan Entitas dan Model Data (ERD)

Dokumen ini menjelaskan struktur relasi basis data PostgreSQL untuk platform Searah, analisis normalisasi bentuk normal ketiga (3NF), serta prinsip integritas temporal pada pencatatan ledger dampak.

## 1. Diagram Relasi Entitas (Mermaid erDiagram)

```mermaid
erDiagram
    INSTITUSI ||--o{ KORIDOR : "memiliki"
    INSTITUSI ||--o{ USERS : "menaungi"
    USERS ||--o{ KENDARAAN : "memiliki"
    USERS ||--o{ TRIPS : "mengemudikan"
    USERS ||--o{ BOOKINGS : "memesan"
    USERS ||--o{ RATINGS : "memberi/menerima"
    USERS ||--o{ INCIDENTS : "melaporkan"
    KORIDOR ||--o{ TRIPS : "membatasi"
    KENDARAAN ||--o{ TRIPS : "digunakan"
    TRIPS ||--o{ BOOKINGS : "memuat"
    BOOKINGS ||--o| LEDGER_DAMPAK : "menghasilkan"
    BOOKINGS ||--o{ RATINGS : "dinilai"

    INSTITUSI {
        int id PK
        text nama
        text domain_email UK
        double kas_solidaritas_rupiah
        timestamptz created_at
    }

    KORIDOR {
        int id PK
        int institusi_id FK
        text nama
        text asal_nama
        double asal_lat
        double asal_lng
        text tujuan_nama
        double tujuan_lat
        double tujuan_lng
        double radius_jemput_m
        double batas_deviasi_persen
        double plafon_tarif_per_km
        text jam_mulai
        text jam_selesai
        boolean aktif
        timestamptz created_at
    }

    USERS {
        int id PK
        text name
        text phone UK
        text email UK
        text password_hash
        text role
        text category
        boolean ktp_verified
        boolean sim_verified
        double trust_score
        int total_trips
        text gender
        int institusi_id FK
        text tarif_kategori
        boolean is_active
        boolean is_suspended
        timestamptz created_at
    }

    KENDARAAN {
        int id PK
        int pemilik_id FK
        text plat_disamarkan
        text merek
        double konsumsi_km_per_liter
        int kursi_total
        text status_verifikasi
        timestamptz created_at
    }

    TRIPS {
        int id PK
        int driver_id FK
        int koridor_id FK
        int kendaraan_id FK
        text origin_name
        double origin_lat
        double origin_lng
        text destination_name
        double destination_lat
        double destination_lng
        timestamptz departure_time
        int available_seats
        int booked_seats
        text price_mode
        double price_per_seat
        double max_deviation_km
        text gender_preference
        text status
        double jarak_km
        text notes
        timestamptz created_at
    }

    BOOKINGS {
        int id PK
        int trip_id FK
        int passenger_id FK
        text pickup_name
        double pickup_lat
        double pickup_lng
        int seats_booked
        double total_price
        text status
        text payment_status
        timestamptz created_at
    }

    LEDGER_DAMPAK {
        int id PK
        int booking_id FK,UK
        double jarak_km
        double liter_dihemat
        double kg_co2e_dihemat
        double rupiah_dihemat
        text versi_rumus
        timestamptz created_at
    }

    PARAMETER_DAMPAK {
        int id PK
        text kunci UK
        double nilai
        text satuan
        text sumber
        timestamptz berlaku_sejak
    }

    RATINGS {
        int id PK
        int booking_id FK
        int rater_id FK
        int ratee_id FK
        double score
        text comment
        timestamptz created_at
    }

    INCIDENTS {
        int id PK
        int booking_id FK
        int reporter_id FK
        text type
        text description
        text status
        timestamptz created_at
    }

    SESSION {
        text sid PK
        json sess
        timestamptz expire
    }
```

## 2. Analisis Bentuk Normal Ketiga (3NF)

Skema basis data memenuhi kaidah bentuk normal ketiga:

1. Bentuk Normal Pertama (1NF): Setiap kolom hanya menyimpan nilai skalar atomik tunggal. Tidak ada atribut bernilai ganda atau kelompok data berulang di dalam satu kolom.
2. Bentuk Normal Kedua (2NF): Seluruh tabel menggunakan kunci primer tunggal (id tipe integer serial atau sid tipe text). Setiap atribut non-kunci bergantung sepenuhnya pada kunci primer tabel tersebut.
3. Bentuk Normal Ketiga (3NF): Tidak ada ketergantungan transitif antarkolom non-kunci. Data institusi dipisahkan dari pengguna, data kendaraan dipisahkan dari perjalanan, dan data koridor dipisahkan dari institusi.

## 3. Desain Integritas Temporal pada Ledger Dampak

Tabel `ledger_dampak` mematuhi prinsip integritas temporal untuk kebutuhan audit lingkungan:

1. Nilai Tersimpan Permanen (Immutability): Setiap entri dihitung tepat satu kali saat perjalanan mencapai status selesai. Baris tidak pernah diperbarui atau dihitung ulang saat antarmuka merender grafik.
2. Isolasi dari Perubahan Parameter: Tabel `parameter_dampak` dapat diperbarui di masa mendatang jika harga bahan bakar acuan bersubsidi berubah atau koefisien emisi nasional direvisi. Pembaruan tersebut hanya berlaku untuk perjalanan yang diselesaikan setelah waktu pembaruan. Rekam jejak penghematan masa lalu tetap utuh mencerminkan kondisi riil saat perjalanan berlangsung.
3. Penelusuran Versi Rumus: Kolom `versi_rumus` menyimpan pengidentifikasi algoritma yang digunakan saat penghitungan, misalnya `dampak-1.0.0`. Hal ini memungkinkan verifikasi retroaktif dan pembandingan kinerja model antarperiode.
