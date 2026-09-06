import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "../components/ThemeProvider";
import {
  Moon,
  Sun,
  Shield,
  Users,
  MapPin,
  Car,
  ChevronRight,
  CheckCircle,
  Clock,
  Fuel,
  Award,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Trip, Koridor, PengemudiPublik } from "@shared/schema";

type TripWithDriver = Trip & { driver?: PengemudiPublik | null; koridor?: Koridor | null };

export default function LandingPage() {
  const { theme, toggle } = useTheme();
  const [, navigate] = useLocation();
  const [koridorPilihan, setKoridorPilihan] = useState<number | null>(null);

  const { data: daftarKoridor } = useQuery<Koridor[]>({
    queryKey: ["/api/koridor"],
    queryFn: async () => {
      const res = await fetch("/api/koridor");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: daftarPerjalanan, isLoading: muatPerjalanan } = useQuery<TripWithDriver[]>({
    queryKey: ["/api/trips"],
    queryFn: async () => {
      const res = await fetch("/api/trips");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Saring perjalanan open untuk papan keberangkatan
  const perjalananAktif = (daftarPerjalanan ?? [])
    .filter((t) => t.status === "open")
    .filter((t) => (koridorPilihan === null ? true : t.koridorId === koridorPilihan))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <svg aria-label="SeArah logo" viewBox="0 0 36 36" width="32" height="32" fill="none">
                  <circle cx="18" cy="18" r="17" className="fill-primary" />
                  <path d="M10 24 L18 10 L26 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <circle cx="18" cy="18" r="3" fill="white"/>
                  <path d="M13 24 L23 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
                </svg>
                <span className="font-display font-extrabold text-xl tracking-tight text-primary">SeArah</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link href="/trips">
                <Button variant="ghost" size="sm">Cari Tumpangan</Button>
              </Link>
              <Link href="/dampak">
                <Button variant="ghost" size="sm">Ledger Dampak</Button>
              </Link>
              <Link href="/kepatuhan">
                <Button variant="ghost" size="sm">Kepatuhan</Button>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Ganti mode tampilan">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/login">
              <Button variant="outline" size="sm">Masuk</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="font-semibold">Daftar</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section dengan Papan Keberangkatan Koridor */}
      <section className="relative overflow-hidden py-12 md:py-20 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Sisi Kiri: Pesan Inti */}
            <div className="lg:col-span-5 space-y-6">
              <Badge variant="secondary" className="font-medium gap-1.5 py-1 px-3">
                <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
                Platform Carpooling Koridor Kampus
              </Badge>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                Searah Tujuan,{" "}
                <span className="text-primary">Berbagi Kursi</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Bukan ojek online atau taksi gelap. SeArah membatasi perjalanan pada koridor tertutup sivitas kampus,
                menegakkan batas tarif per kilometer, dan mencatat penghematan emisi secara permanen.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/trips">
                  <Button size="lg" className="font-bold gap-2 w-full sm:w-auto" data-testid="button-hero-trips">
                    Cari Tumpangan <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dampak">
                  <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                    Lihat Ledger Dampak
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Akun Kampus</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Plafon Tarif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span>Audit Emisi</span>
                </div>
              </div>
            </div>

            {/* Sisi Kanan: Papan Keberangkatan Koridor Hari Ini */}
            <div className="lg:col-span-7">
              <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
                {/* Header Papan Keberangkatan */}
                <div className="bg-primary/5 p-4 border-b flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                      <h2 className="text-base font-bold tracking-tight">Papan Keberangkatan Koridor Hari Ini</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Jadwal langsung perjalanan komuter kampus yang membuka kursi
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px] bg-background">
                    Pembaruan Langsung
                  </Badge>
                </div>

                {/* Filter Koridor Cepat */}
                <div className="px-4 py-2 bg-muted/30 border-b flex items-center gap-2 overflow-x-auto text-xs">
                  <span className="text-muted-foreground shrink-0 font-medium">Pilih Rute:</span>
                  <button
                    onClick={() => setKoridorPilihan(null)}
                    className={`px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                      koridorPilihan === null
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Semua Koridor
                  </button>
                  {daftarKoridor?.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setKoridorPilihan(k.id)}
                      className={`px-2.5 py-1 rounded-full shrink-0 transition-colors ${
                        koridorPilihan === k.id
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-background border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {k.nama}
                    </button>
                  ))}
                </div>

                {/* Daftar Baris Keberangkatan */}
                <div className="divide-y">
                  {muatPerjalanan ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : perjalananAktif.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <Car className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">Belum ada perjalanan terbuka untuk filter ini</p>
                      <p className="text-xs mt-1">Pengemudi dapat membuat perjalanan melalui dasbor</p>
                    </div>
                  ) : (
                    perjalananAktif.map((trip) => {
                      const tgl = new Date(trip.departureTime);
                      const jamMenit = tgl.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const sisaKursi = trip.availableSeats - (trip.bookedSeats ?? 0);

                      return (
                        <div
                          key={trip.id}
                          className="p-4 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          data-testid={`row-departure-${trip.id}`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            {/* Kotak Jam Keberangkatan */}
                            <div className="bg-primary/10 text-primary px-2.5 py-1.5 rounded text-center shrink-0 border border-primary/20">
                              <span className="font-mono text-xs font-extrabold block">{jamMenit}</span>
                              <span className="text-[10px] block text-muted-foreground">WIB</span>
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-semibold truncate">
                                <span>{trip.originName}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>{trip.destinationName}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                {trip.koridor && (
                                  <span className="bg-muted px-2 py-0.5 rounded text-[11px]">
                                    {trip.koridor.nama}
                                  </span>
                                )}
                                <span className="font-mono">{trip.jarakKm?.toFixed(1) ?? "0.0"} km</span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  Tersisa {sisaKursi} kursi
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-sm">
                              {trip.priceMode === "social" ? (
                                <span className="text-green-600 dark:text-green-400">Gratis</span>
                              ) : (
                                `Rp${(trip.pricePerSeat ?? 0).toLocaleString("id-ID")}`
                              )}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs font-semibold"
                              onClick={() => navigate(`/trips/${trip.id}`)}
                            >
                              Pesan Kursi
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Papan */}
                <div className="bg-muted/20 p-3 border-t text-center text-xs text-muted-foreground flex items-center justify-between px-4">
                  <span>Dibatasi oleh trigger kapasitas dan plafon tarif basis data</span>
                  <Link href="/trips">
                    <span className="text-primary font-medium hover:underline cursor-pointer">
                      Lihat Semua Perjalanan →
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ringkasan Angka Kinerja Platform */}
      <section className="py-12 bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono">2</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Institusi Kampus Aktif</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono">3</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Koridor Terdaftar</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono">0,90</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Skor Maksimal Algoritma</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-primary font-mono">100%</div>
              <div className="text-xs sm:text-sm text-muted-foreground mt-1">Trigger Basis Data</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiga Mode Layanan */}
      <section className="py-16 bg-muted/20 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Tiga Mode Layanan</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Fleksibilitas biaya berdasarkan kebutuhan sosial dan komuter institusi
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl border p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Mode Sosial</h3>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                  Subsidi
                </Badge>
              </div>
              <p className="text-xs font-semibold text-primary">Gratis untuk penumpang bersubsidi</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Diperuntukkan bagi mahasiswa atau warga berpenghasilan rendah. Dibiayai melalui kas solidaritas kampus
                dan wajib bertarif nol rupiah sesuai trigger basis data.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Fuel className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Cost-Sharing</h3>
                <Badge className="bg-primary/10 text-primary text-xs">
                  Paling Populer
                </Badge>
              </div>
              <p className="text-xs font-semibold text-primary">Berbagi beban biaya operasional</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Penumpang membagi biaya bahan bakar dan tol secara proporsional dengan pengemudi. Tarif dibatasi oleh
                plafon per kilometer koridor.
              </p>
            </div>

            <div className="bg-card rounded-xl border p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Award className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base">Mode Premium</h3>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                  SLA Jelas
                </Badge>
              </div>
              <p className="text-xs font-semibold text-primary">Kepastian waktu dan kenyamanan</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Jadwal keberangkatan presisi dengan deviasi rute minimal. Tetap mematuhi aturan kuota harian maksimal dua
                perjalanan agar tidak menjadi taksi komersial liar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Arsitektur Keselamatan */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Arsitektur Keselamatan dan Kepatuhan</h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Perlindungan dibangun langsung di dalam lapisan logika dan mesin basis data
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Verifikasi Identitas Institusi</h3>
              <p className="text-xs text-muted-foreground">
                Domain email kampus diverifikasi untuk memastikan pengguna terdaftar di institusi penjamin.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Batas Plafon Tarif per Km</h3>
              <p className="text-xs text-muted-foreground">
                Trigger PostgreSQL menggagalkan penawaran tarif yang melebihi batas tarif per kilometer koridor.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Batas Kuota Dua Trip Harian</h3>
              <p className="text-xs text-muted-foreground">
                Mencegah pengemudi beroperasi sebagai angkutan komersial liar dengan membatasi dua perjalanan aktif per hari.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Integritas Kapasitas Kursi</h3>
              <p className="text-xs text-muted-foreground">
                Trigger kursi penuh memvalidasi ketersediaan kursi secara atomik saat pemesanan dibuat.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Privasi Kontak Bertahap</h3>
              <p className="text-xs text-muted-foreground">
                Nomor telepon dan alamat email hanya dapat diakses setelah pemesanan berstatus terkonfirmasi.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-sm">Ledger Dampak Terkunci</h3>
              <p className="text-xs text-muted-foreground">
                Perhitungan liter bahan bakar dan emisi disimpan permanen saat selesai bersama versi rumus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg aria-label="SeArah logo" viewBox="0 0 36 36" width="24" height="24" fill="none">
              <circle cx="18" cy="18" r="17" className="fill-primary" />
              <path d="M10 24 L18 10 L26 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="18" cy="18" r="3" fill="white"/>
            </svg>
            <span className="font-display font-bold text-primary">SeArah</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Platform carpool koridor tertutup untuk sivitas akademika kampus.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Link href="/dampak">Ledger Dampak</Link>
            <span>·</span>
            <Link href="/kepatuhan">Kepatuhan Basis Data</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
