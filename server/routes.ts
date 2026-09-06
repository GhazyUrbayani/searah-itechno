import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertTripSchema,
  insertBookingSchema,
  insertRatingSchema,
  insertIncidentSchema,
  loginSchema,
  registerSchema,
} from "@shared/schema";
import type { User } from "@shared/schema";
import {
  haversineKm,
  cocokkanPerjalanan,
  hitungSkorPercayaProfil,
  TOLERANSI_WAKTU_MENIT_BAWAAN,
  BOBOT,
  VERSI_RUMUS_PENCOCOKAN,
  type PerjalananKandidat,
} from "@shared/matching";
import {
  hitungDampak,
  KUNCI_PARAMETER,
  type ParameterDampakTerpakai,
} from "@shared/dampak";
import {
  requireAuth,
  requireRole,
  hashKataSandi,
  cocokkanKataSandi,
  tanpaKataSandi,
  tanpaKontak,
  batasLogin,
  batasPembuatan,
} from "./auth";

const idSchema = z.coerce.number().int().positive();
const statusSchema = z.object({ status: z.string().min(1, "Status wajib diisi") });

/** Membaca satu parameter path sebagai id. Mengirim 400 bila bukan id yang sah. */
function bacaId(req: Request, res: Response, nama: string): number | null {
  const hasil = idSchema.safeParse(req.params[nama]);
  if (!hasil.success) {
    res.status(400).json({ error: `Parameter ${nama} harus berupa angka positif` });
    return null;
  }
  return hasil.data;
}

function kirimGalatValidasi(res: Response, error: z.ZodError) {
  return res.status(400).json({ error: error.flatten() });
}

/** Data pengemudi yang tampil di daftar publik, tanpa nomor telepon dan email. */
function pengemudiPublik(driver: User | null) {
  return driver ? tanpaKontak(driver) : null;
}

/**
 * Mencatat hasil perhitungan penghematan bahan bakar dan emisi ke ledger dampak.
 * Perhitungan hanya dijalankan sekali per pemesanan yang selesai agar angka historis
 * tidak berubah saat parameter dikoreksi di kemudian hari.
 */
async function catatLedgerDampak(bookingId: number) {
  const existingLedger = await storage.getLedgerDampakByBooking(bookingId);
  if (existingLedger) return existingLedger;

  const booking = await storage.getBookingById(bookingId);
  if (!booking) return null;

  const trip = await storage.getTripById(booking.tripId);
  if (!trip) return null;

  let jarakKm = trip.jarakKm ?? 0;
  if (jarakKm <= 0) {
    jarakKm = haversineKm(
      { lat: trip.originLat, lng: trip.originLng },
      { lat: trip.destinationLat, lng: trip.destinationLng }
    );
  }

  let konsumsiKmPerLiter: number | undefined;
  if (trip.kendaraanId) {
    const k = await storage.getKendaraanById(trip.kendaraanId);
    if (k && k.konsumsiKmPerLiter) {
      konsumsiKmPerLiter = k.konsumsiKmPerLiter;
    }
  }

  const paramRows = await storage.getParameterDampak();
  const paramMap = new Map<string, number>();
  for (const p of paramRows) {
    paramMap.set(p.kunci, p.nilai);
  }

  const parameter: ParameterDampakTerpakai = {
    faktorEmisiBensin: paramMap.get(KUNCI_PARAMETER.faktorEmisiBensin) ?? 2.32,
    hargaBbmPerLiter: paramMap.get(KUNCI_PARAMETER.hargaBbmPerLiter) ?? 10000,
    faktorPengalihanModa: paramMap.get(KUNCI_PARAMETER.faktorPengalihanModa) ?? 0.6,
    konsumsiDefault: paramMap.get(KUNCI_PARAMETER.konsumsiDefault) ?? 12,
  };

  const hasil = hitungDampak({
    jarakKm,
    konsumsiKmPerLiter,
    parameter,
  });

  return await storage.createLedgerDampak({
    bookingId,
    jarakKm: hasil.jarakKm,
    literDihemat: hasil.literDihemat,
    kgCo2eDihemat: hasil.kgCo2eDihemat,
    rupiahDihemat: hasil.rupiahDihemat,
    versiRumus: hasil.versiRumus,
  });
}

export async function registerRoutes(app: Express): Promise<void> {
  // ─── Autentikasi ───────────────────────────────────────────────────────────
  app.post("/api/auth/register", batasLogin, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const { email, phone, password, name, role, gender } = parsed.data;

    if (await storage.getUserByEmail(email)) {
      return res.status(409).json({ error: "Email sudah terdaftar. Gunakan email lain atau masuk." });
    }
    if (await storage.getUserByPhone(phone)) {
      return res.status(409).json({ error: "Nomor telepon sudah terdaftar." });
    }

    const user = await storage.createUser({
      name,
      email: email.toLowerCase(),
      phone,
      role,
      gender,
      category: "regular",
      passwordHash: await hashKataSandi(password),
    });

    req.session.userId = user.id;
    res.status(201).json({ user: tanpaKataSandi(user) });
  });

  app.post("/api/auth/login", batasLogin, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const user = await storage.getUserByEmail(parsed.data.email);

    // Pesan yang sama dipakai untuk email tidak terdaftar dan kata sandi salah,
    // supaya penyerang tidak dapat memetakan email mana yang punya akun.
    const ditolak = { error: "Email atau kata sandi salah" };
    if (!user) {
      // Hash tiruan dijalankan agar waktu balasan tidak membocorkan
      // keberadaan akun lewat selisih durasi.
      await cocokkanKataSandi(parsed.data.password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
      return res.status(401).json(ditolak);
    }
    if (!(await cocokkanKataSandi(parsed.data.password, user.passwordHash))) {
      return res.status(401).json(ditolak);
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: "Akun ditangguhkan. Hubungi admin koridor." });
    }

    req.session.userId = user.id;
    res.json({ user: tanpaKataSandi(user) });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("searah.sid");
      res.json({ success: true });
    });
  });

  /** Sumber kebenaran sesi untuk klien. Dipanggil saat halaman dimuat ulang. */
  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: "Belum masuk" });

    const user = await storage.getUserById(userId);
    if (!user) {
      req.session.destroy(() => undefined);
      return res.status(401).json({ error: "Belum masuk" });
    }
    res.json({ user: tanpaKataSandi(user) });
  });

  // ─── Pengguna ──────────────────────────────────────────────────────────────
  // Daftar lengkap pengguna berisi nomor telepon dan email, jadi hanya admin
  // yang boleh membacanya.
  app.get("/api/users", requireAuth, requireRole("admin"), async (_req, res) => {
    const daftar = await storage.getUsers();
    res.json(daftar.map(tanpaKataSandi));
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const user = await storage.getUserById(id);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });

    const peminta = res.locals.user as User;
    const bolehLihatKontak = peminta.role === "admin" || peminta.id === user.id;
    res.json(bolehLihatKontak ? tanpaKataSandi(user) : tanpaKontak(user));
  });

  app.post("/api/users", requireAuth, requireRole("admin"), async (req, res) => {
    const parsed = insertUserSchema.extend({ password: z.string().min(8) }).safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const { password, ...data } = parsed.data;
    const user = await storage.createUser({ ...data, passwordHash: await hashKataSandi(password) });
    res.status(201).json(tanpaKataSandi(user));
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const peminta = res.locals.user as User;
    if (peminta.role !== "admin" && peminta.id !== id) {
      return res.status(403).json({ error: "Hanya pemilik akun dan admin yang boleh mengubah profil ini" });
    }

    // Peran, kategori, dan status verifikasi hanya boleh diubah admin.
    const skemaDiri = insertUserSchema
      .pick({ name: true, gender: true, email: true, phone: true })
      .partial();
    const skema = peminta.role === "admin" ? insertUserSchema.partial() : skemaDiri;

    const parsed = skema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const user = await storage.updateUser(id, parsed.data);
    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });
    res.json(tanpaKataSandi(user));
  });

  app.post("/api/users/:id/suspend", requireAuth, requireRole("admin"), async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;
    await storage.suspendUser(id);
    res.json({ success: true });
  });

  app.get("/api/users/:id/ratings", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;
    res.json(await storage.getRatingsByUser(id));
  });

  // ─── Perjalanan ────────────────────────────────────────────────────────────
  const filterTripSchema = z.object({
    status: z.string().optional(),
    koridorId: z.coerce.number().int().positive().optional(),
    priceMode: z.string().optional(),
  });

  app.get("/api/trips", async (req, res) => {
    const parsed = filterTripSchema.safeParse(req.query);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const daftar = await storage.getTrips(parsed.data);
    res.json(daftar.map((t) => ({ ...t, driver: pengemudiPublik(t.driver) })));
  });

  // ─── Pencocokan ────────────────────────────────────────────────────────────
  const permintaanCocokSchema = z.object({
    koridorId: z.coerce.number().int().positive(),
    jemputLat: z.coerce.number().min(-90).max(90),
    jemputLng: z.coerce.number().min(-180).max(180),
    turunLat: z.coerce.number().min(-90).max(90),
    turunLng: z.coerce.number().min(-180).max(180),
    waktuDiinginkan: z.coerce.date(),
    kursiDibutuhkan: z.coerce.number().int().min(1).max(6).default(1),
    toleransiMenit: z.coerce.number().int().min(5).max(240).default(TOLERANSI_WAKTU_MENIT_BAWAAN),
  });

  /**
   * Mengembalikan perjalanan berperingkat beserta rincian skor tiap komponen.
   * Skoring dikerjakan modul murni di shared/matching.ts, bukan di SQL.
   */
  app.get("/api/trips/match", async (req, res) => {
    const parsed = permintaanCocokSchema.safeParse(req.query);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const p = parsed.data;
    const koridorAktif = await storage.getKoridorById(p.koridorId);
    if (!koridorAktif) return res.status(404).json({ error: "Koridor tidak ditemukan" });

    const daftar = await storage.getTrips({ koridorId: p.koridorId, status: "open" });

    const kandidat: PerjalananKandidat[] = daftar.map((t) => ({
      id: t.id,
      koridorId: t.koridorId,
      asal: { lat: t.originLat, lng: t.originLng },
      tujuan: { lat: t.destinationLat, lng: t.destinationLng },
      waktuBerangkat: new Date(t.departureTime),
      kursiTersedia: t.availableSeats,
      kursiTerpesan: t.bookedSeats,
      tarifPerKursi: t.pricePerSeat,
      jarakKm: t.jarakKm,
      skorPercayaProfil: hitungSkorPercayaProfil({
        rataRataBintang: t.driver?.trustScore ?? 0,
        ktpTerverifikasi: t.driver?.ktpVerified ?? false,
        simTerverifikasi: t.driver?.simVerified ?? false,
      }),
    }));

    const hasil = cocokkanPerjalanan(
      kandidat,
      {
        koridorId: p.koridorId,
        titikJemput: { lat: p.jemputLat, lng: p.jemputLng },
        titikTurun: { lat: p.turunLat, lng: p.turunLng },
        waktuDiinginkan: p.waktuDiinginkan,
        kursiDibutuhkan: p.kursiDibutuhkan,
        toleransiMenit: p.toleransiMenit,
      },
      koridorAktif,
    );

    const perId = new Map(daftar.map((t) => [t.id, t]));
    res.json({
      versiRumus: VERSI_RUMUS_PENCOCOKAN,
      bobot: BOBOT,
      jumlahKandidat: daftar.length,
      jumlahLolos: hasil.length,
      hasil: hasil.map((h) => {
        const trip = perId.get(h.tripId);
        return {
          ...h,
          trip: trip ? { ...trip, driver: pengemudiPublik(trip.driver) } : null,
        };
      }),
    });
  });

  app.get("/api/trips/:id", async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const trip = await storage.getTripById(id);
    if (!trip) return res.status(404).json({ error: "Perjalanan tidak ditemukan" });

    const [driver, daftarPemesanan, koridorAktif] = await Promise.all([
      storage.getUserById(trip.driverId),
      storage.getBookingsByTrip(trip.id),
      storage.getKoridorById(trip.koridorId),
    ]);

    // Rincian pemesanan memuat titik jemput penumpang, jadi hanya pengemudi
    // pemilik perjalanan dan admin yang boleh melihatnya. Yang lain cukup
    // mendapat jumlahnya.
    const peminta = res.locals.user as User | undefined;
    const bolehLihatPemesanan =
      peminta?.role === "admin" || peminta?.id === trip.driverId;

    res.json({
      ...trip,
      driver: pengemudiPublik(driver ?? null),
      koridor: koridorAktif ?? null,
      bookings: bolehLihatPemesanan ? daftarPemesanan : [],
      jumlahPemesanan: daftarPemesanan.length,
    });
  });

  app.post("/api/trips", requireAuth, requireRole("driver", "admin"), batasPembuatan, async (req, res) => {
    // driverId diambil dari sesi, bukan dari badan permintaan, supaya pengguna
    // tidak dapat membuat perjalanan atas nama orang lain. jarakKm dihitung di
    // server supaya klien tidak dapat mengecilkannya untuk menembus plafon tarif.
    const parsed = insertTripSchema.omit({ driverId: true, jarakKm: true }).safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const koridorAktif = await storage.getKoridorById(parsed.data.koridorId);
    if (!koridorAktif) return res.status(404).json({ error: "Koridor tidak ditemukan" });
    if (!koridorAktif.aktif) return res.status(400).json({ error: "Koridor sedang tidak aktif" });

    const peminta = res.locals.user as User;
    const jarakKm = haversineKm(
      { lat: parsed.data.originLat, lng: parsed.data.originLng },
      { lat: parsed.data.destinationLat, lng: parsed.data.destinationLng },
    );

    try {
      const trip = await storage.createTrip({ ...parsed.data, driverId: peminta.id, jarakKm });
      res.status(201).json(trip);
    } catch (galat) {
      // Aturan kepatuhan ditegakkan basis data lewat trigger. Pesan aslinya
      // diteruskan supaya pengguna tahu aturan mana yang dilanggar.
      const pesan = galat instanceof Error ? galat.message : "Perjalanan ditolak basis data";
      return res.status(422).json({ error: pesan, ditolakOleh: "basis data" });
    }
  });

  // ─── Koridor dan institusi ─────────────────────────────────────────────────
  app.get("/api/koridor", async (_req, res) => {
    res.json(await storage.getKoridorList());
  });

  app.get("/api/institusi", async (_req, res) => {
    res.json(await storage.getInstitusiList());
  });

  app.get("/api/kendaraan", requireAuth, async (_req, res) => {
    const peminta = res.locals.user as User;
    res.json(await storage.getKendaraanByPemilik(peminta.id));
  });

  app.patch("/api/trips/:id/status", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const trip = await storage.getTripById(id);
    if (!trip) return res.status(404).json({ error: "Perjalanan tidak ditemukan" });

    const peminta = res.locals.user as User;
    if (peminta.role !== "admin" && peminta.id !== trip.driverId) {
      return res.status(403).json({ error: "Hanya pengemudi pemilik perjalanan yang boleh mengubah status" });
    }

    await storage.updateTripStatus(id, parsed.data.status);
    if (parsed.data.status === "completed") {
      const bookingsForTrip = await storage.getBookingsByTrip(id);
      for (const b of bookingsForTrip) {
        if (b.status === "confirmed" || b.status === "in-progress") {
          await storage.updateBookingStatus(b.id, "completed");
          await catatLedgerDampak(b.id);
        }
      }
    }
    res.json({ success: true });
  });

  app.get("/api/drivers/:driverId/trips", requireAuth, async (req, res) => {
    const driverId = bacaId(req, res, "driverId");
    if (driverId === null) return;
    res.json(await storage.getTripsByDriver(driverId));
  });

  // ─── Pemesanan ─────────────────────────────────────────────────────────────
  app.get("/api/bookings", requireAuth, requireRole("admin"), async (_req, res) => {
    const daftar = await storage.getBookings();
    res.json(daftar.map((b) => ({ ...b, passenger: b.passenger ? tanpaKataSandi(b.passenger) : null })));
  });

  app.post("/api/bookings", requireAuth, batasPembuatan, async (req, res) => {
    // passengerId diambil dari sesi, bukan dari badan permintaan.
    const parsed = insertBookingSchema.omit({ passengerId: true }).safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const peminta = res.locals.user as User;

    const trip = await storage.getTripById(parsed.data.tripId);
    if (!trip) return res.status(404).json({ error: "Perjalanan tidak ditemukan" });
    if (trip.driverId === peminta.id) {
      return res.status(400).json({ error: "Pengemudi tidak dapat memesan kursi di perjalanannya sendiri" });
    }
    if (trip.status === "full" || trip.status === "cancelled") {
      return res.status(400).json({ error: "Perjalanan tidak tersedia" });
    }

    const sisaKursi = trip.availableSeats - trip.bookedSeats;
    const kursiDiminta = parsed.data.seatsBooked ?? 1;
    if (kursiDiminta > sisaKursi) {
      return res.status(400).json({ error: `Kursi tersisa ${sisaKursi}. Kurangi jumlah kursi yang dipesan.` });
    }

    try {
      const booking = await storage.createBooking({ ...parsed.data, passengerId: peminta.id });

      const tripTerbaru = await storage.getTripById(parsed.data.tripId);
      if (tripTerbaru && tripTerbaru.bookedSeats >= tripTerbaru.availableSeats) {
        await storage.updateTripStatus(parsed.data.tripId, "full");
      }

      res.status(201).json(booking);
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : "Pemesanan ditolak basis data";
      return res.status(422).json({ error: pesan, ditolakOleh: "basis data" });
    }
  });

  app.patch("/api/bookings/:id/status", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const booking = await storage.getBookingById(id);
    if (!booking) return res.status(404).json({ error: "Pemesanan tidak ditemukan" });

    const trip = await storage.getTripById(booking.tripId);
    const peminta = res.locals.user as User;
    const berhak =
      peminta.role === "admin" ||
      peminta.id === booking.passengerId ||
      peminta.id === trip?.driverId;

    if (!berhak) {
      return res.status(403).json({ error: "Hanya penumpang, pengemudi, dan admin yang boleh mengubah pemesanan ini" });
    }

    await storage.updateBookingStatus(id, parsed.data.status);
    if (parsed.data.status === "completed") {
      await catatLedgerDampak(id);
    }
    res.json({ success: true });
  });

  /**
   * Nomor telepon lawan main hanya terbuka setelah pemesanan terkonfirmasi.
   * Sebelum itu, kedua pihak hanya melihat nama dan skor kepercayaan.
   */
  app.get("/api/bookings/:id/kontak", requireAuth, async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const booking = await storage.getBookingById(id);
    if (!booking) return res.status(404).json({ error: "Pemesanan tidak ditemukan" });

    const trip = await storage.getTripById(booking.tripId);
    if (!trip) return res.status(404).json({ error: "Perjalanan tidak ditemukan" });

    const peminta = res.locals.user as User;
    const adalahPenumpang = peminta.id === booking.passengerId;
    const adalahPengemudi = peminta.id === trip.driverId;
    if (!adalahPenumpang && !adalahPengemudi) {
      return res.status(403).json({ error: "Kontak hanya terbuka untuk penumpang dan pengemudi pada pemesanan ini" });
    }

    const statusTerbuka = ["confirmed", "in-progress", "completed"];
    if (!statusTerbuka.includes(booking.status)) {
      return res.status(409).json({
        error: "Nomor telepon terbuka setelah pemesanan dikonfirmasi kedua pihak",
      });
    }

    const lawan = await storage.getUserById(adalahPenumpang ? trip.driverId : booking.passengerId);
    if (!lawan) return res.status(404).json({ error: "Pengguna tidak ditemukan" });

    res.json({ name: lawan.name, phone: lawan.phone });
  });

  app.get("/api/passengers/:passengerId/bookings", requireAuth, async (req, res) => {
    const passengerId = bacaId(req, res, "passengerId");
    if (passengerId === null) return;

    const peminta = res.locals.user as User;
    if (peminta.role !== "admin" && peminta.id !== passengerId) {
      return res.status(403).json({ error: "Hanya pemilik akun dan admin yang boleh membaca pemesanan ini" });
    }

    const daftar = await storage.getBookingsByPassenger(passengerId);
    res.json(daftar.map((b) => ({ ...b, driver: pengemudiPublik(b.driver) })));
  });

  // ─── Penilaian ─────────────────────────────────────────────────────────────
  app.post("/api/ratings", requireAuth, async (req, res) => {
    const parsed = insertRatingSchema.omit({ raterId: true }).safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const peminta = res.locals.user as User;
    if (parsed.data.rateeId === peminta.id) {
      return res.status(400).json({ error: "Tidak dapat menilai diri sendiri" });
    }

    res.status(201).json(await storage.createRating({ ...parsed.data, raterId: peminta.id }));
  });

  // ─── Insiden ───────────────────────────────────────────────────────────────
  app.get("/api/incidents", requireAuth, requireRole("admin"), async (_req, res) => {
    const daftar = await storage.getIncidents();
    res.json(daftar.map((i) => ({ ...i, reporter: i.reporter ? tanpaKataSandi(i.reporter) : null })));
  });

  app.post("/api/incidents", requireAuth, async (req, res) => {
    const parsed = insertIncidentSchema.omit({ reporterId: true }).safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    const peminta = res.locals.user as User;
    res.status(201).json(await storage.createIncident({ ...parsed.data, reporterId: peminta.id }));
  });

  app.patch("/api/incidents/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
    const id = bacaId(req, res, "id");
    if (id === null) return;

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return kirimGalatValidasi(res, parsed.error);

    await storage.updateIncidentStatus(id, parsed.data.status);
    res.json({ success: true });
  });

  // ─── Statistik admin ───────────────────────────────────────────────────────
  app.get("/api/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
    res.json(await storage.getStats());
  });

  // ─── Ledger dan Parameter Dampak ───────────────────────────────────────────
  app.get("/api/dampak/agregat", async (_req, res) => {
    res.json(await storage.getAgregatDampak());
  });

  app.get("/api/parameter-dampak", async (_req, res) => {
    res.json(await storage.getParameterDampak());
  });

  app.get("/api/ledger-dampak/:bookingId", requireAuth, async (req, res) => {
    const bookingId = bacaId(req, res, "bookingId");
    if (bookingId === null) return;

    const ledger = await storage.getLedgerDampakByBooking(bookingId);
    if (!ledger) {
      return res.status(404).json({ error: "Data dampak belum tercatat untuk pemesanan ini" });
    }
    res.json(ledger);
  });

  // ─── Pengujian Kepatuhan Basis Data ───────────────────────────────────────
  app.post("/api/kepatuhan/uji-plafon", async (_req, res) => {
    try {
      const koridorList = await storage.getKoridorList();
      const k = koridorList[0];
      if (!k) {
        return res.status(404).json({ error: "Koridor belum tersedia. Jalankan seed demo terlebih dahulu." });
      }

      const usersList = await storage.getUsers();
      const driver = usersList.find((u) => u.role === "driver") ?? usersList[0];
      if (!driver) {
        return res.status(404).json({ error: "Pengemudi belum tersedia. Jalankan seed demo terlebih dahulu." });
      }

      await storage.createTrip({
        driverId: driver.id,
        koridorId: k.id,
        originName: "Titik Uji Asal",
        originLat: -6.8651,
        originLng: 107.6126,
        destinationName: "Titik Uji Tujuan",
        destinationLat: -6.8942,
        destinationLng: 107.6096,
        departureTime: new Date(),
        availableSeats: 3,
        priceMode: "cost-sharing",
        pricePerSeat: 999999,
        maxDeviationKm: 2,
        genderPreference: "any",
        jarakKm: 4.5,
        status: "open",
      });

      res.json({ sukses: false, pesan: "Perjalanan berhasil dibuat (seharusnya ditolak trigger)" });
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : "Ditolak basis data";
      res.status(422).json({
        sukses: true,
        error: pesan,
        ditolakOleh: "basis data",
        aturan: "plafon_tarif",
        statusHttp: 422,
      });
    }
  });
}
