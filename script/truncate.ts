import "dotenv/config";
import { neon } from "@neondatabase/serverless";

/**
 * Mengosongkan seluruh tabel transaksional.
 *
 * Tabel dikosongkan satu per satu dan tabel yang belum ada dilewati, supaya
 * skrip ini tetap berjalan pada basis data yang skemanya belum lengkap.
 * Tabel sesi sengaja tidak disentuh agar sesi berjalan tidak ikut hilang.
 */
const URUTAN = [
  "ledger_dampak",
  "incidents",
  "ratings",
  "bookings",
  "trips",
  "kendaraan",
  "users",
  "koridor",
  "institusi",
];

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  for (const tabel of URUTAN) {
    try {
      await sql(`TRUNCATE TABLE ${tabel} RESTART IDENTITY CASCADE`);
      console.log(`  dikosongkan ${tabel}`);
    } catch (galat) {
      const pesan = galat instanceof Error ? galat.message : String(galat);
      if (pesan.includes("does not exist")) {
        console.log(`  dilewati ${tabel}, tabel belum ada`);
        continue;
      }
      throw galat;
    }
  }
}

main().catch((galat) => {
  console.error(galat);
  process.exit(1);
});
