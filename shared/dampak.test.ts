import { describe, expect, it } from "vitest";
import {
  hitungDampak,
  PARAMETER_BAWAAN,
  KUNCI_PARAMETER,
  VERSI_RUMUS_DAMPAK,
  type ParameterDampakTerpakai,
} from "./dampak";

const PARAMETER: ParameterDampakTerpakai = {
  faktorEmisiBensin: 2.32,
  hargaBbmPerLiter: 10000,
  faktorPengalihanModa: 0.6,
  konsumsiDefault: 12,
};

describe("hitungDampak", () => {
  it("menghitung penghematan untuk perjalanan 24 km dengan konsumsi 12 km per liter", () => {
    // 24 / 12 = 2 liter, dikali faktor pengalihan 0,6 menjadi 1,2 liter.
    const hasil = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: 12, parameter: PARAMETER });

    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
    expect(hasil.kgCo2eDihemat).toBeCloseTo(1.2 * 2.32, 10);
    expect(hasil.rupiahDihemat).toBeCloseTo(12000, 10);
    expect(hasil.versiRumus).toBe(VERSI_RUMUS_DAMPAK);
  });

  it("menghasilkan nol untuk jarak nol", () => {
    const hasil = hitungDampak({ jarakKm: 0, konsumsiKmPerLiter: 12, parameter: PARAMETER });

    expect(hasil.literDihemat).toBe(0);
    expect(hasil.kgCo2eDihemat).toBe(0);
    expect(hasil.rupiahDihemat).toBe(0);
  });

  it("memakai konsumsi bawaan ketika data kendaraan kosong", () => {
    const hasil = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: null, parameter: PARAMETER });

    expect(hasil.konsumsiKmPerLiterTerpakai).toBe(12);
    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
  });

  it("memakai konsumsi bawaan ketika konsumsi kendaraan bernilai nol", () => {
    // Pembagian dengan nol akan menghasilkan Infinity dan tersimpan permanen
    // di ledger, jadi kasus ini harus jatuh ke nilai bawaan.
    const hasil = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: 0, parameter: PARAMETER });

    expect(hasil.konsumsiKmPerLiterTerpakai).toBe(12);
    expect(Number.isFinite(hasil.literDihemat)).toBe(true);
    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
  });

  it("menghasilkan nol ketika konsumsi bawaan pun bernilai nol", () => {
    const hasil = hitungDampak({
      jarakKm: 24,
      konsumsiKmPerLiter: 0,
      parameter: { ...PARAMETER, konsumsiDefault: 0 },
    });

    expect(hasil.literDihemat).toBe(0);
    expect(hasil.rupiahDihemat).toBe(0);
  });

  it("memperlakukan jarak negatif sebagai nol", () => {
    const hasil = hitungDampak({ jarakKm: -5, konsumsiKmPerLiter: 12, parameter: PARAMETER });
    expect(hasil.jarakKm).toBe(0);
    expect(hasil.literDihemat).toBe(0);
  });

  it("memakai konsumsi kendaraan yang sesungguhnya ketika tersedia", () => {
    // Kendaraan irit 20 km per liter menghemat lebih sedikit bahan bakar
    // dibanding kendaraan boros pada jarak yang sama.
    const irit = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: 20, parameter: PARAMETER });
    const boros = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: 8, parameter: PARAMETER });

    expect(irit.literDihemat).toBeCloseTo(0.72, 10);
    expect(boros.literDihemat).toBeCloseTo(1.8, 10);
    expect(boros.literDihemat).toBeGreaterThan(irit.literDihemat);
  });

  it("berskala linear terhadap jarak", () => {
    const sekali = hitungDampak({ jarakKm: 10, konsumsiKmPerLiter: 12, parameter: PARAMETER });
    const duaKali = hitungDampak({ jarakKm: 20, konsumsiKmPerLiter: 12, parameter: PARAMETER });
    expect(duaKali.literDihemat).toBeCloseTo(sekali.literDihemat * 2, 10);
  });

  it("memakai konsumsi bawaan ketika konsumsi kendaraan undefined", () => {
    const hasil = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: undefined, parameter: PARAMETER });

    expect(hasil.konsumsiKmPerLiterTerpakai).toBe(12);
    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
  });

  it("memakai konsumsi bawaan ketika konsumsi kendaraan negatif", () => {
    // Nilai negatif tidak masuk akal secara fisika, harus jatuh ke bawaan.
    const hasil = hitungDampak({ jarakKm: 24, konsumsiKmPerLiter: -5, parameter: PARAMETER });

    expect(hasil.konsumsiKmPerLiterTerpakai).toBe(12);
    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
  });

  it("menghasilkan angka tanpa noise floating point yang signifikan", () => {
    // 15 / 10 = 1.5, dikali 0.6 = 0.9 liter.
    // 0.9 * 2.32 = 2.088 kg CO2e.
    // 0.9 * 10000 = 9000 rupiah.
    const hasil = hitungDampak({ jarakKm: 15, konsumsiKmPerLiter: 10, parameter: PARAMETER });

    expect(hasil.literDihemat).toBeCloseTo(0.9, 10);
    expect(hasil.kgCo2eDihemat).toBeCloseTo(2.088, 6);
    expect(hasil.rupiahDihemat).toBeCloseTo(9000, 6);
  });

  it("menghasilkan angka kecil tapi bukan nol untuk jarak sangat pendek", () => {
    const hasil = hitungDampak({ jarakKm: 0.001, konsumsiKmPerLiter: 12, parameter: PARAMETER });

    expect(hasil.literDihemat).toBeGreaterThan(0);
    expect(hasil.literDihemat).toBeLessThan(0.001);
    expect(hasil.jarakKm).toBe(0.001);
  });

  it("menghasilkan seluruh dampak nol ketika faktor pengalihan moda nol", () => {
    const hasil = hitungDampak({
      jarakKm: 24,
      konsumsiKmPerLiter: 12,
      parameter: { ...PARAMETER, faktorPengalihanModa: 0 },
    });

    expect(hasil.literDihemat).toBe(0);
    expect(hasil.kgCo2eDihemat).toBe(0);
    expect(hasil.rupiahDihemat).toBe(0);
  });

  it("menghasilkan rupiahDihemat nol tetapi literDihemat positif ketika harga BBM nol", () => {
    const hasil = hitungDampak({
      jarakKm: 24,
      konsumsiKmPerLiter: 12,
      parameter: { ...PARAMETER, hargaBbmPerLiter: 0 },
    });

    expect(hasil.literDihemat).toBeCloseTo(1.2, 10);
    expect(hasil.kgCo2eDihemat).toBeCloseTo(1.2 * 2.32, 10);
    expect(hasil.rupiahDihemat).toBe(0);
  });
});

describe("parameter bawaan", () => {
  it("memuat empat parameter yang dipakai rumus", () => {
    const kunci = PARAMETER_BAWAAN.map((p) => p.kunci).sort();
    expect(kunci).toEqual(Object.values(KUNCI_PARAMETER).sort());
  });

  it("mencantumkan sumber untuk setiap parameter", () => {
    for (const p of PARAMETER_BAWAAN) {
      expect(p.sumber.length).toBeGreaterThan(10);
      expect(p.satuan.length).toBeGreaterThan(0);
    }
  });

  it("menandai faktor pengalihan moda sebagai asumsi yang belum divalidasi", () => {
    const faktor = PARAMETER_BAWAAN.find((p) => p.kunci === KUNCI_PARAMETER.faktorPengalihanModa);
    expect(faktor?.nilai).toBe(0.6);
    expect(faktor?.sumber).toMatch(/belum divalidasi/i);
  });
});
