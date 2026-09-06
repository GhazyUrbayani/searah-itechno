/**
 * Perhitungan Ledger Dampak.
 *
 * Seluruh isi berkas ini adalah fungsi murni. Nilai parameter tidak
 * ditanamkan di dalam kode, melainkan dibaca dari tabel parameter_dampak dan
 * diteruskan sebagai argumen, supaya angkanya dapat dikoreksi tanpa deploy
 * ulang dan sumbernya dapat ditampilkan kepada pengguna.
 */

/** Versi rumus. Disimpan bersama setiap baris ledger agar hasil lama tertelusur. */
export const VERSI_RUMUS_DAMPAK = "dampak-1.0.0";

export const KUNCI_PARAMETER = {
  faktorEmisiBensin: "faktor_emisi_bensin",
  hargaBbmPerLiter: "harga_bbm_per_liter",
  faktorPengalihanModa: "faktor_pengalihan_moda",
  konsumsiDefault: "konsumsi_default",
} as const;

export interface BarisParameter {
  kunci: string;
  nilai: number;
  satuan: string;
  sumber: string;
}

/**
 * Nilai bawaan parameter dampak beserta sumbernya.
 *
 * Baris ini dimasukkan ke basis data oleh skrip seed. Sumber dicantumkan agar
 * panel cara hitung di antarmuka dapat menampilkannya apa adanya.
 */
export const PARAMETER_BAWAAN: BarisParameter[] = [
  {
    kunci: KUNCI_PARAMETER.faktorEmisiBensin,
    nilai: 2.32,
    satuan: "kg CO2e per liter",
    sumber: "National Greenhouse and Energy Reporting Determination, Pemerintah Australia, 2024",
  },
  {
    kunci: KUNCI_PARAMETER.hargaBbmPerLiter,
    nilai: 10000,
    satuan: "rupiah",
    sumber: "Harga acuan bahan bakar bersubsidi, diisi ulang berkala",
  },
  {
    kunci: KUNCI_PARAMETER.faktorPengalihanModa,
    nilai: 0.6,
    satuan: "rasio",
    sumber: "Asumsi proyek, belum divalidasi lapangan",
  },
  {
    kunci: KUNCI_PARAMETER.konsumsiDefault,
    nilai: 12,
    satuan: "km per liter",
    sumber: "Dipakai bila pengemudi tidak mengisi data kendaraan",
  },
];

export interface ParameterDampakTerpakai {
  faktorEmisiBensin: number;
  hargaBbmPerLiter: number;
  faktorPengalihanModa: number;
  konsumsiDefault: number;
}

export interface HasilDampak {
  jarakKm: number;
  konsumsiKmPerLiterTerpakai: number;
  literDihemat: number;
  kgCo2eDihemat: number;
  rupiahDihemat: number;
  versiRumus: string;
}

export interface MingguanDampak {
  minggu: string;
  literDihemat: number;
  kgCo2eDihemat: number;
  rupiahDihemat: number;
  jumlahPerjalanan: number;
}

export interface AgregatDampak {
  totalPerjalanan: number;
  totalLiterDihemat: number;
  totalKgCo2eDihemat: number;
  totalRupiahDihemat: number;
  mingguan: MingguanDampak[];
}

/**
 * Menghitung penghematan satu perjalanan yang sudah selesai.
 *
 * Angka 0,6 pada faktor pengalihan moda berarti kami mengasumsikan enam dari
 * sepuluh penumpang akan mengemudi sendiri jika Searah tidak ada. Asumsi itu
 * belum divalidasi lewat survei lapangan.
 *
 * Konsumsi bahan bakar diambil dari data kendaraan pengemudi. Bila kosong atau
 * tidak masuk akal, nilai bawaan dipakai. Konsumsi nol akan menghasilkan
 * pembagian dengan nol, jadi kasus itu ditangani lebih dulu.
 */
export function hitungDampak(masukan: {
  jarakKm: number;
  konsumsiKmPerLiter: number | null | undefined;
  parameter: ParameterDampakTerpakai;
}): HasilDampak {
  const { parameter } = masukan;

  const konsumsiMasuk = masukan.konsumsiKmPerLiter;
  const konsumsiTerpakai =
    konsumsiMasuk !== null && konsumsiMasuk !== undefined && konsumsiMasuk > 0
      ? konsumsiMasuk
      : parameter.konsumsiDefault;

  const jarakKm = masukan.jarakKm > 0 ? masukan.jarakKm : 0;

  // Konsumsi bawaan pun dapat bernilai nol bila baris parameter salah isi.
  // Tanpa penjagaan ini, hasilnya menjadi Infinity dan tersimpan permanen.
  const literDihemat =
    konsumsiTerpakai > 0 ? (jarakKm / konsumsiTerpakai) * parameter.faktorPengalihanModa : 0;

  return {
    jarakKm,
    konsumsiKmPerLiterTerpakai: konsumsiTerpakai,
    literDihemat,
    kgCo2eDihemat: literDihemat * parameter.faktorEmisiBensin,
    rupiahDihemat: literDihemat * parameter.hargaBbmPerLiter,
    versiRumus: VERSI_RUMUS_DAMPAK,
  };
}
