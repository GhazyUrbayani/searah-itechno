import { useState } from "react";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, Play, CheckCircle2, XCircle } from "lucide-react";

const KODE_TRIGGER_PLAFON = `CREATE OR REPLACE FUNCTION fn_cek_plafon_tarif()
RETURNS TRIGGER AS $$
DECLARE
  v_plafon_per_km DOUBLE PRECISION;
  v_batas_maks DOUBLE PRECISION;
BEGIN
  SELECT plafon_tarif_per_km INTO v_plafon_per_km
  FROM koridor WHERE id = NEW.koridor_id;

  IF NEW.price_mode = 'social' AND NEW.price_per_seat > 0 THEN
    RAISE EXCEPTION 'Perjalanan mode sosial wajib menetapkan tarif Rp0 per kursi';
  END IF;

  v_batas_maks := CEIL(v_plafon_per_km * COALESCE(NEW.jarak_km, 0));

  IF NEW.price_per_seat > v_batas_maks THEN
    RAISE EXCEPTION 'Tarif per kursi melampaui plafon koridor: Rp% > batas maksimum Rp%',
      ROUND(NEW.price_per_seat::numeric), ROUND(v_batas_maks::numeric);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const KODE_TRIGGER_BATAS_HARIAN = `CREATE OR REPLACE FUNCTION fn_cek_maks_trip_aktif()
RETURNS TRIGGER AS $$
DECLARE
  v_jumlah_aktif INTEGER;
  v_tgl_berangkat DATE;
BEGIN
  IF NEW.status IN ('open', 'in-progress') THEN
    v_tgl_berangkat := (NEW.departure_time AT TIME ZONE 'Asia/Jakarta')::date;

    SELECT COUNT(*) INTO v_jumlah_aktif FROM trips
    WHERE driver_id = NEW.driver_id
      AND status IN ('open', 'in-progress')
      AND (departure_time AT TIME ZONE 'Asia/Jakarta')::date = v_tgl_berangkat
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_jumlah_aktif >= 2 THEN
      RAISE EXCEPTION 'Pengemudi telah mencapai batas maksimum 2 perjalanan per hari pada tanggal %',
        to_char(v_tgl_berangkat, 'DD-MM-YYYY');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

const KODE_TRIGGER_KAPASITAS = `CREATE OR REPLACE FUNCTION fn_cek_kursi_penuh()
RETURNS TRIGGER AS $$
DECLARE
  v_kapasitas INTEGER;
  v_terpesan INTEGER;
BEGIN
  IF NEW.status IN ('pending', 'confirmed', 'in-progress') THEN
    SELECT available_seats INTO v_kapasitas FROM trips WHERE id = NEW.trip_id;
    SELECT COALESCE(SUM(seats_booked), 0) INTO v_terpesan FROM bookings
    WHERE trip_id = NEW.trip_id
      AND status IN ('pending', 'confirmed', 'in-progress')
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF (v_terpesan + NEW.seats_booked) > v_kapasitas THEN
      RAISE EXCEPTION 'Kapasitas kursi tidak mencukupi: tersisa % kursi, diminta % kursi',
        (v_kapasitas - v_terpesan), NEW.seats_booked;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`;

interface HasilUji {
  status: "sukses" | "gagal";
  statusHttp: number;
  pesan: string;
  waktu: string;
}

export default function KepatuhanPage() {
  const [sedangMenguji, setSedangMenguji] = useState(false);
  const [hasilUji, setHasilUji] = useState<HasilUji | null>(null);

  const jalankanUjiPlafon = async () => {
    setSedangMenguji(true);
    setHasilUji(null);

    try {
      const res = await fetch("/api/kepatuhan/uji-plafon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.status === 422) {
        setHasilUji({
          status: "sukses",
          statusHttp: 422,
          pesan: data.error ?? "Ditolak oleh trigger basis data",
          waktu: new Date().toLocaleTimeString("id-ID"),
        });
      } else if (res.ok && data.sukses) {
        setHasilUji({
          status: "sukses",
          statusHttp: data.statusHttp ?? 422,
          pesan: data.galatBasisData ?? data.pesanUji,
          waktu: new Date().toLocaleTimeString("id-ID"),
        });
      } else {
        setHasilUji({
          status: "gagal",
          statusHttp: res.status,
          pesan: data.error ?? "Permintaan tidak ditolak basis data.",
          waktu: new Date().toLocaleTimeString("id-ID"),
        });
      }
    } catch (galat) {
      setHasilUji({
        status: "gagal",
        statusHttp: 500,
        pesan: galat instanceof Error ? galat.message : "Gagal menghubungi server",
        waktu: new Date().toLocaleTimeString("id-ID"),
      });
    } finally {
      setSedangMenguji(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Kepatuhan</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Tiga aturan dijaga trigger PostgreSQL, bukan validasi formulir.
          </p>
        </div>

        {/* Panel Uji Coba Langsung */}
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Coba langgar aturannya</CardTitle>
                <CardDescription>
                  Kirim perjalanan bertarif Rp999.000, jauh di atas plafon koridor.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                Neon PostgreSQL Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Basis data harus menolaknya dengan HTTP 422.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={jalankanUjiPlafon}
                disabled={sedangMenguji}
                data-testid="button-jalankan-uji-plafon"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {sedangMenguji ? "Menjalankan Uji..." : "Jalankan Uji Plafon Tarif"}
              </Button>
            </div>

            {hasilUji && (
              <div
                className={`p-4 rounded-lg border text-sm space-y-2 ${
                  hasilUji.status === "sukses"
                    ? "bg-green-500/5 border-green-500/20 text-green-950 dark:text-green-300"
                    : "bg-destructive/5 border-destructive/20 text-destructive"
                }`}
                data-testid="panel-hasil-uji"
              >
                <div className="flex items-center gap-2 font-semibold">
                  {hasilUji.status === "sukses" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span>Uji Berhasil: Transaksi Berhasil Ditolak oleh Mesin PostgreSQL</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span>Uji Gagal: Basis data tidak menolak transaksi</span>
                    </>
                  )}
                  <Badge variant="secondary" className="ml-auto text-xs font-mono">
                    HTTP {hasilUji.statusHttp}
                  </Badge>
                </div>

                <div className="bg-background/80 p-3 rounded border font-mono text-xs text-foreground overflow-x-auto">
                  <p className="text-muted-foreground mb-1">// Pesan galat dari PostgreSQL trigger:</p>
                  <p>{hasilUji.pesan}</p>
                </div>

                <p className="text-xs text-muted-foreground">Waktu pengujian: {hasilUji.waktu} WIB</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tiga Aturan Kepatuhan */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Tiga Aturan Kepatuhan Utama</h2>

          {/* Aturan 1 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">1. Plafon tarif per kilometer</CardTitle>
                  <CardDescription>
                    Menjaga tarif tetap berbagi biaya, bukan komersial.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">BEFORE INSERT / UPDATE trips</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tarif per kursi tidak boleh melebihi plafon koridor dikali jarak.
              </p>
              <div className="bg-muted p-3 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono">{KODE_TRIGGER_PLAFON}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Aturan 2 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">2. Dua perjalanan aktif per hari</CardTitle>
                  <CardDescription>
                    Menahan pengemudi beroperasi seperti taksi gelap.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">BEFORE INSERT trips</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Dihitung per tanggal, memakai waktu Asia/Jakarta.
              </p>
              <div className="bg-muted p-3 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono">{KODE_TRIGGER_BATAS_HARIAN}</pre>
              </div>
            </CardContent>
          </Card>

          {/* Aturan 3 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">3. Kapasitas kursi</CardTitle>
                  <CardDescription>
                    Menahan kelebihan pesan saat dua orang memesan bersamaan.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">BEFORE INSERT / UPDATE bookings</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kursi pada pemesanan aktif dijumlahkan. Melebihi kapasitas, transaksi ditolak.
              </p>
              <div className="bg-muted p-3 rounded-lg overflow-x-auto">
                <pre className="text-xs font-mono">{KODE_TRIGGER_KAPASITAS}</pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
