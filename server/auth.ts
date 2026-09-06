import "dotenv/config";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { storage } from "./storage";
import type { User, UserPublic } from "@shared/schema";

const RONDE_BCRYPT = 10;
const UMUR_COOKIE_MS = 1000 * 60 * 60 * 24 * 7; // 7 hari

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET belum diisi. Buat nilainya dengan: openssl rand -base64 32",
  );
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// Pengguna yang sudah terautentikasi ditempelkan ke res.locals agar handler
// tidak perlu memuat ulang barisnya dari basis data.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user?: User;
    }
  }
}

/** Membuang kolom kata sandi sebelum data pengguna dikirim ke klien. */
export function tanpaKataSandi(user: User): UserPublic {
  const { passwordHash: _dibuang, ...aman } = user;
  return aman;
}

/**
 * Membuang kolom kontak dari data pengguna.
 *
 * Nomor telepon dan email hanya boleh terlihat oleh pemiliknya, oleh admin,
 * dan oleh lawan main setelah pemesanan berstatus terkonfirmasi.
 */
export function tanpaKontak(user: User): Omit<UserPublic, "phone" | "email"> {
  const { passwordHash: _dibuang, phone: _telepon, email: _surel, ...aman } = user;
  return aman;
}

export function hashKataSandi(kataSandi: string): Promise<string> {
  return bcrypt.hash(kataSandi, RONDE_BCRYPT);
}

export function cocokkanKataSandi(kataSandi: string, hash: string): Promise<boolean> {
  return bcrypt.compare(kataSandi, hash);
}

// Sesi disimpan di Postgres yang sama dengan data aplikasi. Sesi di memori
// hilang setiap cold start, sehingga pengguna ter-logout secara acak.
const PgStore = connectPgSimple(session);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

export function sessionMiddleware(): RequestHandler {
  return session({
    store: new PgStore({ pool, tableName: "session", createTableIfMissing: false }),
    secret: process.env.SESSION_SECRET as string,
    name: "searah.sid",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: UMUR_COOKIE_MS,
    },
  });
}

/**
 * Mengisi res.locals.user bila permintaan membawa sesi yang sah, tanpa menolak
 * permintaan anonim. Dipakai pada endpoint publik yang menampilkan data lebih
 * lengkap kepada pengguna yang sudah masuk.
 */
export const attachUser: RequestHandler = async (req, res, next) => {
  const userId = req.session?.userId;
  if (userId) {
    const user = await storage.getUserById(userId);
    if (user && !user.isSuspended) res.locals.user = user;
  }
  next();
};

/** Menolak permintaan yang tidak membawa sesi login yang sah. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Masuk dulu untuk melanjutkan" });
  }

  const user = await storage.getUserById(userId);
  if (!user) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ error: "Masuk dulu untuk melanjutkan" });
  }
  if (user.isSuspended) {
    return res.status(403).json({ error: "Akun ditangguhkan. Hubungi admin koridor." });
  }

  res.locals.user = user;
  next();
};

/** Menolak pengguna yang perannya tidak ada dalam daftar. */
export function requireRole(...peran: string[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user;
    if (!user) return res.status(401).json({ error: "Masuk dulu untuk melanjutkan" });
    if (!peran.includes(user.role)) {
      return res.status(403).json({ error: "Peran akun ini tidak berhak mengakses data tersebut" });
    }
    next();
  };
}

// ─── Pembatas laju ───────────────────────────────────────────────────────────
const opsiUmum = {
  standardHeaders: true as const,
  legacyHeaders: false as const,
};

export const batasLogin = rateLimit({
  ...opsiUmum,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit." },
});

export const batasPembuatan = rateLimit({
  ...opsiUmum,
  windowMs: 60 * 1000,
  limit: 20,
  message: { error: "Terlalu banyak permintaan. Coba lagi satu menit lagi." },
});
