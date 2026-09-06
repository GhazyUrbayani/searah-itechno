import "dotenv/config";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

/**
 * Menjalankan pernyataan SQL terhadap basis data Neon.
 *
 * Dipakai untuk hal yang berada di luar jangkauan drizzle-kit, yaitu trigger,
 * fungsi, dan constraint yang ditulis tangan.
 *
 *   npx tsx script/jalankan-sql.ts berkas.sql
 *   npx tsx script/jalankan-sql.ts --pernyataan "ALTER TABLE ..."
 */
async function main() {
  const argumen = process.argv.slice(2);
  if (argumen.length === 0) {
    throw new Error("Sebutkan berkas SQL, atau pakai --pernyataan diikuti SQL.");
  }

  const sql = neon(process.env.DATABASE_URL!);
  const isi =
    argumen[0] === "--pernyataan" ? argumen.slice(1).join(" ") : readFileSync(argumen[0], "utf8");

  // Pernyataan dipisah pada titik koma di akhir baris. Blok $$ ... $$ milik
  // fungsi PL/pgSQL dilindungi supaya titik koma di dalamnya tidak memotong.
  const pernyataan: string[] = [];
  let penyangga = "";
  let dalamBlok = false;

  for (const baris of isi.split("\n")) {
    if (baris.includes("$$")) {
      const jumlah = (baris.match(/\$\$/g) ?? []).length;
      if (jumlah % 2 === 1) dalamBlok = !dalamBlok;
    }
    penyangga += baris + "\n";
    if (!dalamBlok && baris.trimEnd().endsWith(";")) {
      const bersih = penyangga.trim();
      if (bersih && !bersih.startsWith("--")) pernyataan.push(bersih);
      penyangga = "";
    }
  }
  if (penyangga.trim()) pernyataan.push(penyangga.trim());

  for (const [indeks, satu] of pernyataan.entries()) {
    const judul = satu.split("\n")[0].slice(0, 70);
    await sql(satu);
    console.log(`  [${indeks + 1}/${pernyataan.length}] ${judul}`);
  }
  console.log(`${pernyataan.length} pernyataan dijalankan`);
}

main().catch((galat) => {
  console.error(galat instanceof Error ? galat.message : galat);
  process.exit(1);
});
