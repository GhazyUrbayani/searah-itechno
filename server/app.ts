import type { Express } from "express";
import express from "express";
import helmet from "helmet";
import { sessionMiddleware, attachUser } from "./auth";
import { registerRoutes } from "./routes";

const produksi = process.env.NODE_ENV === "production";

/**
 * Memasang middleware yang dipakai bersama oleh server pengembangan dan fungsi
 * serverless, lalu mendaftarkan seluruh route API.
 *
 * Urutan penting. Header keamanan dipasang lebih dulu, sesi menyusul, baru
 * route. attachUser berada sebelum route agar endpoint publik dapat mengenali
 * pengguna yang sudah masuk tanpa memaksanya.
 */
export async function pasangApi(app: Express): Promise<void> {
  // Vercel menaruh fungsi di belakang proxy. Tanpa ini, cookie secure tidak
  // pernah terkirim dan pembatas laju membaca alamat IP proxy, bukan klien.
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Vite menyuntikkan skrip inline saat pengembangan, dan index.html
          // hasil build memuat modul dari origin yang sama.
          scriptSrc: ["'self'", "'unsafe-inline'"],
          // Tailwind dan Radix menulis gaya inline saat runtime. Dua host
          // font berikut dimuat dari client/index.css dan client/index.html.
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://api.fontshare.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.fontshare.com"],
          connectSrc: produksi ? ["'self'"] : ["'self'", "ws:", "wss:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: produksi ? [] : null,
        },
      },
      // Aset dilayani dari origin yang sama, tidak perlu isolasi lintas origin
      // yang memblokir pemuatan gambar data URI di sebagian peramban.
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
      frameguard: { action: "deny" },
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(sessionMiddleware());
  app.use(attachUser);

  await registerRoutes(app);
}
