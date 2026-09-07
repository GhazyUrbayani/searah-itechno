import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, SELANG_POLLING_MS } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, MapPin, Clock, Star, Search, Filter, Users, Plus } from "lucide-react";
import type { Trip, PengemudiPublik, Koridor, Institusi } from "@shared/schema";
import type { HasilPencocokan } from "@shared/matching";
import RincianSkor from "../components/RincianSkor";

type KoridorDenganInstitusi = Koridor & { institusi: Institusi | null };

type HasilCocok = HasilPencocokan & { trip: TripWithDriver | null };

interface JawabanCocok {
  versiRumus: string;
  bobot: Record<string, number>;
  jumlahKandidat: number;
  jumlahLolos: number;
  hasil: HasilCocok[];
}

/** Waktu lokal untuk input datetime-local, dibulatkan ke menit. */
function nilaiWaktuLokal(waktu: Date): string {
  const geser = waktu.getTimezoneOffset() * 60000;
  return new Date(waktu.getTime() - geser).toISOString().slice(0, 16);
}

type TripWithDriver = Trip & { driver?: PengemudiPublik | null; koridor?: Koridor | null };

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  full: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "in-progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};
const STATUS_LABEL: Record<string, string> = {
  open: "Tersedia",
  full: "Penuh",
  "in-progress": "Berlangsung",
  completed: "Selesai",
};
const MODE_LABEL: Record<string, string> = {
  social: "Sosial/Gratis",
  "cost-sharing": "Cost-Sharing",
  premium: "Premium",
};

export default function TripsPage() {
  const { user, isDriver } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [filterCorridor, setFilterCorridor] = useState("all");

  // Formulir pencocokan
  const [cocokKoridor, setCocokKoridor] = useState("");
  const [cocokWaktu, setCocokWaktu] = useState(() => nilaiWaktuLokal(new Date()));
  const [cocokKursi, setCocokKursi] = useState("1");
  const [cocokToleransi, setCocokToleransi] = useState("45");
  const [hasilCocok, setHasilCocok] = useState<JawabanCocok | null>(null);
  const [sedangCocok, setSedangCocok] = useState(false);
  const [galatCocok, setGalatCocok] = useState<string | null>(null);
  const [skorTerbuka, setSkorTerbuka] = useState<number | null>(null);

  if (!user) { navigate("/login"); return null; }

  const { data: trips, isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ["/api/trips"],
    refetchInterval: SELANG_POLLING_MS,
  });

  const { data: daftarKoridor } = useQuery<KoridorDenganInstitusi[]>({
    queryKey: ["/api/koridor"],
  });

  /**
   * Menjalankan pencocokan di server. Titik jemput dan titik turun memakai
   * ujung koridor, karena koridor tertutup memang punya satu asal dan satu
   * tujuan tetap.
   */
  async function jalankanPencocokan() {
    const koridorTerpilih = (daftarKoridor ?? []).find((k) => String(k.id) === cocokKoridor);
    if (!koridorTerpilih) {
      setGalatCocok("Pilih koridor lebih dulu.");
      return;
    }

    setSedangCocok(true);
    setGalatCocok(null);
    try {
      const parameter = new URLSearchParams({
        koridorId: String(koridorTerpilih.id),
        jemputLat: String(koridorTerpilih.asalLat),
        jemputLng: String(koridorTerpilih.asalLng),
        turunLat: String(koridorTerpilih.tujuanLat),
        turunLng: String(koridorTerpilih.tujuanLng),
        waktuDiinginkan: new Date(cocokWaktu).toISOString(),
        kursiDibutuhkan: cocokKursi,
        toleransiMenit: cocokToleransi,
      });
      // apiRequest sudah menerjemahkan galat validasi Zod menjadi kalimat.
      const res = await apiRequest("GET", `/api/trips/match?${parameter.toString()}`);
      setHasilCocok((await res.json()) as JawabanCocok);
      setSkorTerbuka(null);
    } catch (galat) {
      setGalatCocok(galat instanceof Error ? galat.message : "Pencocokan gagal dijalankan.");
    } finally {
      setSedangCocok(false);
    }
  }

  const filtered = (trips ?? []).filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterMode !== "all" && t.priceMode !== filterMode) return false;
    if (filterCorridor !== "all" && String(t.koridorId) !== filterCorridor) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.originName.toLowerCase().includes(q) && !t.destinationName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Cari Tumpangan</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} perjalanan ditemukan</p>
          </div>
          {isDriver && (
            <Link href="/trips/new">
              <Button className="gap-2 font-semibold" data-testid="button-create-trip">
                <Plus className="h-4 w-4" /> Buat Perjalanan
              </Button>
            </Link>
          )}
        </div>

        {/* Pencocokan berperingkat */}
        <section className="mb-6 rounded-xl border bg-card p-4" aria-labelledby="judul-pencocokan">
          <h2 id="judul-pencocokan" className="text-base font-semibold">
            Cocokkan perjalanan
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Peringkat dari skoring, bukan urutan waktu. Buka rincian untuk melihat asal angkanya.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label htmlFor="cocok-koridor" className="text-xs font-medium">Koridor</label>
              <Select value={cocokKoridor} onValueChange={setCocokKoridor}>
                <SelectTrigger id="cocok-koridor" data-testid="select-cocok-koridor">
                  <SelectValue placeholder="Pilih koridor" />
                </SelectTrigger>
                <SelectContent>
                  {(daftarKoridor ?? []).map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="cocok-waktu" className="text-xs font-medium">Waktu diinginkan</label>
              <Input
                id="cocok-waktu"
                type="datetime-local"
                value={cocokWaktu}
                onChange={(e) => setCocokWaktu(e.target.value)}
                data-testid="input-cocok-waktu"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cocok-kursi" className="text-xs font-medium">Kursi dibutuhkan</label>
              <Input
                id="cocok-kursi"
                type="number"
                min={1}
                max={6}
                value={cocokKursi}
                onChange={(e) => setCocokKursi(e.target.value)}
                data-testid="input-cocok-kursi"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cocok-toleransi" className="text-xs font-medium">Toleransi waktu, menit</label>
              <Input
                id="cocok-toleransi"
                type="number"
                min={5}
                max={240}
                value={cocokToleransi}
                onChange={(e) => setCocokToleransi(e.target.value)}
                data-testid="input-cocok-toleransi"
              />
            </div>
          </div>

          <Button
            className="mt-3 font-semibold"
            onClick={jalankanPencocokan}
            disabled={sedangCocok}
            data-testid="button-jalankan-pencocokan"
          >
            {sedangCocok ? "Menghitung skor" : "Cocokkan perjalanan"}
          </Button>

          {galatCocok && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {galatCocok}
            </p>
          )}

          {hasilCocok && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">{hasilCocok.jumlahLolos}</span> dari{" "}
                <span className="font-mono tabular-nums">{hasilCocok.jumlahKandidat}</span> kandidat
                lolos aturan gugur. Versi rumus{" "}
                <span className="font-mono">{hasilCocok.versiRumus}</span>.
              </p>

              {hasilCocok.hasil.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm font-medium">Tidak ada perjalanan yang lolos.</p>
                  <p className="text-sm text-muted-foreground">
                    Longgarkan toleransi waktu, atau pilih koridor lain.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {hasilCocok.hasil.map((h, urutan) => (
                    <li key={h.tripId} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            <span className="font-mono tabular-nums text-muted-foreground">
                              #{urutan + 1}
                            </span>{" "}
                            {h.trip?.originName} ke {h.trip?.destinationName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {h.trip?.driver?.name} ·{" "}
                            <span className="font-mono tabular-nums">
                              {h.trip
                                ? new Date(h.trip.departureTime).toLocaleString("id-ID", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </span>{" "}
                            WIB ·{" "}
                            <span className="font-mono tabular-nums">
                              Rp{(h.trip?.pricePerSeat ?? 0).toLocaleString("id-ID")}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold tabular-nums">
                            {h.skor.toFixed(4)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1"
                            aria-expanded={skorTerbuka === h.tripId}
                            onClick={() => setSkorTerbuka(skorTerbuka === h.tripId ? null : h.tripId)}
                            data-testid={`button-rincian-skor-${h.tripId}`}
                          >
                            {skorTerbuka === h.tripId ? "Tutup rincian skor" : "Lihat rincian skor"}
                          </Button>
                        </div>
                      </div>

                      {skorTerbuka === h.tripId && (
                        <div className="mt-3">
                          <RincianSkor
                            skor={h.skor}
                            komponen={h.komponen}
                            rincian={h.rincian}
                            ukuran={h.ukuran}
                          />
                          <Link href={`/trips/${h.tripId}`}>
                            <Button size="sm" className="mt-3">Buka perjalanan ini</Button>
                          </Link>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-card rounded-xl border">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari asal atau tujuan..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
              data-testid="input-search-trips"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="select-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="open">Tersedia</SelectItem>
              <SelectItem value="full">Penuh</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="w-40" data-testid="select-filter-mode">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mode</SelectItem>
              <SelectItem value="social">Sosial/Gratis</SelectItem>
              <SelectItem value="cost-sharing">Cost-Sharing</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCorridor} onValueChange={setFilterCorridor}>
            <SelectTrigger className="w-36" data-testid="select-filter-corridor">
              <SelectValue placeholder="Koridor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Koridor</SelectItem>
              {(daftarKoridor ?? []).map((k) => (
                <SelectItem key={k.id} value={String(k.id)}>{k.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trip cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Tidak ada perjalanan ditemukan</p>
            <p className="text-sm mt-1">Coba ubah filter atau kata pencarian</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(trip => (
              <Link key={trip.id} href={`/trips/${trip.id}`}>
                <Card className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all" data-testid={`card-trip-${trip.id}`}>
                  <CardContent className="py-5">
                    <div className="flex flex-wrap items-start gap-4 justify-between">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-bold text-base">{trip.originName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-bold text-base">{trip.destinationName}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(trip.departureTime).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} •{" "}
                              {new Date(trip.departureTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {trip.availableSeats - (trip.bookedSeats ?? 0)}/{trip.availableSeats} kursi
                            </span>
                            {trip.koridor && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {trip.koridor.nama}
                              </span>
                            )}
                          </div>
                          {trip.driver && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                {trip.driver.name.slice(0, 1)}
                              </div>
                              <span>{trip.driver.name}</span>
                              {trip.driver.ktpVerified && <Badge variant="outline" className="text-xs py-0 px-1.5">KTP</Badge>}
                              {trip.driver.simVerified && <Badge variant="outline" className="text-xs py-0 px-1.5">SIM</Badge>}
                              <span className="flex items-center gap-0.5">
                                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                {trip.driver.trustScore?.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[trip.status] ?? ''}`}>
                          {STATUS_LABEL[trip.status] ?? trip.status}
                        </span>
                        <span className="font-bold text-lg text-primary">
                          {trip.priceMode === 'social' ? 'GRATIS' : `Rp${(trip.pricePerSeat ?? 0).toLocaleString('id-ID')}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{MODE_LABEL[trip.priceMode]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
