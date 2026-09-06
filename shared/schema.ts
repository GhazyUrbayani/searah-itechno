import {
  pgTable,
  serial,
  text,
  varchar,
  json,
  index,
  integer,
  boolean,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";


// ─── Institusi ───────────────────────────────────────────────────────────────
// Institusi adalah penjamin identitas. Pengguna bergabung ke koridor milik
// institusi, bukan ke pasar terbuka.
export const institusi = pgTable("institusi", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  domainEmail: text("domain_email").notNull().unique(), // contoh: ui.ac.id
  kasSolidaritasRupiah: doublePrecision("kas_solidaritas_rupiah").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInstitusiSchema = createInsertSchema(institusi).omit({ id: true, createdAt: true });
export type InsertInstitusi = z.infer<typeof insertInstitusiSchema>;
export type Institusi = typeof institusi.$inferSelect;

// ─── Koridor ─────────────────────────────────────────────────────────────────
// Koridor adalah satu rute komuter tetap milik institusi. Seluruh aturan
// kepatuhan melekat di sini, bukan di perjalanan satuan.
export const koridor = pgTable("koridor", {
  id: serial("id").primaryKey(),
  institusiId: integer("institusi_id").notNull().references(() => institusi.id),
  nama: text("nama").notNull(),
  asalNama: text("asal_nama").notNull(),
  asalLat: doublePrecision("asal_lat").notNull(),
  asalLng: doublePrecision("asal_lng").notNull(),
  tujuanNama: text("tujuan_nama").notNull(),
  tujuanLat: doublePrecision("tujuan_lat").notNull(),
  tujuanLng: doublePrecision("tujuan_lng").notNull(),
  /** Jarak maksimum titik jemput dari garis rute, dalam meter. */
  radiusJemputM: doublePrecision("radius_jemput_m").notNull().default(800),
  /** Tambahan jarak maksimum akibat penjemputan, dalam persen jarak rute asli. */
  batasDeviasiPersen: doublePrecision("batas_deviasi_persen").notNull().default(20),
  /** Tarif maksimum per kilometer, dalam rupiah. Ditegakkan basis data. */
  plafonTarifPerKm: doublePrecision("plafon_tarif_per_km").notNull().default(2000),
  /** Jam operasional koridor dalam format HH:MM waktu lokal. */
  jamMulai: text("jam_mulai").notNull().default("05:00"),
  jamSelesai: text("jam_selesai").notNull().default("22:00"),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKoridorSchema = createInsertSchema(koridor).omit({ id: true, createdAt: true });
export type InsertKoridor = z.infer<typeof insertKoridorSchema>;
export type Koridor = typeof koridor.$inferSelect;

// ─── Pengguna ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("passenger"), // driver | passenger | admin
  category: text("category").notNull().default("regular"), // social | regular | premium
  ktpVerified: boolean("ktp_verified").notNull().default(false),
  simVerified: boolean("sim_verified").notNull().default(false),
  trustScore: doublePrecision("trust_score").notNull().default(5.0),
  totalTrips: integer("total_trips").notNull().default(0),
  gender: text("gender").notNull().default("unspecified"), // male | female | unspecified
  institusiId: integer("institusi_id").references(() => institusi.id),
  /** normal | bersubsidi. Penumpang bersubsidi dibiayai kas solidaritas. */
  tarifKategori: text("tarif_kategori").notNull().default("normal"),
  isActive: boolean("is_active").notNull().default(true),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/** Bentuk pengguna yang aman dikirim ke klien. Kata sandi tidak pernah keluar. */
export type UserPublic = Omit<User, "passwordHash">;

/**
 * Bentuk pengemudi pada daftar publik. Nomor telepon dan email dibuang.
 * Keduanya hanya terbuka lewat GET /api/bookings/:id/kontak setelah pemesanan
 * dikonfirmasi.
 */
export type PengemudiPublik = Omit<UserPublic, "phone" | "email">;

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z
    .string()
    .regex(/^08[0-9]{8,12}$/, "Nomor telepon harus diawali 08 dan berisi 10 sampai 14 digit"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  role: z.enum(["passenger", "driver"]).default("passenger"),
  gender: z.enum(["male", "female", "unspecified"]).default("unspecified"),
});


// ─── Kendaraan ───────────────────────────────────────────────────────────────
export const kendaraan = pgTable("kendaraan", {
  id: serial("id").primaryKey(),
  pemilikId: integer("pemilik_id").notNull().references(() => users.id),
  /** Plat disimpan dalam bentuk tersamar, contoh B 12** XYZ. */
  platDisamarkan: text("plat_disamarkan").notNull(),
  merek: text("merek").notNull(),
  /** Konsumsi bahan bakar, kilometer per liter. Dipakai Ledger Dampak. */
  konsumsiKmPerLiter: doublePrecision("konsumsi_km_per_liter").notNull(),
  kursiTotal: integer("kursi_total").notNull(),
  statusVerifikasi: text("status_verifikasi").notNull().default("menunggu"), // menunggu | terverifikasi | ditolak
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertKendaraanSchema = createInsertSchema(kendaraan).omit({ id: true, createdAt: true });
export type InsertKendaraan = z.infer<typeof insertKendaraanSchema>;
export type Kendaraan = typeof kendaraan.$inferSelect;

// ─── Perjalanan ──────────────────────────────────────────────────────────────
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => users.id),
  koridorId: integer("koridor_id").notNull().references(() => koridor.id),
  kendaraanId: integer("kendaraan_id").references(() => kendaraan.id),
  originName: text("origin_name").notNull(),
  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  destinationName: text("destination_name").notNull(),
  destinationLat: doublePrecision("destination_lat").notNull(),
  destinationLng: doublePrecision("destination_lng").notNull(),
  departureTime: timestamp("departure_time", { withTimezone: true }).notNull(),
  availableSeats: integer("available_seats").notNull(),
  bookedSeats: integer("booked_seats").notNull().default(0),
  priceMode: text("price_mode").notNull().default("cost-sharing"), // social | cost-sharing | premium
  pricePerSeat: doublePrecision("price_per_seat").notNull().default(0),
  maxDeviationKm: doublePrecision("max_deviation_km").notNull().default(2),
  genderPreference: text("gender_preference").notNull().default("any"), // any | male | female
  status: text("status").notNull().default("open"), // open | full | in-progress | completed | cancelled
  /**
   * Jarak rute asal ke tujuan dalam kilometer, dihitung dengan Haversine saat
   * perjalanan dibuat. Disimpan karena dipakai constraint plafon tarif dan
   * perhitungan Ledger Dampak, dan keduanya tidak boleh berubah nilainya
   * setelah baris tersimpan.
   */
  jarakKm: doublePrecision("jarak_km").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips)
  .omit({ id: true, createdAt: true, bookedSeats: true })
  .extend({
    // Klien mengirim waktu berangkat sebagai teks ISO 8601.
    departureTime: z.coerce.date(),
  });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// ─── Pemesanan ───────────────────────────────────────────────────────────────
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => trips.id),
  passengerId: integer("passenger_id").notNull().references(() => users.id),
  pickupName: text("pickup_name").notNull(),
  pickupLat: doublePrecision("pickup_lat").notNull(),
  pickupLng: doublePrecision("pickup_lng").notNull(),
  seatsBooked: integer("seats_booked").notNull().default(1),
  totalPrice: doublePrecision("total_price").notNull().default(0),
  status: text("status").notNull().default("pending"), // pending | confirmed | in-progress | completed | cancelled
  paymentStatus: text("payment_status").notNull().default("unpaid"), // unpaid | paid | refunded
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;


// ─── Parameter dampak ────────────────────────────────────────────────────────
// Nilai yang dipakai Ledger Dampak disimpan sebagai baris, bukan konstanta di
// dalam kode, supaya dapat dikoreksi tanpa deploy ulang dan supaya sumbernya
// dapat ditampilkan kepada pengguna.
export const parameterDampak = pgTable("parameter_dampak", {
  id: serial("id").primaryKey(),
  kunci: text("kunci").notNull().unique(),
  nilai: doublePrecision("nilai").notNull(),
  satuan: text("satuan").notNull(),
  sumber: text("sumber").notNull(),
  berlakuSejak: timestamp("berlaku_sejak", { withTimezone: true }).notNull().defaultNow(),
});

export const insertParameterDampakSchema = createInsertSchema(parameterDampak).omit({ id: true });
export type InsertParameterDampak = z.infer<typeof insertParameterDampakSchema>;
export type ParameterDampak = typeof parameterDampak.$inferSelect;

// ─── Ledger dampak ───────────────────────────────────────────────────────────
// Hasil perhitungan disimpan, bukan dihitung ulang saat render. Alasannya
// integritas temporal. Angka historis tidak boleh berubah ketika parameter
// diperbarui. Versi rumus ikut disimpan agar hasil lama dapat ditelusuri.
export const ledgerDampak = pgTable("ledger_dampak", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().unique().references(() => bookings.id),
  jarakKm: doublePrecision("jarak_km").notNull(),
  literDihemat: doublePrecision("liter_dihemat").notNull(),
  kgCo2eDihemat: doublePrecision("kg_co2e_dihemat").notNull(),
  rupiahDihemat: doublePrecision("rupiah_dihemat").notNull(),
  versiRumus: text("versi_rumus").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLedgerDampakSchema = createInsertSchema(ledgerDampak).omit({ id: true, createdAt: true });
export type InsertLedgerDampak = z.infer<typeof insertLedgerDampakSchema>;
export type LedgerDampak = typeof ledgerDampak.$inferSelect;

// ─── Penilaian ───────────────────────────────────────────────────────────────
export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id),
  raterId: integer("rater_id").notNull().references(() => users.id),
  rateeId: integer("ratee_id").notNull().references(() => users.id),
  score: doublePrecision("score").notNull(), // 1.0 sampai 5.0
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRatingSchema = createInsertSchema(ratings).omit({ id: true, createdAt: true });
export type InsertRating = z.infer<typeof insertRatingSchema>;
export type Rating = typeof ratings.$inferSelect;

// ─── Insiden ─────────────────────────────────────────────────────────────────
export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  reporterId: integer("reporter_id").notNull().references(() => users.id),
  type: text("type").notNull(), // panic | complaint | suspicious | accident
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open | investigating | resolved
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({ id: true, createdAt: true });
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// ─── Sesi ────────────────────────────────────────────────────────────────────
// Bentuk tabel mengikuti DDL bawaan connect-pg-simple. Tabel didefinisikan di
// sini supaya drizzle-kit push mengenalinya dan tidak menawarkan penghapusan.
export const sessions = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (tabel) => [index("IDX_session_expire").on(tabel.expire)],
);
