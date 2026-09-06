import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { hashKataSandi } from "./auth";
import { haversineKm } from "../shared/matching";
import { hitungDampak, PARAMETER_BAWAAN, VERSI_RUMUS_DAMPAK, KUNCI_PARAMETER } from "../shared/dampak";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur di lingkungan.");
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Memulai pengisian data awal (seed) SeArah...");

  // 1. Bersihkan seluruh tabel
  console.log("- Membersihkan tabel...");
  await sql`
    TRUNCATE TABLE
      ledger_dampak,
      ratings,
      incidents,
      bookings,
      trips,
      kendaraan,
      session,
      users,
      koridor,
      institusi,
      parameter_dampak
    RESTART IDENTITY CASCADE;
  `;

  // 2. Parameter Dampak (4 baris)
  console.log("- Memasukkan parameter dampak...");
  for (const p of PARAMETER_BAWAAN) {
    await sql`
      INSERT INTO parameter_dampak (kunci, nilai, satuan, sumber)
      VALUES (${p.kunci}, ${p.nilai}, ${p.satuan}, ${p.sumber});
    `;
  }

  // 3. Institusi (2 institusi)
  console.log("- Memasukkan institusi...");
  const [ui] = await sql`
    INSERT INTO institusi (nama, domain_email, kas_solidaritas_rupiah)
    VALUES (
      'Universitas Indonesia',
      'ui.ac.id',
      500000
    ) RETURNING id;
  `;

  const [itb] = await sql`
    INSERT INTO institusi (nama, domain_email, kas_solidaritas_rupiah)
    VALUES (
      'Institut Teknologi Bandung',
      'itb.ac.id',
      750000
    ) RETURNING id;
  `;

  // 4. Koridor (3 koridor)
  console.log("- Memasukkan koridor...");
  const [k1] = await sql`
    INSERT INTO koridor (
      institusi_id, nama,
      asal_nama, asal_lat, asal_lng,
      tujuan_nama, tujuan_lat, tujuan_lng,
      radius_jemput_m, batas_deviasi_persen,
      plafon_tarif_per_km, jam_mulai, jam_selesai, aktif
    ) VALUES (
      ${ui.id},
      'Stasiun Pondok Cina - FT UI',
      'Stasiun Pondok Cina', -6.3688, 106.8327,
      'Fakultas Teknik UI', -6.3615, 106.8242,
      800, 20,
      3000, '06:00', '21:00', true
    ) RETURNING id, plafon_tarif_per_km;
  `;

  const [k2] = await sql`
    INSERT INTO koridor (
      institusi_id, nama,
      asal_nama, asal_lat, asal_lng,
      tujuan_nama, tujuan_lat, tujuan_lng,
      radius_jemput_m, batas_deviasi_persen,
      plafon_tarif_per_km, jam_mulai, jam_selesai, aktif
    ) VALUES (
      ${ui.id},
      'MRT Fatmawati - Kampus UI Depok',
      'Stasiun MRT Fatmawati', -6.2926, 106.7938,
      'Pusat Administrasi Kampus UI', -6.3644, 106.8286,
      1000, 25,
      2500, '06:00', '22:00', true
    ) RETURNING id, plafon_tarif_per_km;
  `;

  const [k3] = await sql`
    INSERT INTO koridor (
      institusi_id, nama,
      asal_nama, asal_lat, asal_lng,
      tujuan_nama, tujuan_lat, tujuan_lng,
      radius_jemput_m, batas_deviasi_persen,
      plafon_tarif_per_km, jam_mulai, jam_selesai, aktif
    ) VALUES (
      ${itb.id},
      'ITB Ganesha - ITB Jatinangor',
      'ITB Kampus Ganesha', -6.8915, 107.6107,
      'ITB Kampus Jatinangor', -6.9298, 107.7719,
      1200, 15,
      2000, '05:30', '20:00', true
    ) RETURNING id, plafon_tarif_per_km;
  `;

  // 5. Pengguna (12 pengguna, kata sandi searah123, 3 bersubsidi)
  console.log("- Memasukkan 12 pengguna (termasuk 3 akun demo)...");
  const passwordHash = await hashKataSandi("searah123");

  const daftarPengguna = [
    // Demo Driver
    { name: "Budi Santoso", phone: "081234567801", email: "driver@searah.id", role: "driver", cat: "regular", ktp: true, sim: true, trust: 4.9, trips: 22, instId: ui.id, tarif: "normal", gender: "male" },
    // Demo Passenger
    { name: "Siti Rahmawati", phone: "081234567802", email: "passenger@searah.id", role: "passenger", cat: "regular", ktp: true, sim: false, trust: 4.8, trips: 15, instId: ui.id, tarif: "normal", gender: "female" },
    // Demo Admin
    { name: "Admin SeArah", phone: "081234567803", email: "admin@searah.id", role: "admin", cat: "premium", ktp: true, sim: true, trust: 5.0, trips: 0, instId: ui.id, tarif: "normal", gender: "male" },
    // Pengemudi lainnya
    { name: "Andi Pratama", phone: "081234567804", email: "andi.driver@ui.ac.id", role: "driver", cat: "regular", ktp: true, sim: true, trust: 4.7, trips: 14, instId: ui.id, tarif: "normal", gender: "male" },
    { name: "Dewi Lestari", phone: "081234567805", email: "dewi.driver@itb.ac.id", role: "driver", cat: "regular", ktp: true, sim: true, trust: 5.0, trips: 30, instId: itb.id, tarif: "normal", gender: "female" },
    { name: "Fajar Nugraha", phone: "081234567806", email: "fajar.driver@itb.ac.id", role: "driver", cat: "regular", ktp: true, sim: true, trust: 4.6, trips: 9, instId: itb.id, tarif: "normal", gender: "male" },
    { name: "Hendra Wijaya", phone: "081234567812", email: "hendra.dosen@ui.ac.id", role: "driver", cat: "regular", ktp: true, sim: true, trust: 4.9, trips: 25, instId: ui.id, tarif: "normal", gender: "male" },
    // Penumpang bersubsidi (3 orang)
    { name: "Rina Anggraini", phone: "081234567807", email: "rina.subsidi@ui.ac.id", role: "passenger", cat: "social", ktp: true, sim: false, trust: 4.9, trips: 11, instId: ui.id, tarif: "bersubsidi", gender: "female" },
    { name: "Eka Saputra", phone: "081234567808", email: "eka.subsidi@itb.ac.id", role: "passenger", cat: "social", ktp: true, sim: false, trust: 4.5, trips: 8, instId: itb.id, tarif: "bersubsidi", gender: "male" },
    { name: "Maya Wulandari", phone: "081234567809", email: "maya.subsidi@ui.ac.id", role: "passenger", cat: "social", ktp: true, sim: false, trust: 4.8, trips: 16, instId: ui.id, tarif: "bersubsidi", gender: "female" },
    // Penumpang reguler lainnya
    { name: "Rizky Ramadhan", phone: "081234567810", email: "rizky.mhs@ui.ac.id", role: "passenger", cat: "regular", ktp: true, sim: false, trust: 4.6, trips: 7, instId: ui.id, tarif: "normal", gender: "male" },
    { name: "Nadia Putri", phone: "081234567811", email: "nadia.mhs@itb.ac.id", role: "passenger", cat: "regular", ktp: true, sim: false, trust: 4.7, trips: 13, instId: itb.id, tarif: "normal", gender: "female" },
  ];

  const userIds: Record<string, number> = {};
  for (const u of daftarPengguna) {
    const [row] = await sql`
      INSERT INTO users (
        name, phone, email, password_hash, role, category,
        ktp_verified, sim_verified, trust_score, total_trips,
        gender, institusi_id, tarif_kategori, is_active, is_suspended
      ) VALUES (
        ${u.name}, ${u.phone}, ${u.email}, ${passwordHash}, ${u.role}, ${u.cat},
        ${u.ktp}, ${u.sim}, ${u.trust}, ${u.trips},
        ${u.gender}, ${u.instId}, ${u.tarif}, true, false
      ) RETURNING id;
    `;
    userIds[u.email] = row.id;
  }

  // 6. Kendaraan (8 kendaraan)
  console.log("- Memasukkan 8 kendaraan...");
  const daftarKendaraan = [
    { pemilik: "driver@searah.id", plat: "B 14** TZQ", merek: "Toyota Avanza 2022", konsumsi: 13.5, kursi: 4 },
    { pemilik: "driver@searah.id", plat: "B 38** EFP", merek: "Honda Vario 160", konsumsi: 45.0, kursi: 1 },
    { pemilik: "andi.driver@ui.ac.id", plat: "B 21** GHM", merek: "Daihatsu Sigra 2021", konsumsi: 15.0, kursi: 4 },
    { pemilik: "dewi.driver@itb.ac.id", plat: "D 17** KLO", merek: "Honda Brio 2023", konsumsi: 16.5, kursi: 3 },
    { pemilik: "dewi.driver@itb.ac.id", plat: "D 19** HYB", merek: "Toyota Yaris Cross", konsumsi: 22.0, kursi: 4 },
    { pemilik: "fajar.driver@itb.ac.id", plat: "D 11** ERT", merek: "Suzuki Ertiga 2020", konsumsi: 12.5, kursi: 4 },
    { pemilik: "hendra.dosen@ui.ac.id", plat: "B 10** HRV", merek: "Honda HR-V 2022", konsumsi: 14.0, kursi: 4 },
    { pemilik: "hendra.dosen@ui.ac.id", plat: "B 24** EVN", merek: "Wuling Binguo EV", konsumsi: 35.0, kursi: 3 },
  ];

  const kendaraanIds: number[] = [];
  const driverKendaraanMap: Record<number, number> = {};
  for (const k of daftarKendaraan) {
    const pemilikId = userIds[k.pemilik];
    const [row] = await sql`
      INSERT INTO kendaraan (
        pemilik_id, plat_disamarkan, merek, konsumsi_km_per_liter,
        kursi_total, status_verifikasi
      ) VALUES (
        ${pemilikId}, ${k.plat}, ${k.merek}, ${k.konsumsi},
        ${k.kursi}, 'terverifikasi'
      ) RETURNING id;
    `;
    kendaraanIds.push(row.id);
    if (!driverKendaraanMap[pemilikId]) {
      driverKendaraanMap[pemilikId] = row.id;
    }
  }

  // 7. Perjalanan (25 perjalanan: 18 masa lalu selesai, 7 masa depan/hari ini)
  console.log("- Memasukkan 25 perjalanan dan pemesanan...");
  const driverEmails = [
    "driver@searah.id",
    "andi.driver@ui.ac.id",
    "dewi.driver@itb.ac.id",
    "fajar.driver@itb.ac.id",
    "hendra.dosen@ui.ac.id",
  ];

  const koridorRows = [k1, k2, k3];
  const penumpangEmails = [
    "passenger@searah.id",
    "rina.subsidi@ui.ac.id",
    "eka.subsidi@itb.ac.id",
    "maya.subsidi@ui.ac.id",
    "rizky.mhs@ui.ac.id",
    "nadia.mhs@itb.ac.id",
  ];

  const now = new Date();
  let totalBookings = 0;
  let totalCompletedBookings = 0;

  // Parameter terpakai untuk perhitungan ledger
  const parameterDampak = {
    faktorEmisiBensin: 2.32,
    hargaBbmPerLiter: 10000,
    faktorPengalihanModa: 0.6,
    konsumsiDefault: 12,
  };

  // Buat 18 perjalanan masa lalu (antara 7 hari lalu s.d. kemarin)
  for (let i = 1; i <= 18; i++) {
    const driverEmail = driverEmails[(i - 1) % driverEmails.length];
    const driverId = userIds[driverEmail];
    const koridor = koridorRows[(i - 1) % koridorRows.length];
    const kendaraanId = driverKendaraanMap[driverId];

    // Selang hari ke belakang: 1 sampai 7 hari lalu
    const hariKeBelakang = 1 + (i % 7);
    const departureTime = new Date(now.getTime() - hariKeBelakang * 24 * 60 * 60 * 1000 + (i * 37) * 60 * 1000);

    // Hitung jarak koridor
    const jarakKm = koridor.id === k1.id ? 1.4 : koridor.id === k2.id ? 8.6 : 18.2;
    // Tarif mematuhi plafon
    const batasTarif = Math.floor(jarakKm * koridor.plafon_tarif_per_km);
    const mode = i % 4 === 0 ? "social" : "cost-sharing";
    const pricePerSeat = mode === "social" ? 0 : Math.min(batasTarif, Math.round((batasTarif * 0.7) / 1000) * 1000);

    const [tripRow] = await sql`
      INSERT INTO trips (
        driver_id, koridor_id, kendaraan_id,
        origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        departure_time, available_seats, booked_seats,
        price_mode, price_per_seat, max_deviation_km,
        gender_preference, status, jarak_km, notes, created_at
      ) VALUES (
        ${driverId}, ${koridor.id}, ${kendaraanId},
        'Titik Jemput ' || ${koridor.id}, -6.36, 106.82,
        'Titik Antar ' || ${koridor.id}, -6.37, 106.83,
        ${departureTime.toISOString()}, 4, 2,
        ${mode}, ${pricePerSeat}, 2.0,
        'any', 'completed', ${jarakKm}, 'Perjalanan rutin selesai', ${departureTime.toISOString()}
      ) RETURNING id;
    `;

    // Untuk setiap trip masa lalu, buat 2 bookings berstatus completed
    for (let b = 0; b < 2; b++) {
      const pEmail = penumpangEmails[(i + b) % penumpangEmails.length];
      const passengerId = userIds[pEmail];

      const [bookingRow] = await sql`
        INSERT INTO bookings (
          trip_id, passenger_id, pickup_name, pickup_lat, pickup_lng,
          seats_booked, total_price, status, payment_status, created_at
        ) VALUES (
          ${tripRow.id}, ${passengerId}, 'Halte Gerbang ' || ${b + 1}, -6.36, 106.82,
          1, ${pricePerSeat}, 'completed', 'paid', ${departureTime.toISOString()}
        ) RETURNING id;
      `;
      totalBookings++;
      totalCompletedBookings++;

      // Hitung dan catat ledger dampak untuk pemesanan selesai
      const hasil = hitungDampak({
        jarakKm,
        konsumsiKmPerLiter: 14.0, // konsumsi rata-rata kendaraan
        parameter: parameterDampak,
      });

      await sql`
        INSERT INTO ledger_dampak (
          booking_id, jarak_km, liter_dihemat, kg_co2e_dihemat,
          rupiah_dihemat, versi_rumus, created_at
        ) VALUES (
          ${bookingRow.id}, ${hasil.jarakKm}, ${hasil.literDihemat},
          ${hasil.kgCo2eDihemat}, ${hasil.rupiahDihemat},
          ${hasil.versiRumus}, ${departureTime.toISOString()}
        );
      `;
    }
  }

  // Buat 7 perjalanan aktif (hari ini dan 3 hari ke depan)
  // Mematuhi trigger maksimal 2 perjalanan aktif per hari per pengemudi!
  for (let j = 1; j <= 7; j++) {
    const driverEmail = driverEmails[(j - 1) % driverEmails.length];
    const driverId = userIds[driverEmail];
    const koridor = koridorRows[(j - 1) % koridorRows.length];
    const kendaraanId = driverKendaraanMap[driverId];

    // Jadwalkan 1 sampai 3 hari ke depan
    const hariKedepan = Math.floor((j - 1) / 2);
    const departureTime = new Date(now.getTime() + (hariKedepan * 24 + 8 + (j % 5)) * 60 * 60 * 1000);

    const jarakKm = koridor.id === k1.id ? 1.4 : koridor.id === k2.id ? 8.6 : 18.2;
    const batasTarif = Math.floor(jarakKm * koridor.plafon_tarif_per_km);
    const pricePerSeat = Math.min(batasTarif, Math.round((batasTarif * 0.75) / 1000) * 1000);

    const [tripRow] = await sql`
      INSERT INTO trips (
        driver_id, koridor_id, kendaraan_id,
        origin_name, origin_lat, origin_lng,
        destination_name, destination_lat, destination_lng,
        departure_time, available_seats, booked_seats,
        price_mode, price_per_seat, max_deviation_km,
        gender_preference, status, jarak_km, notes, created_at
      ) VALUES (
        ${driverId}, ${koridor.id}, ${kendaraanId},
        'Titik Berangkat ' || ${koridor.id}, -6.36, 106.82,
        'Titik Tujuan ' || ${koridor.id}, -6.37, 106.83,
        ${departureTime.toISOString()}, 4, 1,
        'cost-sharing', ${pricePerSeat}, 2.0,
        'any', 'open', ${jarakKm}, 'Tersedia kursi kosong', ${now.toISOString()}
      ) RETURNING id;
    `;

    // Buat 1 booking aktif (confirmed atau pending)
    if (j <= 4) {
      const pEmail = penumpangEmails[j % penumpangEmails.length];
      const passengerId = userIds[pEmail];
      await sql`
        INSERT INTO bookings (
          trip_id, passenger_id, pickup_name, pickup_lat, pickup_lng,
          seats_booked, total_price, status, payment_status, created_at
        ) VALUES (
          ${tripRow.id}, ${passengerId}, 'Titik Temu Kampus', -6.36, 106.82,
          1, ${pricePerSeat}, 'confirmed', 'unpaid', ${now.toISOString()}
        );
      `;
      totalBookings++;
    }
  }

  console.log("Pengisian data awal selesai:");
  console.log(`- Institusi: 2`);
  console.log(`- Koridor: 3`);
  console.log(`- Pengguna: 12 (3 akun demo: driver@searah.id, passenger@searah.id, admin@searah.id)`);
  console.log(`- Kendaraan: 8`);
  console.log(`- Perjalanan: 25 (18 masa lalu selesai, 7 aktif masa depan)`);
  console.log(`- Pemesanan: ${totalBookings} (${totalCompletedBookings} selesai dengan entri ledger dampak)`);
}

main().catch((err) => {
  console.error("Gagal menjalankan seed:", err);
  process.exit(1);
});
