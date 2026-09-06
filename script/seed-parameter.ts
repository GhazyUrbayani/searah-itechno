import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { PARAMETER_BAWAAN } from "../shared/dampak";

/**
 * Mengisi tabel parameter_dampak dengan nilai bawaan.
 *
 * Baris yang sudah ada diperbarui, bukan diduplikasi, supaya skrip aman
 * dijalankan berulang kali.
 */
async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  for (const p of PARAMETER_BAWAAN) {
    await sql`
      INSERT INTO parameter_dampak (kunci, nilai, satuan, sumber)
      VALUES (${p.kunci}, ${p.nilai}, ${p.satuan}, ${p.sumber})
      ON CONFLICT (kunci) DO UPDATE
      SET nilai = EXCLUDED.nilai, satuan = EXCLUDED.satuan, sumber = EXCLUDED.sumber
    `;
    console.log(`  ${p.kunci} = ${p.nilai} ${p.satuan}`);
  }
  console.log(`${PARAMETER_BAWAAN.length} parameter dampak tersimpan`);
}

main().catch((galat) => {
  console.error(galat);
  process.exit(1);
});
