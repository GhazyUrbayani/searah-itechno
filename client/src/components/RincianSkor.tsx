import type { KontribusiKomponen, RincianSkor as TipeRincian } from "@shared/matching";

/** Mengubah angka 0 sampai 1 menjadi persen dengan satu angka di belakang koma. */
function persen(nilai: number): string {
  return `${(nilai * 100).toFixed(1)}%`;
}

interface Props {
  skor: number;
  komponen: KontribusiKomponen[];
  rincian: TipeRincian;
  ukuran: {
    jarakJemputKeRuteM: number;
    selisihWaktuMenit: number;
    tambahanJarakKm: number;
    plafonTarifKoridor: number;
    kursiTersisa: number;
  };
}

/**
 * Menampilkan asal-usul skor pencocokan sebagai bar per komponen.
 *
 * Penumpang harus dapat melihat alasan sebuah perjalanan berada di atas yang
 * lain. Angka mentah ikut ditampilkan supaya klaimnya dapat diperiksa, bukan
 * hanya dipercaya.
 */
export default function RincianSkor({ skor, komponen, ukuran }: Props) {
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">Rincian skor</span>
        <span className="font-mono text-sm tabular-nums">
          {skor.toFixed(4)} <span className="text-muted-foreground">dari 0,9000</span>
        </span>
      </div>

      <ul className="space-y-2">
        {komponen.map((k) => {
          const penalti = k.bobot < 0;
          const lebar = Math.max(0, Math.min(100, k.nilai * 100));
          return (
            <li key={k.kunci}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span>{k.label}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {k.nilai.toFixed(3)} x {k.bobot.toFixed(2)} ={" "}
                  <span className={penalti ? "text-destructive" : "text-foreground"}>
                    {k.kontribusi >= 0 ? "+" : ""}
                    {k.kontribusi.toFixed(4)}
                  </span>
                </span>
              </div>
              <div
                className="mt-1 h-2 w-full rounded-sm bg-muted"
                role="img"
                aria-label={`${k.label} bernilai ${persen(k.nilai)} dengan bobot ${k.bobot}`}
              >
                <div
                  className={`h-2 rounded-sm ${penalti ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${lebar}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <dt>Jarak jemput ke rute</dt>
        <dd className="font-mono tabular-nums text-right">{Math.round(ukuran.jarakJemputKeRuteM)} m</dd>
        <dt>Selisih waktu</dt>
        <dd className="font-mono tabular-nums text-right">{Math.round(ukuran.selisihWaktuMenit)} menit</dd>
        <dt>Tambahan jarak</dt>
        <dd className="font-mono tabular-nums text-right">{ukuran.tambahanJarakKm.toFixed(2)} km</dd>
        <dt>Plafon tarif koridor</dt>
        <dd className="font-mono tabular-nums text-right">
          Rp{Math.round(ukuran.plafonTarifKoridor).toLocaleString("id-ID")}
        </dd>
        <dt>Kursi tersisa</dt>
        <dd className="font-mono tabular-nums text-right">{ukuran.kursiTersisa}</dd>
      </dl>

      <p className="text-xs text-muted-foreground">
        Bobot positif berjumlah 0,90. Sisa 0,10 dipakai sebagai penalti deviasi yang selalu
        mengurangi, jadi skor tertinggi yang mungkin adalah 0,9000.
      </p>
    </div>
  );
}
