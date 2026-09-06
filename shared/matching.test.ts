import { describe, expect, it } from "vitest";
import {
  BOBOT,
  batasiSatuan,
  cocokkanPerjalanan,
  dalamJamOperasional,
  evaluasiKandidat,
  haversineKm,
  hitungSkorPercayaProfil,
  hitungTambahanJarakKm,
  jamKeMenit,
  jarakTitikKeSegmenKm,
  menitDalamHariWib,
  posisiSepanjangSegmen,
  type KoridorPencocokan,
  type PerjalananKandidat,
  type PermintaanPencocokan,
} from "./matching";

// ─── Data uji ────────────────────────────────────────────────────────────────
// Rute uji dibuat lurus di sepanjang satu garis bujur supaya jaraknya dapat
// diperiksa dengan tangan. Satu derajat lintang setara 111,195 kilometer.

const ASAL = { lat: 0, lng: 0 };
const TUJUAN = { lat: 0.09, lng: 0 }; // sekitar 10 km ke utara

const KORIDOR: KoridorPencocokan = {
  id: 1,
  radiusJemputM: 800,
  batasDeviasiPersen: 20,
  plafonTarifPerKm: 2000,
  jamMulai: "05:00",
  jamSelesai: "22:00",
};

/** 2026-09-08 pukul 07:00 WIB, yaitu 2026-09-08 pukul 00:00 UTC. */
const BERANGKAT = new Date(Date.UTC(2026, 8, 8, 0, 0, 0));

function perjalanan(ubah: Partial<PerjalananKandidat> = {}): PerjalananKandidat {
  return {
    id: 1,
    koridorId: 1,
    asal: ASAL,
    tujuan: TUJUAN,
    waktuBerangkat: BERANGKAT,
    kursiTersedia: 3,
    kursiTerpesan: 0,
    tarifPerKursi: 5000,
    jarakKm: haversineKm(ASAL, TUJUAN),
    skorPercayaProfil: 100,
    ...ubah,
  };
}

function permintaan(ubah: Partial<PermintaanPencocokan> = {}): PermintaanPencocokan {
  return {
    koridorId: 1,
    titikJemput: { lat: 0.03, lng: 0 },
    titikTurun: { lat: 0.07, lng: 0 },
    waktuDiinginkan: BERANGKAT,
    kursiDibutuhkan: 1,
    toleransiMenit: 45,
    ...ubah,
  };
}

// ─── Geometri ────────────────────────────────────────────────────────────────

describe("geometri", () => {
  it("menghitung jarak satu derajat lintang mendekati 111,195 km", () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.195, 2);
  });

  it("mengembalikan jarak nol untuk dua titik yang sama", () => {
    expect(haversineKm(ASAL, ASAL)).toBe(0);
  });

  it("memproyeksikan titik di tengah rute ke posisi relatif 0,5", () => {
    expect(posisiSepanjangSegmen({ lat: 0.045, lng: 0 }, ASAL, TUJUAN)).toBeCloseTo(0.5, 6);
  });

  it("membatasi posisi relatif ke rentang nol sampai satu untuk titik di luar segmen", () => {
    expect(posisiSepanjangSegmen({ lat: -1, lng: 0 }, ASAL, TUJUAN)).toBe(0);
    expect(posisiSepanjangSegmen({ lat: 5, lng: 0 }, ASAL, TUJUAN)).toBe(1);
  });

  it("mengembalikan jarak nol untuk titik yang tepat berada di garis rute", () => {
    expect(jarakTitikKeSegmenKm({ lat: 0.05, lng: 0 }, ASAL, TUJUAN)).toBeCloseTo(0, 6);
  });

  it("tidak pernah menghasilkan tambahan jarak negatif", () => {
    const tambahan = hitungTambahanJarakKm(ASAL, TUJUAN, { lat: 0.03, lng: 0 }, { lat: 0.07, lng: 0 });
    expect(tambahan).toBeGreaterThanOrEqual(0);
    expect(tambahan).toBeCloseTo(0, 6);
  });
});

// ─── Waktu ───────────────────────────────────────────────────────────────────

describe("jam operasional", () => {
  it("mengubah HH:MM menjadi menit sejak tengah malam", () => {
    expect(jamKeMenit("05:00")).toBe(300);
    expect(jamKeMenit("22:30")).toBe(1350);
  });

  it("menolak format jam yang tidak dikenali", () => {
    expect(() => jamKeMenit("25:00")).toThrow();
    expect(() => jamKeMenit("pagi")).toThrow();
  });

  it("membaca stempel waktu UTC sebagai menit WIB", () => {
    expect(menitDalamHariWib(new Date(Date.UTC(2026, 8, 8, 0, 0)))).toBe(7 * 60);
  });

  it("menerima waktu tepat di batas awal dan batas akhir jam operasional", () => {
    const tepatMulai = new Date(Date.UTC(2026, 8, 7, 22, 0)); // 05:00 WIB
    const tepatSelesai = new Date(Date.UTC(2026, 8, 8, 15, 0)); // 22:00 WIB
    expect(dalamJamOperasional(tepatMulai, "05:00", "22:00")).toBe(true);
    expect(dalamJamOperasional(tepatSelesai, "05:00", "22:00")).toBe(true);
  });

  it("menolak waktu satu menit sebelum jam operasional dimulai", () => {
    const sebelumMulai = new Date(Date.UTC(2026, 8, 7, 21, 59)); // 04:59 WIB
    expect(dalamJamOperasional(sebelumMulai, "05:00", "22:00")).toBe(false);
  });

  it("menangani rentang jam yang melewati tengah malam", () => {
    const tengahMalam = new Date(Date.UTC(2026, 8, 7, 17, 30)); // 00:30 WIB
    expect(dalamJamOperasional(tengahMalam, "22:00", "05:00")).toBe(true);
  });
});

// ─── Aturan gugur ────────────────────────────────────────────────────────────

describe("aturan gugur", () => {
  it("menggugurkan perjalanan dari koridor yang berbeda", () => {
    const hasil = evaluasiKandidat(perjalanan({ koridorId: 2 }), permintaan(), KORIDOR);
    expect(hasil.gugur).toBe(true);
    expect(hasil.alasanGugur).toBe("beda-koridor");
  });

  it("menerima pemesanan pada kursi terakhir", () => {
    const hasil = evaluasiKandidat(
      perjalanan({ kursiTersedia: 3, kursiTerpesan: 2 }),
      permintaan({ kursiDibutuhkan: 1 }),
      KORIDOR,
    );
    expect(hasil.gugur).toBe(false);
    expect(hasil.ukuran.kursiTersisa).toBe(1);
  });

  it("menggugurkan perjalanan yang kursinya sudah nol", () => {
    const hasil = evaluasiKandidat(
      perjalanan({ kursiTersedia: 3, kursiTerpesan: 3 }),
      permintaan(),
      KORIDOR,
    );
    expect(hasil.gugur).toBe(true);
    expect(hasil.alasanGugur).toBe("kursi-habis");
  });

  it("menggugurkan permintaan dua kursi ketika hanya satu yang tersisa", () => {
    const hasil = evaluasiKandidat(
      perjalanan({ kursiTersedia: 3, kursiTerpesan: 2 }),
      permintaan({ kursiDibutuhkan: 2 }),
      KORIDOR,
    );
    expect(hasil.alasanGugur).toBe("kursi-habis");
  });

  it("menggugurkan perjalanan yang berangkat di luar jam operasional koridor", () => {
    const subuh = new Date(Date.UTC(2026, 8, 7, 20, 0)); // 03:00 WIB
    const hasil = evaluasiKandidat(perjalanan({ waktuBerangkat: subuh }), permintaan({ waktuDiinginkan: subuh }), KORIDOR);
    expect(hasil.gugur).toBe(true);
    expect(hasil.alasanGugur).toBe("di-luar-jam-operasional");
  });

  it("menerima deviasi yang tepat berada di ambang koridor", () => {
    // Titik jemput digeser ke samping rute sehingga menimbulkan deviasi.
    const jemput = { lat: 0.03, lng: 0.004 };
    const turun = { lat: 0.07, lng: 0 };
    const tambahan = hitungTambahanJarakKm(ASAL, TUJUAN, jemput, turun);
    const rasioPersen = (tambahan / haversineKm(ASAL, TUJUAN)) * 100;

    const hasil = evaluasiKandidat(
      perjalanan(),
      permintaan({ titikJemput: jemput, titikTurun: turun }),
      { ...KORIDOR, batasDeviasiPersen: rasioPersen },
    );
    expect(hasil.gugur).toBe(false);
  });

  it("menggugurkan deviasi satu persen di atas ambang koridor", () => {
    const jemput = { lat: 0.03, lng: 0.004 };
    const turun = { lat: 0.07, lng: 0 };
    const tambahan = hitungTambahanJarakKm(ASAL, TUJUAN, jemput, turun);
    const rasioPersen = (tambahan / haversineKm(ASAL, TUJUAN)) * 100;

    const hasil = evaluasiKandidat(
      perjalanan(),
      permintaan({ titikJemput: jemput, titikTurun: turun }),
      { ...KORIDOR, batasDeviasiPersen: rasioPersen - 1 },
    );
    expect(hasil.gugur).toBe(true);
    expect(hasil.alasanGugur).toBe("deviasi-melebihi-batas");
  });
});

// ─── Skoring ─────────────────────────────────────────────────────────────────

describe("skoring", () => {
  it("membatasi setiap komponen ke rentang nol sampai satu", () => {
    expect(batasiSatuan(-3)).toBe(0);
    expect(batasiSatuan(7)).toBe(1);
    expect(batasiSatuan(Number.NaN)).toBe(0);
  });

  it("memberi skor kepercayaan nol untuk pengemudi tanpa riwayat dan tanpa verifikasi", () => {
    const profil = hitungSkorPercayaProfil({
      rataRataBintang: 0,
      ktpTerverifikasi: false,
      simTerverifikasi: false,
    });
    expect(profil).toBe(0);

    const hasil = evaluasiKandidat(perjalanan({ skorPercayaProfil: profil }), permintaan(), KORIDOR);
    expect(hasil.rincian.skorPercaya).toBe(0);
    expect(hasil.komponen.find((k) => k.kunci === "skorPercaya")?.kontribusi).toBe(0);
  });

  it("memberi skor kepercayaan penuh untuk lima bintang dengan KTP dan SIM terverifikasi", () => {
    expect(
      hitungSkorPercayaProfil({ rataRataBintang: 5, ktpTerverifikasi: true, simTerverifikasi: true }),
    ).toBe(100);
  });

  it("memberi kecocokan waktu nol ketika selisih waktu sama dengan toleransi", () => {
    const telat = new Date(BERANGKAT.getTime() + 45 * 60000);
    const hasil = evaluasiKandidat(perjalanan(), permintaan({ waktuDiinginkan: telat }), KORIDOR);
    expect(hasil.rincian.kecocokanWaktu).toBe(0);
  });

  it("memberi kecocokan waktu satu ketika waktu berangkat sama persis", () => {
    const hasil = evaluasiKandidat(perjalanan(), permintaan(), KORIDOR);
    expect(hasil.rincian.kecocokanWaktu).toBe(1);
  });

  it("memberi kecocokan harga satu untuk perjalanan gratis", () => {
    const hasil = evaluasiKandidat(perjalanan({ tarifPerKursi: 0 }), permintaan(), KORIDOR);
    expect(hasil.rincian.kecocokanHarga).toBe(1);
  });

  it("memberi kecocokan harga nol ketika tarif menyentuh plafon koridor", () => {
    const jarak = haversineKm(ASAL, TUJUAN);
    const plafon = KORIDOR.plafonTarifPerKm * jarak;
    const hasil = evaluasiKandidat(perjalanan({ tarifPerKursi: plafon }), permintaan(), KORIDOR);
    expect(hasil.rincian.kecocokanHarga).toBe(0);
  });

  it("menghasilkan skor 0,90 untuk perjalanan yang sempurna di semua komponen", () => {
    // Skor maksimum bukan 1. Bobot positif berjumlah 0,90 karena 0,10 sisanya
    // dialokasikan sebagai penalti deviasi yang selalu mengurangi.
    const hasil = evaluasiKandidat(
      perjalanan({ tarifPerKursi: 0, skorPercayaProfil: 100 }),
      permintaan({ titikJemput: { lat: 0.03, lng: 0 }, titikTurun: { lat: 0.07, lng: 0 } }),
      KORIDOR,
    );
    expect(hasil.skor).toBeCloseTo(0.9, 6);
  });

  it("menjumlahkan kontribusi komponen tepat sama dengan skor akhir", () => {
    const hasil = evaluasiKandidat(perjalanan(), permintaan(), KORIDOR);
    const jumlah = hasil.komponen.reduce((total, k) => total + k.kontribusi, 0);
    expect(jumlah).toBeCloseTo(hasil.skor, 12);
  });

  it("memakai bobot positif berjumlah 0,90 dan penalti deviasi 0,10", () => {
    const jumlahPositif =
      BOBOT.kecocokanRute + BOBOT.kecocokanWaktu + BOBOT.skorPercaya + BOBOT.kecocokanHarga;
    expect(jumlahPositif).toBeCloseTo(0.9, 12);
    expect(BOBOT.penaltiDeviasi).toBe(0.1);
    expect(jumlahPositif + BOBOT.penaltiDeviasi).toBeCloseTo(1, 12);
  });
});

// ─── Pengurutan ──────────────────────────────────────────────────────────────

describe("cocokkanPerjalanan", () => {
  it("mengurutkan hasil dari skor tertinggi dan membuang yang gugur", () => {
    const daftar = [
      perjalanan({ id: 1, tarifPerKursi: 15000 }),
      perjalanan({ id: 2, tarifPerKursi: 0 }),
      perjalanan({ id: 3, koridorId: 99 }),
      perjalanan({ id: 4, kursiTersedia: 2, kursiTerpesan: 2 }),
    ];
    const hasil = cocokkanPerjalanan(daftar, permintaan(), KORIDOR);

    expect(hasil.map((h) => h.tripId)).toEqual([2, 1]);
    expect(hasil[0].skor).toBeGreaterThan(hasil[1].skor);
  });

  it("mengembalikan daftar kosong ketika seluruh kandidat gugur", () => {
    const hasil = cocokkanPerjalanan([perjalanan({ koridorId: 99 })], permintaan(), KORIDOR);
    expect(hasil).toEqual([]);
  });
});
