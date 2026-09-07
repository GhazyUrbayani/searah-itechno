import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { alias } from "drizzle-orm/pg-core";
import { eq, and, desc, sql, count } from "drizzle-orm";
import { users, trips, bookings, ratings, incidents, institusi, koridor, kendaraan, ledgerDampak, parameterDampak } from "@shared/schema";
import type {
  User, InsertUser,
  Trip, InsertTrip,
  Booking, InsertBooking,
  Rating, InsertRating,
  Incident, InsertIncident,
  Institusi,
  Koridor, InsertKoridor,
  Kendaraan, InsertKendaraan,
  LedgerDampak, InsertLedgerDampak,
  ParameterDampak,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi Neon.",
  );
}

// Driver HTTP Neon. Setiap query adalah satu permintaan HTTP, tanpa koneksi
// persisten, sehingga cocok untuk fungsi serverless yang berumur pendek.
const sqlClient = neon(process.env.DATABASE_URL);
export const db = drizzle(sqlClient);

// Alias dipakai agar satu query dapat menggabungkan tabel users dua kali,
// sekali sebagai pengemudi dan sekali sebagai penumpang.
const pengemudi = alias(users, "pengemudi");
const penumpang = alias(users, "penumpang");
const pelapor = alias(users, "pelapor");

export type TripWithDriver = Trip & { driver: User | null; koridor: Koridor | null };
export type BookingWithTripAndPassenger = Booking & { trip: Trip | null; passenger: User | null };
export type BookingWithTripAndDriver = Booking & { trip: Trip | null; driver: User | null };
export type IncidentWithReporter = Incident & { reporter: User | null };
import type { MingguanDampak, AgregatDampak } from "@shared/dampak";
export type { MingguanDampak, AgregatDampak };

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: InsertUser & { passwordHash: string }): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  suspendUser(id: number): Promise<void>;

  getTrips(filters?: { status?: string; koridorId?: number; priceMode?: string }): Promise<TripWithDriver[]>;
  getTripById(id: number): Promise<Trip | undefined>;
  getTripsByDriver(driverId: number): Promise<Trip[]>;
  createTrip(data: InsertTrip): Promise<Trip>;
  updateTrip(id: number, data: Partial<InsertTrip>): Promise<Trip | undefined>;
  updateTripStatus(id: number, status: string): Promise<void>;

  getBookings(): Promise<BookingWithTripAndPassenger[]>;
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByTrip(tripId: number): Promise<Booking[]>;
  getBookingsByPassenger(passengerId: number): Promise<BookingWithTripAndDriver[]>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<void>;

  createRating(data: InsertRating): Promise<Rating>;
  getRatingsByUser(userId: number): Promise<Rating[]>;

  getIncidents(): Promise<IncidentWithReporter[]>;
  createIncident(data: InsertIncident): Promise<Incident>;
  updateIncidentStatus(id: number, status: string): Promise<void>;

  getInstitusiList(): Promise<Institusi[]>;
  getKoridorList(): Promise<(Koridor & { institusi: Institusi | null })[]>;
  getKoridorById(id: number): Promise<Koridor | undefined>;
  createKoridor(data: InsertKoridor): Promise<Koridor>;

  getKendaraanByPemilik(pemilikId: number): Promise<Kendaraan[]>;
  getKendaraanById(id: number): Promise<Kendaraan | undefined>;
  createKendaraan(data: InsertKendaraan): Promise<Kendaraan>;

  getParameterDampak(): Promise<ParameterDampak[]>;
  createLedgerDampak(data: InsertLedgerDampak): Promise<LedgerDampak>;
  getLedgerDampakByBooking(bookingId: number): Promise<LedgerDampak | undefined>;
  getAgregatDampak(): Promise<AgregatDampak>;

  getStats(): Promise<{
    totalUsers: number;
    totalDrivers: number;
    totalTrips: number;
    totalBookings: number;
    openIncidents: number;
  }>;
}

/**
 * Tanggal Senin pada minggu yang memuat waktu tertentu, dalam format
 * YYYY-MM-DD. Perhitungan memakai komponen UTC saja.
 */
function awalMingguUtc(waktu: Date): string {
  const salinan = new Date(
    Date.UTC(waktu.getUTCFullYear(), waktu.getUTCMonth(), waktu.getUTCDate()),
  );
  // getUTCDay mengembalikan 0 untuk Minggu. Minggu dianggap dimulai Senin.
  const geser = (salinan.getUTCDay() + 6) % 7;
  salinan.setUTCDate(salinan.getUTCDate() - geser);
  return salinan.toISOString().slice(0, 10);
}

export class PostgresStorage implements IStorage {
  // ─── Pengguna ──────────────────────────────────────────────────────────────
  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.id);
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [baris] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return baris;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [baris] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return baris;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [baris] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()))
      .limit(1);
    return baris;
  }

  async createUser(data: InsertUser & { passwordHash: string }): Promise<User> {
    const [baris] = await db.insert(users).values(data).returning();
    return baris;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [baris] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return baris;
  }

  async suspendUser(id: number): Promise<void> {
    await db.update(users).set({ isSuspended: true }).where(eq(users.id, id));
  }

  // ─── Perjalanan ────────────────────────────────────────────────────────────
  /**
   * Penyaringan dilakukan di klausa WHERE, bukan di JavaScript setelah
   * SELECT *. Data pengemudi diambil lewat satu LEFT JOIN, bukan satu query
   * per baris.
   */
  async getTrips(filters?: {
    status?: string;
    koridorId?: number;
    priceMode?: string;
  }): Promise<TripWithDriver[]> {
    const syarat = [];
    if (filters?.status) syarat.push(eq(trips.status, filters.status));
    if (filters?.koridorId) syarat.push(eq(trips.koridorId, filters.koridorId));
    if (filters?.priceMode) syarat.push(eq(trips.priceMode, filters.priceMode));

    const baris = await db
      .select({ trip: trips, driver: pengemudi, koridor })
      .from(trips)
      .leftJoin(pengemudi, eq(trips.driverId, pengemudi.id))
      .leftJoin(koridor, eq(trips.koridorId, koridor.id))
      .where(syarat.length ? and(...syarat) : undefined)
      .orderBy(desc(trips.departureTime));

    return baris.map((b) => ({ ...b.trip, driver: b.driver, koridor: b.koridor }));
  }

  async getTripById(id: number): Promise<Trip | undefined> {
    const [baris] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
    return baris;
  }

  async getTripsByDriver(driverId: number): Promise<Trip[]> {
    return db
      .select()
      .from(trips)
      .where(eq(trips.driverId, driverId))
      .orderBy(desc(trips.departureTime));
  }

  async createTrip(data: InsertTrip): Promise<Trip> {
    const [baris] = await db.insert(trips).values(data).returning();
    return baris;
  }

  async updateTrip(id: number, data: Partial<InsertTrip>): Promise<Trip | undefined> {
    const [baris] = await db.update(trips).set(data).where(eq(trips.id, id)).returning();
    return baris;
  }

  async updateTripStatus(id: number, status: string): Promise<void> {
    await db.update(trips).set({ status }).where(eq(trips.id, id));
  }

  // ─── Pemesanan ─────────────────────────────────────────────────────────────
  async getBookings(): Promise<BookingWithTripAndPassenger[]> {
    const baris = await db
      .select({ booking: bookings, trip: trips, passenger: penumpang })
      .from(bookings)
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .leftJoin(penumpang, eq(bookings.passengerId, penumpang.id))
      .orderBy(desc(bookings.id));

    return baris.map((b) => ({ ...b.booking, trip: b.trip, passenger: b.passenger }));
  }

  async getBookingById(id: number): Promise<Booking | undefined> {
    const [baris] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return baris;
  }

  async getBookingsByTrip(tripId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.tripId, tripId)).orderBy(bookings.id);
  }

  async getBookingsByPassenger(passengerId: number): Promise<BookingWithTripAndDriver[]> {
    const baris = await db
      .select({ booking: bookings, trip: trips, driver: pengemudi })
      .from(bookings)
      .leftJoin(trips, eq(bookings.tripId, trips.id))
      .leftJoin(pengemudi, eq(trips.driverId, pengemudi.id))
      .where(eq(bookings.passengerId, passengerId))
      .orderBy(desc(bookings.id));

    return baris.map((b) => ({ ...b.booking, trip: b.trip, driver: b.driver }));
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [baris] = await db.insert(bookings).values(data).returning();
    await db
      .update(trips)
      .set({ bookedSeats: sql`${trips.bookedSeats} + ${data.seatsBooked ?? 1}` })
      .where(eq(trips.id, data.tripId));
    return baris;
  }

  async updateBookingStatus(id: number, status: string): Promise<void> {
    await db.update(bookings).set({ status }).where(eq(bookings.id, id));
  }

  // ─── Penilaian ─────────────────────────────────────────────────────────────
  async createRating(data: InsertRating): Promise<Rating> {
    const [baris] = await db.insert(ratings).values(data).returning();

    // Rata-rata dihitung di basis data, bukan dengan menarik seluruh baris.
    const [agregat] = await db
      .select({ rerata: sql<number>`avg(${ratings.score})` })
      .from(ratings)
      .where(eq(ratings.rateeId, data.rateeId));

    if (agregat?.rerata !== null && agregat?.rerata !== undefined) {
      await db
        .update(users)
        .set({ trustScore: Number(agregat.rerata) })
        .where(eq(users.id, data.rateeId));
    }

    return baris;
  }

  async getRatingsByUser(userId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.rateeId, userId)).orderBy(desc(ratings.id));
  }

  // ─── Insiden ───────────────────────────────────────────────────────────────
  async getIncidents(): Promise<IncidentWithReporter[]> {
    const baris = await db
      .select({ incident: incidents, reporter: pelapor })
      .from(incidents)
      .leftJoin(pelapor, eq(incidents.reporterId, pelapor.id))
      .orderBy(desc(incidents.id));

    return baris.map((b) => ({ ...b.incident, reporter: b.reporter }));
  }

  async createIncident(data: InsertIncident): Promise<Incident> {
    const [baris] = await db.insert(incidents).values(data).returning();
    return baris;
  }

  async updateIncidentStatus(id: number, status: string): Promise<void> {
    await db.update(incidents).set({ status }).where(eq(incidents.id, id));
  }

  // ─── Institusi, koridor, kendaraan ────────────────────────────────────────
  async getInstitusiList(): Promise<Institusi[]> {
    return db.select().from(institusi).orderBy(institusi.id);
  }

  async getKoridorList(): Promise<(Koridor & { institusi: Institusi | null })[]> {
    const baris = await db
      .select({ koridor, institusi })
      .from(koridor)
      .leftJoin(institusi, eq(koridor.institusiId, institusi.id))
      .orderBy(koridor.id);
    return baris.map((b) => ({ ...b.koridor, institusi: b.institusi }));
  }

  async getKoridorById(id: number): Promise<Koridor | undefined> {
    const [baris] = await db.select().from(koridor).where(eq(koridor.id, id)).limit(1);
    return baris;
  }

  async createKoridor(data: InsertKoridor): Promise<Koridor> {
    const [baris] = await db.insert(koridor).values(data).returning();
    return baris;
  }

  async getKendaraanByPemilik(pemilikId: number): Promise<Kendaraan[]> {
    return db.select().from(kendaraan).where(eq(kendaraan.pemilikId, pemilikId)).orderBy(kendaraan.id);
  }

  async getKendaraanById(id: number): Promise<Kendaraan | undefined> {
    const [baris] = await db.select().from(kendaraan).where(eq(kendaraan.id, id)).limit(1);
    return baris;
  }

  async createKendaraan(data: InsertKendaraan): Promise<Kendaraan> {
    const [baris] = await db.insert(kendaraan).values(data).returning();
    return baris;
  }

  // ─── Ledger & Parameter Dampak ─────────────────────────────────────────────
  async getParameterDampak(): Promise<ParameterDampak[]> {
    return db.select().from(parameterDampak).orderBy(parameterDampak.id);
  }

  async createLedgerDampak(data: InsertLedgerDampak): Promise<LedgerDampak> {
    const [baris] = await db.insert(ledgerDampak).values(data).returning();
    return baris;
  }

  async getLedgerDampakByBooking(bookingId: number): Promise<LedgerDampak | undefined> {
    const [baris] = await db.select().from(ledgerDampak).where(eq(ledgerDampak.bookingId, bookingId)).limit(1);
    return baris;
  }

  /**
   * Menghitung agregat dampak beserta rinciannya per minggu.
   *
   * Pengelompokan memakai waktu keberangkatan perjalanan, bukan waktu baris
   * ledger dibuat. Seluruh baris ledger yang dihasilkan skrip seed punya
   * createdAt yang hampir sama, sehingga pengelompokan berdasarkan createdAt
   * akan menumpuk semuanya di satu batang dan grafik kehilangan maknanya.
   *
   * Kunci minggu dihitung sepenuhnya dalam UTC. Mencampur getDay dan getDate
   * yang memakai zona waktu mesin dengan toISOString yang memakai UTC akan
   * menggeser kunci satu hari di zona waktu Indonesia.
   */
  async getAgregatDampak(): Promise<AgregatDampak> {
    const baris = await db
      .select({ ledger: ledgerDampak, berangkat: trips.departureTime })
      .from(ledgerDampak)
      .leftJoin(bookings, eq(ledgerDampak.bookingId, bookings.id))
      .leftJoin(trips, eq(bookings.tripId, trips.id));

    let totalLiterDihemat = 0;
    let totalKgCo2eDihemat = 0;
    let totalRupiahDihemat = 0;

    const mingguanPeta = new Map<string, MingguanDampak>();

    for (const b of baris) {
      const l = b.ledger;
      totalLiterDihemat += l.literDihemat;
      totalKgCo2eDihemat += l.kgCo2eDihemat;
      totalRupiahDihemat += l.rupiahDihemat;

      const acuan = new Date(b.berangkat ?? l.createdAt);
      const kunciMinggu = awalMingguUtc(acuan);

      const ada = mingguanPeta.get(kunciMinggu);
      if (ada) {
        ada.literDihemat += l.literDihemat;
        ada.kgCo2eDihemat += l.kgCo2eDihemat;
        ada.rupiahDihemat += l.rupiahDihemat;
        ada.jumlahPerjalanan += 1;
      } else {
        mingguanPeta.set(kunciMinggu, {
          minggu: kunciMinggu,
          literDihemat: l.literDihemat,
          kgCo2eDihemat: l.kgCo2eDihemat,
          rupiahDihemat: l.rupiahDihemat,
          jumlahPerjalanan: 1,
        });
      }
    }

    const mingguan = Array.from(mingguanPeta.values()).sort((a, b) =>
      a.minggu.localeCompare(b.minggu),
    );

    return {
      totalPerjalanan: baris.length,
      totalLiterDihemat: Math.round(totalLiterDihemat * 100) / 100,
      totalKgCo2eDihemat: Math.round(totalKgCo2eDihemat * 100) / 100,
      totalRupiahDihemat: Math.round(totalRupiahDihemat),
      mingguan,
    };
  }

  // ─── Statistik ─────────────────────────────────────────────────────────────
  async getStats() {
    const [penggunaNonAdmin] = await db
      .select({ jumlah: count() })
      .from(users)
      .where(sql`${users.role} <> 'admin'`);
    const [jumlahPengemudi] = await db
      .select({ jumlah: count() })
      .from(users)
      .where(eq(users.role, "driver"));
    const [jumlahPerjalanan] = await db.select({ jumlah: count() }).from(trips);
    const [jumlahPemesanan] = await db.select({ jumlah: count() }).from(bookings);
    const [insidenTerbuka] = await db
      .select({ jumlah: count() })
      .from(incidents)
      .where(eq(incidents.status, "open"));

    return {
      totalUsers: penggunaNonAdmin.jumlah,
      totalDrivers: jumlahPengemudi.jumlah,
      totalTrips: jumlahPerjalanan.jumlah,
      totalBookings: jumlahPemesanan.jumlah,
      openIncidents: insidenTerbuka.jumlah,
    };
  }
}

export const storage = new PostgresStorage();
