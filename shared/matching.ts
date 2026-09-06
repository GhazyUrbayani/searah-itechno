/**
 * Modul pencocokan perjalanan.
 *
 * Seluruh isi berkas ini adalah fungsi murni. Tidak ada akses basis data,
 * tidak ada pembacaan jam sistem, dan tidak ada efek samping. Setiap keluaran
 * hanya bergantung pada masukan, sehingga modul dapat diuji tanpa server.
 *
 * Jarak dihitung dengan rumus Haversine di atas bola berjari-jari rata-rata
 * WGS84. Yang dihasilkan adalah jarak lingkaran besar, bukan jarak jaringan
 * jalan. Keterbatasan ini dicatat di bagian batas MVP pada README.
 */

// ─── Konstanta ───────────────────────────────────────────────────────────────

/** Jari-jari rata-rata Bumi menurut IUGG, dalam kilometer. */
const JARI_JARI_BUMI_KM = 6371.0088;

/** Waktu Indonesia Barat terhadap UTC. Indonesia tidak menerapkan waktu musim panas. */
const OFFSET_WIB_MENIT = 7 * 60;

/** Versi rumus skoring. Dinaikkan bila bobot atau komponen berubah. */
export const VERSI_RUMUS_PENCOCOKAN = "cocok-1.0.0";

/**
 * Bobot tiap komponen skor. Seluruh bobot berada di satu tempat supaya
 * perubahannya dapat ditelusuri dalam satu diff.
 *
 * Empat bobot positif berjumlah 0,90. Sisa 0,10 dialokasikan sebagai penalti
 * deviasi yang selalu mengurangi. Karena itu skor maksimum yang dapat dicapai
 * sebuah perjalanan adalah 0,90, bukan 1,00.
 */
export const BOBOT = {
  kecocokanRute: 0.35,
  kecocokanWaktu: 0.25,
  skorPercaya: 0.2,
  kecocokanHarga: 0.1,
  penaltiDeviasi: 0.1,
} as const;

/** Toleransi selisih waktu bawaan, dalam menit. */
export const TOLERANSI_WAKTU_MENIT_BAWAAN = 45;

export type AlasanGugur =
  | "deviasi-melebihi-batas"
  | "kursi-habis"
  | "beda-koridor"
  | "di-luar-jam-operasional";

// ─── Tipe ────────────────────────────────────────────────────────────────────

export interface Titik {
  lat: number;
  lng: number;
}

export interface KoridorPencocokan {
  id: number;
  /** Jarak maksimum titik jemput dari garis rute, dalam meter. */
  radiusJemputM: number;
  /** Tambahan jarak maksimum akibat penjemputan, dalam persen jarak rute asli. */
  batasDeviasiPersen: number;
  /** Tarif maksimum per kilometer, dalam rupiah. */
  plafonTarifPerKm: number;
  /** Jam operasional koridor waktu WIB, format HH:MM. */
  jamMulai: string;
  jamSelesai: string;
}

export interface PerjalananKandidat {
  id: number;
  koridorId: number;
  asal: Titik;
  tujuan: Titik;
  waktuBerangkat: Date;
  kursiTersedia: number;
  kursiTerpesan: number;
  tarifPerKursi: number;
  /** Jarak rute asal ke tujuan dalam kilometer. */
  jarakKm: number;
  /**
   * Skor kepercayaan profil pengemudi pada rentang 0 sampai 100.
   * Lihat hitungSkorPercayaProfil.
   */
  skorPercayaProfil: number;
}

export interface PermintaanPencocokan {
  koridorId: number;
  titikJemput: Titik;
  titikTurun: Titik;
  waktuDiinginkan: Date;
  kursiDibutuhkan: number;
  toleransiMenit: number;
}

export interface RincianSkor {
  kecocokanRute: number;
  kecocokanWaktu: number;
  skorPercaya: number;
  kecocokanHarga: number;
  penaltiDeviasi: number;
}

export interface KontribusiKomponen {
  kunci: keyof RincianSkor;
  label: string;
  nilai: number;
  bobot: number;
  /** Sumbangan komponen ini terhadap skor akhir. Negatif untuk penalti. */
  kontribusi: number;
}

export interface HasilPencocokan {
  tripId: number;
  gugur: boolean;
  alasanGugur: AlasanGugur | null;
  skor: number;
  rincian: RincianSkor;
  komponen: KontribusiKomponen[];
  /** Nilai mentah yang berguna untuk ditampilkan di antarmuka. */
  ukuran: {
    jarakJemputKeRuteM: number;
    selisihWaktuMenit: number;
    tambahanJarakKm: number;
    plafonTarifKoridor: number;
    kursiTersisa: number;
  };
}

// ─── Geometri ────────────────────────────────────────────────────────────────

function keRadian(derajat: number): number {
  return (derajat * Math.PI) / 180;
}

/** Jarak lingkaran besar antara dua titik, dalam kilometer. */
export function haversineKm(a: Titik, b: Titik): number {
  const dLat = keRadian(b.lat - a.lat);
  const dLng = keRadian(b.lng - a.lng);
  const lat1 = keRadian(a.lat);
  const lat2 = keRadian(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * JARI_JARI_BUMI_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Posisi relatif proyeksi sebuah titik di sepanjang segmen, pada rentang 0
 * sampai 1. Nilai 0 berarti tepat di titik awal segmen, 1 di titik akhir.
 *
 * Perhitungan memakai proyeksi equirectangular yang berpusat pada lintang
 * segmen. Untuk koridor komuter yang panjangnya puluhan kilometer, galat
 * proyeksi ini jauh di bawah ketelitian yang dibutuhkan pencocokan.
 */
export function posisiSepanjangSegmen(titik: Titik, awal: Titik, akhir: Titik): number {
  const latAcuan = keRadian((awal.lat + akhir.lat) / 2);
  const skalaX = Math.cos(latAcuan);

  const ax = awal.lng * skalaX;
  const ay = awal.lat;
  const bx = akhir.lng * skalaX;
  const by = akhir.lat;
  const px = titik.lng * skalaX;
  const py = titik.lat;

  const dx = bx - ax;
  const dy = by - ay;
  const panjangKuadrat = dx * dx + dy * dy;

  // Segmen sepanjang nol. Seluruh titik diproyeksikan ke awal segmen.
  if (panjangKuadrat === 0) return 0;

  const t = ((px - ax) * dx + (py - ay) * dy) / panjangKuadrat;
  return Math.min(1, Math.max(0, t));
}

/** Jarak tegak lurus sebuah titik ke segmen garis, dalam kilometer. */
export function jarakTitikKeSegmenKm(titik: Titik, awal: Titik, akhir: Titik): number {
  const t = posisiSepanjangSegmen(titik, awal, akhir);
  const proyeksi: Titik = {
    lat: awal.lat + t * (akhir.lat - awal.lat),
    lng: awal.lng + t * (akhir.lng - awal.lng),
  };
  return haversineKm(titik, proyeksi);
}

// ─── Waktu ───────────────────────────────────────────────────────────────────

/** Mengubah string HH:MM menjadi menit sejak tengah malam. */
export function jamKeMenit(jam: string): number {
  const cocok = /^(\d{1,2}):(\d{2})$/.exec(jam.trim());
  if (!cocok) throw new Error(`Format jam tidak dikenali: ${jam}`);

  const jamKe = Number(cocok[1]);
  const menitKe = Number(cocok[2]);
  if (jamKe > 23 || menitKe > 59) throw new Error(`Jam di luar rentang: ${jam}`);

  return jamKe * 60 + menitKe;
}

/** Menit sejak tengah malam waktu WIB untuk sebuah stempel waktu. */
export function menitDalamHariWib(waktu: Date): number {
  const menitUtc = waktu.getUTCHours() * 60 + waktu.getUTCMinutes();
  return (menitUtc + OFFSET_WIB_MENIT) % (24 * 60);
}

/**
 * Memeriksa apakah sebuah waktu berada dalam jam operasional koridor.
 * Rentang yang melewati tengah malam, misalnya 22:00 sampai 05:00, ikut
 * ditangani.
 */
export function dalamJamOperasional(waktu: Date, jamMulai: string, jamSelesai: string): boolean {
  const menit = menitDalamHariWib(waktu);
  const mulai = jamKeMenit(jamMulai);
  const selesai = jamKeMenit(jamSelesai);

  if (mulai <= selesai) return menit >= mulai && menit <= selesai;
  return menit >= mulai || menit <= selesai;
}

// ─── Skoring ─────────────────────────────────────────────────────────────────

/** Membatasi sebuah nilai ke rentang 0 sampai 1. */
export function batasiSatuan(nilai: number): number {
  if (Number.isNaN(nilai)) return 0;
  return Math.min(1, Math.max(0, nilai));
}

/**
 * Menyusun skor kepercayaan profil pada rentang 0 sampai 100.
 *
 * Rumus skoring memakai pembagi 100, sedangkan penilaian bintang berada pada
 * rentang 1 sampai 5. Fungsi ini menjembatani keduanya sekaligus memberi bobot
 * pada verifikasi dokumen, yang merupakan inti klaim rasa aman pada produk ini.
 */
export function hitungSkorPercayaProfil(masukan: {
  rataRataBintang: number;
  ktpTerverifikasi: boolean;
  simTerverifikasi: boolean;
}): number {
  const dariBintang = batasiSatuan(masukan.rataRataBintang / 5) * 70;
  const dariKtp = masukan.ktpTerverifikasi ? 15 : 0;
  const dariSim = masukan.simTerverifikasi ? 15 : 0;
  return dariBintang + dariKtp + dariSim;
}

/**
 * Tambahan jarak yang harus ditempuh pengemudi untuk menjemput dan menurunkan
 * penumpang, dalam kilometer.
 *
 * Rute asli adalah asal ke tujuan. Rute dengan penumpang adalah asal, titik
 * jemput, titik turun, lalu tujuan. Selisih keduanya tidak pernah negatif.
 */
export function hitungTambahanJarakKm(
  asal: Titik,
  tujuan: Titik,
  titikJemput: Titik,
  titikTurun: Titik,
): number {
  const ruteAsli = haversineKm(asal, tujuan);
  const ruteDenganPenumpang =
    haversineKm(asal, titikJemput) +
    haversineKm(titikJemput, titikTurun) +
    haversineKm(titikTurun, tujuan);

  return Math.max(0, ruteDenganPenumpang - ruteAsli);
}

const LABEL_KOMPONEN: Record<keyof RincianSkor, string> = {
  kecocokanRute: "Kecocokan rute",
  kecocokanWaktu: "Kecocokan waktu",
  skorPercaya: "Skor kepercayaan",
  kecocokanHarga: "Kecocokan harga",
  penaltiDeviasi: "Penalti deviasi",
};

function susunKomponen(rincian: RincianSkor): KontribusiKomponen[] {
  return [
    {
      kunci: "kecocokanRute",
      label: LABEL_KOMPONEN.kecocokanRute,
      nilai: rincian.kecocokanRute,
      bobot: BOBOT.kecocokanRute,
      kontribusi: rincian.kecocokanRute * BOBOT.kecocokanRute,
    },
    {
      kunci: "kecocokanWaktu",
      label: LABEL_KOMPONEN.kecocokanWaktu,
      nilai: rincian.kecocokanWaktu,
      bobot: BOBOT.kecocokanWaktu,
      kontribusi: rincian.kecocokanWaktu * BOBOT.kecocokanWaktu,
    },
    {
      kunci: "skorPercaya",
      label: LABEL_KOMPONEN.skorPercaya,
      nilai: rincian.skorPercaya,
      bobot: BOBOT.skorPercaya,
      kontribusi: rincian.skorPercaya * BOBOT.skorPercaya,
    },
    {
      kunci: "kecocokanHarga",
      label: LABEL_KOMPONEN.kecocokanHarga,
      nilai: rincian.kecocokanHarga,
      bobot: BOBOT.kecocokanHarga,
      kontribusi: rincian.kecocokanHarga * BOBOT.kecocokanHarga,
    },
    {
      kunci: "penaltiDeviasi",
      label: LABEL_KOMPONEN.penaltiDeviasi,
      nilai: rincian.penaltiDeviasi,
      bobot: -BOBOT.penaltiDeviasi,
      kontribusi: -rincian.penaltiDeviasi * BOBOT.penaltiDeviasi,
    },
  ];
}

/**
 * Menilai satu perjalanan terhadap satu permintaan.
 *
 * Empat aturan gugur diperiksa lebih dulu. Perjalanan yang gugur tetap
 * dikembalikan dengan alasannya, supaya antarmuka dapat menjelaskan mengapa
 * sebuah perjalanan tidak muncul.
 */
export function evaluasiKandidat(
  perjalanan: PerjalananKandidat,
  permintaan: PermintaanPencocokan,
  koridorAktif: KoridorPencocokan,
): HasilPencocokan {
  const kursiTersisa = perjalanan.kursiTersedia - perjalanan.kursiTerpesan;

  const jarakJemputKeRuteKm = jarakTitikKeSegmenKm(
    permintaan.titikJemput,
    perjalanan.asal,
    perjalanan.tujuan,
  );
  const jarakJemputKeRuteM = jarakJemputKeRuteKm * 1000;

  const tambahanJarakKm = hitungTambahanJarakKm(
    perjalanan.asal,
    perjalanan.tujuan,
    permintaan.titikJemput,
    permintaan.titikTurun,
  );

  const jarakRuteAsli = perjalanan.jarakKm > 0 ? perjalanan.jarakKm : haversineKm(perjalanan.asal, perjalanan.tujuan);
  const rasioDeviasi = jarakRuteAsli > 0 ? tambahanJarakKm / jarakRuteAsli : 0;

  const selisihWaktuMenit =
    Math.abs(perjalanan.waktuBerangkat.getTime() - permintaan.waktuDiinginkan.getTime()) / 60000;

  const plafonTarifKoridor = koridorAktif.plafonTarifPerKm * jarakRuteAsli;

  const ukuran = {
    jarakJemputKeRuteM,
    selisihWaktuMenit,
    tambahanJarakKm,
    plafonTarifKoridor,
    kursiTersisa,
  };

  const rincianKosong: RincianSkor = {
    kecocokanRute: 0,
    kecocokanWaktu: 0,
    skorPercaya: 0,
    kecocokanHarga: 0,
    penaltiDeviasi: 0,
  };

  function gugurKarena(alasan: AlasanGugur): HasilPencocokan {
    return {
      tripId: perjalanan.id,
      gugur: true,
      alasanGugur: alasan,
      skor: 0,
      rincian: rincianKosong,
      komponen: susunKomponen(rincianKosong),
      ukuran,
    };
  }

  // Aturan gugur 1. Pengemudi dan penumpang berada di koridor berbeda.
  if (perjalanan.koridorId !== permintaan.koridorId) return gugurKarena("beda-koridor");

  // Aturan gugur 2. Kursi tidak mencukupi.
  if (kursiTersisa < permintaan.kursiDibutuhkan) return gugurKarena("kursi-habis");

  // Aturan gugur 3. Waktu berangkat di luar jam operasional koridor.
  if (!dalamJamOperasional(perjalanan.waktuBerangkat, koridorAktif.jamMulai, koridorAktif.jamSelesai)) {
    return gugurKarena("di-luar-jam-operasional");
  }

  // Aturan gugur 4. Deviasi melebihi batas koridor.
  if (rasioDeviasi > koridorAktif.batasDeviasiPersen / 100) {
    return gugurKarena("deviasi-melebihi-batas");
  }

  const rincian: RincianSkor = {
    kecocokanRute: batasiSatuan(1 - jarakJemputKeRuteM / koridorAktif.radiusJemputM),
    kecocokanWaktu: batasiSatuan(1 - selisihWaktuMenit / permintaan.toleransiMenit),
    skorPercaya: batasiSatuan(perjalanan.skorPercayaProfil / 100),
    kecocokanHarga: batasiSatuan(
      plafonTarifKoridor > 0 ? 1 - perjalanan.tarifPerKursi / plafonTarifKoridor : 1,
    ),
    penaltiDeviasi: batasiSatuan(rasioDeviasi),
  };

  const komponen = susunKomponen(rincian);
  const skor = komponen.reduce((jumlah, k) => jumlah + k.kontribusi, 0);

  return {
    tripId: perjalanan.id,
    gugur: false,
    alasanGugur: null,
    skor,
    rincian,
    komponen,
    ukuran,
  };
}

/**
 * Menilai banyak perjalanan sekaligus lalu mengurutkannya dari skor tertinggi.
 * Perjalanan yang gugur tidak ikut dikembalikan.
 */
export function cocokkanPerjalanan(
  daftar: PerjalananKandidat[],
  permintaan: PermintaanPencocokan,
  koridorAktif: KoridorPencocokan,
): HasilPencocokan[] {
  return daftar
    .map((perjalanan) => evaluasiKandidat(perjalanan, permintaan, koridorAktif))
    .filter((hasil) => !hasil.gugur)
    .sort((a, b) => b.skor - a.skor);
}
