Searah, instruksi kerja untuk agen

Proyek kompetisi Web Development nasional. Jangan merapikan kode yang sudah jalan. Jangan merefaktor tanpa diminta.

Bahasa

Seluruh teks yang dilihat pengguna, seluruh dokumentasi, dan seluruh pesan galat ditulis dalam Bahasa Indonesia. Istilah teknis boleh tetap bahasa Inggris. Nama variabel dan fungsi boleh bahasa Inggris.

Tumpukan teknologi

React 18 dengan Vite, Express 5, TypeScript, Drizzle ORM, PostgreSQL di Neon lewat drizzle-orm/neon-http, TanStack Query, Zod, Tailwind, Radix, Recharts, Vitest. Hosting Vercel.

Keadaan repo saat ini

Sudah selesai dan terverifikasi. Jangan diulang, jangan dibongkar.

Kebersihan repo. node_modules dan searah.db sudah keluar dari pelacakan git. .gitignore sudah benar. Paket ws, memorystore, passport sudah dihapus karena nol impor. Nama paket sudah searah.
Klien tersambung ke API sungguhan. Placeholder __PORT_5000__ dan IS_STATIC di queryClient.ts sudah dibuang. mockData.ts sudah dihapus. vercel.json sudah mendeploy api/index.ts sebagai fungsi.
Migrasi ke Neon selesai. Skema memakai drizzle-orm/pg-core. Seluruh metode storage sudah async. Bug createdAt yang membeku saat modul dimuat sudah diperbaiki dengan defaultNow().
Autentikasi selesai. Email dan kata sandi dengan bcrypt. Pendaftaran otomatis dihapus. Sesi disimpan di tabel session di Neon lewat connect-pg-simple. Email tidak terdaftar dan kata sandi salah dijawab identik dengan 401 supaya tidak ada enumerasi akun. Percobaan login kelima dijawab 429. Header CSP, X-Frame-Options: DENY, dan Referrer-Policy: no-referrer terpasang. Objek pengemudi pada daftar publik tidak memuat phone dan email. Endpoint GET /api/bookings/:id/kontak menjawab 409 saat pemesanan masih pending, 200 setelah dikonfirmasi, dan 403 untuk pihak ketiga.
Skema diperluas. Sebelas tabel dengan empat belas foreign key. Tabel baru institusi, koridor, kendaraan, parameter_dampak, ledger_dampak, dan session. Kolom trips.corridor yang tadinya teks bebas sudah menjadi trips.koridorId berkunci asing. Ditambahkan trips.kendaraanId dan trips.jarakKm. Kolom users bertambah institusiId dan tarifKategori. Empat baris parameter_dampak sudah terisi lengkap dengan sumbernya.
shared/matching.ts dan shared/dampak.ts sudah ditulis. Tiga puluh satu unit test modul pencocokan lulus.
Yang tidak boleh disentuh
Jangan menambahkan PostGIS. Jarak dihitung dengan Haversine di TypeScript. Ini keputusan sadar dengan alasan waktu dan kemudahan pengujian. Sudah tercatat di DECISIONS.md.
Jangan mengubah bobot pencocokan. Bobot positif berjumlah 0,90 karena penalti deviasi mengambil 0,10, jadi skor maksimum memang 0,90. Ini bukan bug. Kalau ada test yang gagal karena mengharap 1,00, test itu yang salah.
Jangan menerima jarakKm dari klien. Server menghitungnya dengan Haversine. Kalau klien bisa mengirimnya, penyewa bisa mengecilkan jarak untuk menembus plafon tarif.
Jangan mendaftarkan /api/trips/:id sebelum /api/trips/match. Rute parameter akan menangkap match lebih dulu.
Jangan menghapus fonts.googleapis.com dan api.fontshare.com dari CSP. Keduanya dimuat client/index.html dan client/src/index.css.
Jangan menulis ulang riwayat git. Terlalu berisiko dengan waktu tersisa.
Jangan memasang kembali ws, memorystore, atau passport.
Jangan mengembalikan mockData.ts atau fallback data statis apa pun.
Jangan mengubah autentikasi. Sudah diuji dan lulus.
Alat yang sudah ada

script/jalankan-sql.ts menjalankan SQL mentah ke Neon. Pakai ini untuk trigger, bukan drizzle-kit push.

DECISIONS.md memakai penomoran KD-nn. Nomor terakhir KD-19. Tambahkan keputusan baru dengan nomor berikutnya, satu paragraf per keputusan, memuat alternatif yang ditolak dan alasannya.

Aturan penulisan teks

Berlaku untuk README, seluruh dokumen di docs/, dan seluruh teks di antarmuka.

Dilarang: tanda pisah panjang, emoji, badge shields.io, titik dua di tengah kalimat, konstruksi bukan hanya X tetapi juga Y, tiga kata sifat berturut untuk satu benda, frasa participle yang ditempel di akhir kalimat seperti sehingga meningkatkan efisiensi, paragraf pembuka yang mengulang judulnya, dan kalimat penutup optimistis tanpa isi.

Kata terlarang: revolusioner, mutakhir, tanpa hambatan, memberdayakan, solusi menyeluruh, ekosistem digital, di era yang serba cepat ini, penting untuk dicatat, pada intinya, hal ini memungkinkan pengguna untuk.

Yang dipakai: kalimat pendek, satu gagasan per kalimat, kalimat aktif, angka konkret menggantikan kata sifat, panjang kalimat yang bervariasi, dan pengakuan atas kelemahan.

Teks tombol menyebut persis apa yang terjadi. Tulis Tawarkan kursi, bukan Kirim. Pesan galat menjelaskan apa yang salah dan apa yang harus dilakukan, tanpa minta maaf.

Alasannya bukan selera. Karya dinilai juri yang membaca puluhan submission, dan pola tulisan mesin mudah dikenali.

Cara melapor

Setelah tiap tahap selesai, laporkan satu paragraf berisi apa yang berubah dan bukti terukur. Bukti berarti keluaran perintah, kode status HTTP, atau angka, bukan klaim bahwa sesuatu sudah jalan.

Jangan menunggu persetujuan kecuali diminta berhenti secara eksplisit.