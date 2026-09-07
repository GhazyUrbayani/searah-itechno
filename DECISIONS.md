# Catatan Keputusan Desain

Berkas ini mencatat keputusan teknis yang diambil selama pengerjaan Searah,
beserta alternatif yang ditolak. Urutan mengikuti waktu pengambilan keputusan.

## KD-01. Klien disambungkan ke API sebelum basis data dimigrasikan

**Konteks.** Audit menemukan `client/src/lib/queryClient.ts` baris 4 berisi
placeholder `__PORT_5000__` yang tidak pernah disubstitusi oleh proses build
mana pun. Akibatnya `IS_STATIC` selalu bernilai benar. Seluruh 21 endpoint
Express menjadi kode mati. Setiap pembacaan dilayani array literal di
`mockData.ts` dan setiap penulisan dijawab objek palsu tanpa menyentuh jaringan.

**Keputusan.** Penyambungan klien ke API dikerjakan lebih dulu, mendahului
migrasi ke Postgres.

**Alternatif yang ditolak.** Migrasi basis data lebih dulu. Ditolak karena
hasilnya adalah basis data kosong di belakang aplikasi yang tetap menampilkan
data tiruan. Tidak ada satu pun kriteria penilaian yang terpenuhi oleh urutan
itu.

## KD-02. Haversine dipilih, PostGIS ditunda

**Konteks.** Modul pencocokan belum ada sama sekali di repositori. Modul itu
harus ditulis dari nol, bukan direfaktor.

**Keputusan.** Jarak dihitung dengan Haversine di TypeScript murni. Koordinat
disimpan sebagai `doublePrecision` biasa, bukan tipe geografi PostGIS.

**Alternatif yang ditolak.** PostGIS dengan `geography(Point, 4326)`,
`ST_DWithin`, dan indeks GiST. Ditolak untuk iterasi ini karena tiga alasan.
Fungsi murni lebih cepat ditulis dan diuji. Logika pencocokan dapat
dipertunjukkan langsung saat demo tanpa perantara basis data. Penyaring spasial
adalah optimasi untuk volume besar, sedangkan koridor tertutup membatasi
kandidat pada puluhan baris, bukan jutaan.

**Konsekuensi.** Jarak yang dipakai adalah jarak lingkaran besar di atas
ellipsoid WGS84, bukan jarak jaringan jalan. Keterbatasan ini dicatat di bagian
batas MVP pada README. Penggantian ke PostGIS dan OSRM masuk peta jalan.

## KD-03. Pembaruan berkala menggantikan koneksi persisten

**Konteks.** Penilaian dilakukan lewat URL publik di Vercel. Fungsi serverless
berumur pendek dan tidak dapat menahan koneksi WebSocket.

**Keputusan.** Kesegaran data dijaga dengan `refetchInterval` milik TanStack
Query, bernilai 3000 milidetik, disimpan sebagai konstanta `SELANG_POLLING_MS`
di `client/src/lib/queryClient.ts`. Konstanta itu dipasang hanya pada tampilan
yang menunjukkan sisa kursi, yaitu daftar perjalanan, dasbor, dan detail
perjalanan.

**Alternatif yang ditolak.** Server WebSocket dengan paket `ws`. Ditolak karena
tidak dapat berjalan di lingkungan serverless. Paket `ws` juga ternyata nol
impor di seluruh repositori, jadi penghapusannya tidak memerlukan penulisan
ulang kode apa pun.

**Alternatif kedua yang ditolak.** Memasang `refetchInterval` global pada
seluruh query. Ditolak karena setiap query Neon adalah satu permintaan HTTP.
Menarik ulang halaman admin dan profil setiap tiga detik menghabiskan kuota
tanpa manfaat, karena data di sana jarang berubah.

## KD-04. Riwayat git tidak ditulis ulang

**Konteks.** Repositori melacak 22.893 berkas di dalam `node_modules`, dan
direktori `.git` berukuran 83 MB. Berkas basis data `searah.db` juga ikut
terlacak.

**Keputusan.** Riwayat dibiarkan apa adanya. Perbaikan dilakukan pada kondisi
pohon saat ini, yaitu menulis `.gitignore` yang benar lalu melepas
`node_modules` dan `searah.db` dari pelacakan.

**Alternatif yang ditolak.** Menulis ulang riwayat dengan `git filter-repo`.
Ditolak karena berisiko tinggi pada hari tenggat, sedangkan yang dinilai juri
adalah kondisi pohon saat pemeriksaan.

**Catatan lapangan.** Selama pengerjaan, direktori `.git` di root tergantikan
oleh `.git` milik repositori bersarang `searah-itechno/` yang ditemukan saat
audit. Riwayat 5 commit lokal hilang dan tidak dapat dipulihkan. Seluruh kode
sumber tidak terpengaruh. Kejadian ini dicatat di sini karena memengaruhi klaim
riwayat pengembangan di README.

## KD-05. Driver Neon diturunkan ke jalur 0.10

**Konteks.** `@neondatabase/serverless` versi 1.1.0 mengubah `neon()` menjadi
fungsi tagged template. `drizzle-orm` 0.39.3 memanggilnya dengan gaya lama.
Seluruh endpoint menjawab HTTP 500 dengan pesan `This function can now be
called only as a tagged-template function`.

**Keputusan.** Driver dikunci ke `^0.10.4`, versi yang cocok dengan
`drizzle-orm` 0.39.3.

**Alternatif yang ditolak.** Menaikkan `drizzle-orm` ke jalur 0.44. Ditolak
karena berdampak pada `drizzle-zod` 0.7 dan seluruh definisi skema, sedangkan
masalahnya dapat diselesaikan dengan satu penurunan versi driver.

## KD-06. Metode penyimpanan diubah menjadi asinkron

**Konteks.** Seluruh metode `storage` sebelumnya sinkron, mengikuti perilaku
`better-sqlite3`. Driver HTTP Neon selalu asinkron.

**Keputusan.** Antarmuka `IStorage` dan seluruh implementasinya mengembalikan
`Promise`. Handler di `server/routes.ts` menjadi asinkron. Express 5
meneruskan promise yang ditolak ke penangan galat, sehingga tidak perlu
membungkus setiap handler dengan try dan catch.

## KD-07. Penyaringan dipindahkan ke SQL dan N+1 dihapus

**Konteks.** `GET /api/trips` sebelumnya menjalankan `SELECT *` lalu menyaring
di JavaScript. Endpoint enrichment memanggil `getUserById` di dalam `.map()`,
menghasilkan satu query tambahan per baris.

**Keputusan.** Penyaringan status, koridor, dan mode tarif pindah ke klausa
`WHERE`. Data relasi diambil dengan `LEFT JOIN` tunggal. Tabel `users`
dialiaskan menjadi `pengemudi`, `penumpang`, dan `pelapor` agar satu query
dapat menggabungkannya lebih dari sekali.

**Alasan.** Setiap query Neon adalah satu perjalanan HTTP. Pola N+1 yang nyaris
gratis di SQLite lokal menjadi mahal lewat jaringan. Daftar 25 perjalanan
sebelumnya membutuhkan 26 perjalanan HTTP, sekarang satu.

## KD-08. Rata-rata skor kepercayaan dihitung di basis data

**Konteks.** `createRating` sebelumnya menarik seluruh baris penilaian seorang
pengguna ke memori lalu merata-ratakannya di JavaScript.

**Keputusan.** Perhitungan memakai agregat `avg()` di SQL.

## KD-09. Bug stempel waktu beku diperbaiki

**Konteks.** Seluruh kolom `createdAt` memakai `.default(new Date().toISOString())`.
Nilai itu dievaluasi sekali saat modul dimuat lalu dibekukan sebagai literal
SQL. Setiap baris baru menerima stempel waktu saat proses dijalankan, bukan saat
baris dibuat.

**Keputusan.** Kolom diubah menjadi `timestamp` dengan `defaultNow()`, sehingga
nilai dihasilkan basis data pada saat penyisipan.

## KD-10. Kunci asing ditambahkan

**Konteks.** Skema lama tidak memiliki satu pun `references()`. Seluruh
keterkaitan hanya berupa kolom `integer` yang disambung manual di lapisan
aplikasi.

**Keputusan.** Seluruh kolom relasi memakai `references()`. Basis data kini
menolak `driver_id` yang tidak menunjuk pengguna mana pun.

## KD-11. Port pengembangan dipindah ke 5050

**Konteks.** Port 5000 pada macOS dipakai AirPlay Receiver milik Control Center,
yang menjawab setiap permintaan dengan HTTP 403.

**Keputusan.** Port bawaan pengembangan menjadi 5050, disetel lewat `.env`.

## KD-12. Paket yang nol impor dihapus

**Konteks.** Audit menunjukkan `ws`, `memorystore`, `express-session`,
`passport`, dan `passport-local` tidak diimpor di berkas mana pun. Allowlist di
`script/build.ts` menyebut 22 paket, di antaranya `stripe`, `openai`,
`nodemailer`, dan `xlsx`, yang tidak satu pun terdaftar sebagai dependensi.

**Keputusan.** Kelima paket beserta tipenya dihapus. Allowlist dipangkas dari 22
menjadi 6 paket yang benar-benar diimpor server. `express-session` akan dipasang
kembali bersama `connect-pg-simple` pada tahap autentikasi.

**Catatan.** `server/vite.ts` mengimpor `nanoid` yang tidak terdaftar sebagai
dependensi dan hanya kebetulan dapat diselesaikan sebagai dependensi transitif.
Impor itu diganti dengan `Date.now()`.

## KD-13. Pemeriksaan tipe dijadikan bagian dari build

**Konteks.** `npm run build` sebelumnya hanya menjalankan Vite dan esbuild.
Keduanya membuang anotasi tipe tanpa memeriksanya, sehingga galat
`Cannot find name 'T'` lolos ke produksi.

**Keputusan.** Skrip build menjadi `tsc --noEmit && tsx script/build.ts`. Galat
tipe kini menghentikan build.

## KD-14. Login memakai email dan kata sandi, bukan nomor telepon saja

**Konteks.** `POST /api/auth/login` sebelumnya menerima nomor telepon tanpa kata
sandi, lalu mendaftarkan pengguna baru secara otomatis jika nomor itu belum
ada. Siapa pun yang mengetahui nomor telepon seseorang dapat masuk sebagai
orang itu. Ini bypass autentikasi, bukan kelemahan kecil.

**Keputusan.** Login memakai email dan kata sandi. Kata sandi disimpan sebagai
hash bcrypt dengan 10 ronde. Pendaftaran otomatis dihapus dan dipindahkan ke
`POST /api/auth/register` yang tersendiri.

**Alasan email dipilih sebagai identitas.** Koridor tertutup mencocokkan
pengguna ke institusi lewat domain email. Nomor telepon tidak membawa informasi
institusi.

**Perlakuan terhadap login gagal.** Email tidak terdaftar dan kata sandi salah
sama-sama dijawab HTTP 401 dengan pesan identik. Untuk email yang tidak
terdaftar, perbandingan bcrypt tetap dijalankan terhadap hash tiruan, supaya
selisih waktu balasan tidak membocorkan email mana yang punya akun.

## KD-15. Sesi disimpan di Postgres

**Konteks.** `AuthContext` menyimpan pengguna di `useState`. Login hilang setiap
kali halaman dimuat ulang.

**Keputusan.** `express-session` dengan `connect-pg-simple`, tabel `session`
berada di basis data Neon yang sama. Cookie memakai `httpOnly`, `sameSite: lax`,
dan `secure` saat produksi. Klien membaca sesi dari `GET /api/auth/me`.

**Alternatif yang ditolak.** `memorystore`. Sesi di memori hilang setiap cold
start fungsi serverless, sehingga pengguna ter-logout secara acak.

**Alternatif kedua yang ditolak.** Token JWT di localStorage. Ditolak karena
token di localStorage dapat dibaca skrip pihak ketiga, sedangkan cookie
`httpOnly` tidak. Pencabutan sesi juga lebih sederhana dengan penyimpanan di
basis data.

**Catatan teknis.** `connect-pg-simple` memakai driver TCP `pg`, bukan driver
HTTP Neon. Endpoint pooled Neon dipakai agar jumlah koneksi tetap terkendali di
lingkungan serverless. Tabel `session` ikut didefinisikan di `shared/schema.ts`
supaya `drizzle-kit push` mengenalinya dan tidak menawarkan penghapusan.

## KD-16. Kepemilikan diambil dari sesi, bukan dari badan permintaan

**Konteks.** `POST /api/trips` menerima `driverId` dari klien. Siapa pun dapat
membuat perjalanan atas nama pengemudi lain. Hal yang sama berlaku untuk
`passengerId`, `raterId`, dan `reporterId`.

**Keputusan.** Keempat kolom itu dihapus dari skema validasi permintaan dan
diisi dari `req.session.userId`. Percobaan mengirim `driverId: 999` menghasilkan
baris dengan `driverId` milik pemilik sesi.

## KD-17. Nomor telepon dan email dibuka bertahap

**Konteks.** `GET /api/users` mengembalikan seluruh nomor telepon setiap
pengguna kepada siapa pun yang memanggilnya.

**Keputusan.** Tiga lapis.

Pertama, `GET /api/users` hanya untuk admin.

Kedua, data pengemudi pada daftar perjalanan publik melewati fungsi
`tanpaKontak`, yang membuang `phone` dan `email`. Nama, skor kepercayaan, dan
status verifikasi tetap terlihat supaya penumpang dapat menilai calon
pengemudi.

Ketiga, nomor telepon lawan main dibuka lewat `GET /api/bookings/:id/kontak`
yang hanya menjawab bila pemanggil adalah penumpang atau pengemudi pada
pemesanan itu, dan status pemesanan sudah `confirmed`, `in-progress`, atau
`completed`. Sebelum itu, endpoint menjawab HTTP 409.

## KD-18. Header keamanan dan pembatas laju

**Keputusan.** `helmet` memasang Content Security Policy, `X-Frame-Options:
DENY`, dan `Referrer-Policy: no-referrer`. `express-rate-limit` membatasi
`/api/auth/login` dan `/api/auth/register` ke 10 permintaan per 15 menit per
alamat IP, serta `POST /api/trips` dan `POST /api/bookings` ke 20 permintaan
per menit.

**Catatan.** `style-src` dan `font-src` harus mengizinkan `fonts.googleapis.com`
dan `api.fontshare.com`, karena `client/index.html` dan `client/src/index.css`
memuat font dari kedua host itu. `script-src` masih memerlukan `'unsafe-inline'`
karena Vite menyuntikkan skrip inline saat pengembangan.

## KD-19. Penjaga rute menunggu pemeriksaan sesi selesai

**Konteks.** Setiap halaman terlindungi memanggil `navigate("/login")` ketika
`user` bernilai null. Dengan sesi yang dibaca asinkron, nilai itu selalu null
pada render pertama, sehingga pengguna yang sudah masuk tetap dilempar ke layar
masuk.

**Keputusan.** Komponen `RuteTerlindungi` di `client/src/App.tsx` menahan render
sampai `GET /api/auth/me` selesai. Komponen ini juga menegakkan peran di sisi
klien, sedangkan penegakan yang mengikat tetap berada di middleware server.

**Manfaat tambahan.** Halaman kini hanya dipasang setelah `user` dipastikan ada,
sehingga pemanggilan hook tidak lagi berada di bawah percabangan yang berubah
antar render.

## KD-20. Hasil dampak disimpan permanen saat pemesanan selesai

Perhitungan penghematan bahan bakar dan reduksi emisi dijalankan satu kali saat status pemesanan berubah menjadi selesai, lalu disimpan di tabel `ledger_dampak` bersama versi rumus. Alternatif menghitung ulang saat render dengan parameter aktif ditolak karena perubahan harga BBM atau faktor emisi di masa depan akan mengubah angka historis masa lalu secara retroaktif dan merusak integritas audit.

## KD-21. Aturan kepatuhan ditegakkan lewat trigger PostgreSQL

Tiga aturan bisnis yaitu plafon tarif per kilometer, batas maksimal dua perjalanan aktif per hari, dan kapasitas kursi pemesanan dipasang sebagai trigger `BEFORE INSERT OR UPDATE` pada PostgreSQL di Neon. Alternatif yang mengandalkan validasi di middleware Express semata ditolak karena rentan terhadap race condition pada pemesanan bersamaan dan tidak melindungi integritas data jika ada operasi basis data langsung di luar handler HTTP.

## KD-22. Skoring berjalan di aplikasi, bukan di SQL

**Keputusan.** Peringkat kandidat dihitung modul murni `shared/matching.ts`. Basis
data hanya menyaring kandidat lewat klausa `WHERE` pada koridor dan status.

**Alternatif yang ditolak.** Menyusun skor sebagai ekspresi SQL di dalam kueri
pengambilan perjalanan.

**Alasan.** Rumus skoring adalah bagian produk yang paling sering ditanya dan
paling sering diubah. Sebagai fungsi murni, rumus dapat diuji tanpa basis data,
dan seluruh test berjalan dalam ratusan milidetik. Rumus dalam SQL menuntut
basis data hidup untuk setiap pengujian, menyulitkan pengujian nilai batas, dan
menyulitkan pengembalian rincian per komponen yang dibutuhkan antarmuka.

**Pembagian peran.** Lapisan penyimpanan menegakkan aturan yang tidak boleh
dilanggar. Lapisan aplikasi menyusun peringkat yang bersifat preferensi.

## KD-23. Skor maksimum pencocokan adalah 0,90

**Konteks.** Empat bobot positif berjumlah 0,35 ditambah 0,25 ditambah 0,20
ditambah 0,10, yaitu 0,90. Sisa 0,10 dialokasikan sebagai penalti deviasi yang
selalu mengurangi.

**Keputusan.** Sifat ini dibiarkan apa adanya dan didokumentasikan, bukan
dinormalisasi menjadi 1,00.

**Alasan.** Penormalan akan menyembunyikan struktur bobot yang diminta
spesifikasi. Antarmuka menampilkan skor dengan pembanding eksplisit dalam
bentuk `0.5600 dari 0,9000`, sehingga pengguna tidak salah membaca skor 0,62
sebagai kecocokan 62 persen.

## KD-24. Koordinat perjalanan pada data contoh diturunkan dari koridornya

**Konteks.** Skrip seed sebelumnya menulis koordinat yang sama untuk seluruh
perjalanan, yaitu `-6.36, 106.82` menuju `-6.37, 106.83`, tanpa memandang
koridor. Nilai `jarak_km` juga ditulis sebagai angka tetap 1,4, 8,6, atau 18,2
dan tidak diturunkan dari koordinat itu.

**Akibat yang terukur.** Titik asal perjalanan berjarak 1.711 meter dari asal
koridor, sedangkan rutenya sendiri hanya 1,40 kilometer. Penjemputan di ujung
koridor terhitung sebagai deviasi 180,5 persen, jauh di atas batas 20 persen,
sehingga seluruh kandidat gugur dan `GET /api/trips/match` selalu mengembalikan
daftar kosong. Untuk koridor kedua, `jarak_km` bernilai 8,6 padahal jarak
sesungguhnya antara koordinatnya sekitar 1,4 kilometer, sehingga plafon tarif
dan Ledger Dampak sama-sama memakai jarak fiktif.

**Keputusan.** Titik asal dan tujuan diletakkan di sekitar ujung koridornya
dengan pergeseran menentu sekitar 65 meter per langkah, lalu `jarak_km`
dihitung dengan Haversine dari koordinat itu.

**Verifikasi.** Selisih antara `jarak_km` tersimpan dan hasil hitung ulang dari
koordinat adalah nol untuk seluruh perjalanan. Pencocokan meloloskan 3 dari 3
kandidat pada koridor 1, 2 dari 2 pada koridor 2, dan 2 dari 2 pada koridor 3.

## KD-25. Agregat mingguan dikelompokkan menurut waktu keberangkatan

**Konteks.** Fungsi agregat sebelumnya mengelompokkan baris ledger menurut
`created_at` milik baris ledger itu sendiri. Seluruh baris yang dihasilkan
skrip seed punya `created_at` yang hampir sama, sehingga grafik menumpuk di
satu batang. Perhitungan kunci minggu juga mencampur `getDay` dan `getDate`
yang memakai zona waktu mesin dengan `toISOString` yang memakai UTC, sehingga
kunci bergeser satu hari di zona waktu Indonesia dan memunculkan dua batang
pada tanggal berurutan, yaitu 2026-08-30 dan 2026-08-31.

**Keputusan.** Pengelompokan memakai `trips.departure_time` lewat gabungan ke
tabel `bookings` dan `trips`. Kunci minggu dihitung sepenuhnya dalam UTC oleh
fungsi `awalMingguUtc`.

**Verifikasi.** Grafik kini menghasilkan dua batang pada 2026-08-24 dan
2026-08-31, yaitu dua hari Senin yang berjarak tepat satu minggu.

## KD-26. Kredensial akun demo disatukan ke satu sumber

**Konteks.** Halaman masuk memuat tiga tombol akun demo dengan alamat
`budi.santoso@ui.ac.id`, `sari.dewi@ui.ac.id`, dan `admin@searah.id` berkata
sandi `demo1234`. Skrip seed membuat akun `driver@searah.id`,
`passenger@searah.id`, dan `admin@searah.id` berkata sandi `searah123`.
Ketiga tombol menjawab HTTP 401, sehingga jalur demo satu klik tidak berfungsi.

**Keputusan.** Konstanta di halaman masuk disamakan dengan yang dihasilkan
skrip seed. Kredensial yang sama dicantumkan di README.

## KD-27. Tangkapan layar lebar 360 dan 768 piksel dibuang

**Konteks.** Tangkapan layar dihasilkan Chrome headless dengan opsi
`--window-size`. Berkas keluarannya memang berukuran 360 dan 768 piksel, tetapi
tata letak di dalamnya dirender pada lebar yang lebih besar lalu dipotong.
Judul, angka, dan label sumbu terlihat terpenggal, padahal tata letak
sesungguhnya rapi.

**Verifikasi tandingan.** Pada viewport teremulasi 360 kali 780 piksel di
peramban sungguhan, `document.body.scrollWidth` sama dengan `window.innerWidth`
pada halaman depan, pencarian, dampak, dan kepatuhan. Tidak ada luapan
horizontal, dan tangkapan layar peramban menunjukkan teks yang membungkus
dengan benar.

**Keputusan.** Berkas 360 dan 768 piksel dihapus karena memberi kesan keliru
tentang tata letak. Hanya tangkapan layar 1440 piksel yang disimpan, dan
kesesuaian pada 360 piksel dinyatakan lewat hasil pengukuran, bukan lewat
gambar yang menyesatkan.

## KD-28. Nilai uji plafon disesuaikan dengan atribut step input

**Konteks.** Tombol Uji tarif di atas plafon pada halaman pembuatan perjalanan
mengisi `pricePerSeat` dengan 999999. Input tarif memakai `step="1000"`.
Peramban menolak nilai yang bukan kelipatan 1000 lewat validasi HTML bawaan,
sehingga `requestSubmit` tidak pernah memicu event submit.

**Akibat yang terukur.** Tidak ada permintaan `POST /api/trips` yang terkirim.
Trigger basis data tidak pernah dipanggil, dan tidak ada pesan galat yang
muncul. Tombol yang justru dipakai saat presentasi terlihat mati.

**Keputusan.** Nilai uji diubah menjadi 999000.

**Verifikasi.** Penekanan tombol lalu pengiriman formulir menghasilkan
`POST /api/trips 422` dengan pesan `Tarif per kursi melampaui plafon koridor:
Rp999000 > batas maksimum Rp9759 (jarak 3.3 km x plafon Rp3000/km)` yang
berasal dari basis data.

## KD-29. Kegagalan validasi formulir tidak boleh diam

**Konteks.** `form.handleSubmit` pada halaman pembuatan perjalanan hanya
menerima satu argumen. Ketika validasi gagal, tidak ada yang terjadi di layar.
Tombol kirim tampak tidak berfungsi tanpa penjelasan apa pun.

**Keputusan.** Argumen kedua ditambahkan. Ruas yang gagal beserta pesannya
ditampilkan lewat toast berjudul Formulir belum lengkap.

**Alasan.** Pesan galat harus menjelaskan apa yang salah dan apa yang harus
dilakukan. Kegagalan yang diam adalah bentuk terburuknya, karena pengguna tidak
punya petunjuk sama sekali.
