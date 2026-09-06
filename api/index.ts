/**
 * Titik masuk fungsi serverless Vercel.
 *
 * Vercel memetakan berkas ini ke /api. Aturan rewrite di vercel.json
 * meneruskan seluruh /api/* ke sini dengan path asli tetap utuh, sehingga
 * router Express di server/routes.ts dapat mencocokkannya seperti biasa.
 */
import express from "express";
import { pasangApi } from "../server/app";

const app = express();

// Middleware dan route dipasang sekali saat modul dimuat, lalu dipakai ulang
// selama instance fungsi masih hidup.
const siap = pasangApi(app);

export default async function handler(req: unknown, res: unknown) {
  await siap;
  return (app as unknown as (a: unknown, b: unknown) => void)(req, res);
}
