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

      {/*
        Papan keberangkatan mendahului kalimat pemasaran. Orang harus paham
        produknya dari kolom jam, rute, kursi, dan tarif, tanpa membaca satu
        kalimat promosi pun.
      */}
      <section className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
            <div className="max-w-xl">
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                Papan keberangkatan koridor hari ini
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Kursi kosong pada koridor komuter institusi. Tarif dibatasi plafon per kilometer
                yang ditegakkan basis data. Setiap perjalanan selesai menerbitkan catatan
                penghematan bahan bakar dan emisi.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/trips">
                <Button className="font-semibold" data-testid="button-hero-trips">
                  Cari tumpangan
                </Button>
              </Link>
              <Link href="/dampak">
                <Button variant="outline">Lihat ledger dampak</Button>
              </Link>
            </div>
          </div>

          {/* Penyaring koridor */}
          <div className="flex items-center gap-2 overflow-x-auto pb-3 text-xs">
            <span className="shrink-0 text-muted-foreground">Koridor</span>
            <button
              onClick={() => setKoridorPilihan(null)}
              aria-pressed={koridorPilihan === null}
              className={`shrink-0 border px-2.5 py-1 ${
                koridorPilihan === null
                  ? "border-primary bg-primary text-primary-foreground font-semibold"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              Semua
            </button>
            {daftarKoridor?.map((k) => (
              <button
                key={k.id}
                onClick={() => setKoridorPilihan(k.id)}
                aria-pressed={koridorPilihan === k.id}
                className={`shrink-0 border px-2.5 py-1 ${
                  koridorPilihan === k.id
                    ? "border-primary bg-primary text-primary-foreground font-semibold"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {k.nama}
              </button>
            ))}
          </div>

          <div className="papan overflow-x-auto">
            <table className="w-full min-w-[19rem] text-sm">
              <caption className="sr-only">
                Daftar perjalanan yang masih membuka kursi pada koridor terpilih
              </caption>
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">Jam</th>
                  <th scope="col" className="px-3 py-2 font-medium">Rute</th>
                  <th scope="col" className="hidden px-3 py-2 font-medium lg:table-cell">Koridor</th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Jarak</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Kursi</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Tarif</th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {muatPerjalanan ? (
                  [1, 2, 3].map((i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={7} className="px-3 py-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))
                ) : perjalananAktif.length === 0 ? (
                  <tr className="border-t">
                    <td colSpan={7} className="px-3 py-10 text-center">
                      <p className="font-medium">Belum ada kursi terbuka di koridor ini</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Pilih koridor lain, atau tawarkan kursi kendaraanmu sendiri.
                      </p>
                      <Link href="/trips/new">
                        <Button size="sm" className="mt-3">Tawarkan kursi</Button>
                      </Link>
                    </td>
                  </tr>
                ) : (
                  perjalananAktif.map((trip) => {
                    const tgl = new Date(trip.departureTime);
                    const jamMenit = tgl.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const sisaKursi = trip.availableSeats - (trip.bookedSeats ?? 0);
                    const gratis = trip.priceMode === "social";

                    return (
                      <tr
                        key={trip.id}
                        className="cursor-pointer border-t hover:bg-muted/40"
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        data-testid={`row-departure-${trip.id}`}
                      >
                        <td className="whitespace-nowrap px-3 py-3 align-top">
                          <span className="font-mono text-base font-bold">{jamMenit}</span>
                          <span className="ml-1 text-[11px] text-muted-foreground">WIB</span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Link href={`/trips/${trip.id}`}>
                            <span className="font-medium hover:underline">{trip.originName}</span>
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            ke {trip.destinationName}
                          </div>
                        </td>
                        <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground lg:table-cell">
                          {trip.koridor?.nama ?? "-"}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-right align-top font-mono text-xs sm:table-cell">
                          {trip.jarakKm?.toFixed(1) ?? "0.0"} km
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top">
                          <span className="font-mono font-semibold">{sisaKursi}</span>
                          <span className="text-xs text-muted-foreground">/{trip.availableSeats}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right align-top font-mono font-semibold">
                          {gratis ? (
                            <span className="text-primary">Gratis</span>
                          ) : (
                            `Rp${(trip.pricePerSeat ?? 0).toLocaleString("id-ID")}`
                          )}
                        </td>
                        <td className="hidden whitespace-nowrap px-3 py-3 text-right align-top sm:table-cell">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              // Baris juga dapat diklik. Tanpa ini, satu klik
                              // memicu dua kali navigasi.
                              e.stopPropagation();
                              navigate(`/trips/${trip.id}`);
                            }}
                          >
                            Pesan kursi
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border border-t-0 border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <span>Kapasitas kursi dan plafon tarif ditegakkan trigger basis data</span>
            <Link href="/trips">
              <span className="cursor-pointer font-medium text-primary hover:underline">
                Lihat semua perjalanan
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/*
        Angka yang ditampilkan hanya yang benar-benar diukur. Persentase tanpa
        pembilang dan penyebut sengaja tidak dipakai.
      */}
      <section className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {[
              { angka: "2", satuan: "institusi", label: "terdaftar sebagai penjamin identitas" },
              { angka: "3", satuan: "koridor", label: "dengan plafon tarif dan jam operasional sendiri" },
              { angka: "3", satuan: "aturan", label: "ditegakkan trigger PostgreSQL, bukan formulir" },
              { angka: "48", satuan: "unit test", label: "pada modul pencocokan dan modul dampak" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd>
                  <span className="font-mono text-3xl font-bold text-primary">{item.angka}</span>{" "}
                  <span className="text-sm font-medium">{item.satuan}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/*
        Tiga mode tarif disajikan sebagai tabel perbandingan, bukan tiga kartu
        seragam. Pembaca dapat membandingkan kolom yang sama antar baris.
      */}
      <section className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-xl sm:text-2xl font-extrabold">Tiga mode tarif</h2>
          <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">
            Mode menentukan siapa yang membayar dan berapa batasnya. Ketiganya tunduk pada plafon
            tarif per kilometer koridor.
          </p>

          <div className="papan overflow-x-auto">
            <table className="w-full min-w-[19rem] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-3 py-2 font-medium">Mode</th>
                  <th scope="col" className="px-3 py-2 font-medium">Untuk siapa</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Tarif</th>
                  <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">Yang menegakkan</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-3 py-3 font-medium align-top">Sosial</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    Penumpang bertarif bersubsidi. Dibiayai kas solidaritas institusi.
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right align-top font-mono font-semibold text-primary">
                    Rp0
                  </td>
                  <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground md:table-cell">
                    Trigger menolak mode sosial yang tarifnya di atas nol
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-3 font-medium align-top">Cost sharing</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    Penumpang umum. Membagi biaya bahan bakar dan tol dengan pengemudi.
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm font-medium">
                    di bawah plafon
                  </td>
                  <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground md:table-cell">
                    Trigger membandingkan tarif terhadap plafon dikali jarak
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="px-3 py-3 font-medium align-top">Premium</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    Penumpang yang menuntut jadwal presisi dan deviasi rute minimal.
                  </td>
                  <td className="px-3 py-3 text-right align-top text-sm font-medium">
                    tetap di bawah plafon
                  </td>
                  <td className="hidden px-3 py-3 align-top text-xs text-muted-foreground md:table-cell">
                    Kuota dua perjalanan aktif per hari tetap berlaku
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/*
        Aturan kepatuhan ditulis sebagai daftar definisi. Setiap butir menyebut
        aturannya dan objek basis data yang menegakkannya, supaya klaimnya dapat
        diperiksa, bukan hanya dibaca.
      */}
      <section className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-xl sm:text-2xl font-extrabold">Aturan yang dijaga basis data</h2>
          <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">
            Aturan berikut hidup sebagai trigger dan constraint PostgreSQL. Manipulasi dari sisi
            klien tidak dapat menembusnya.
          </p>

          <dl className="divide-y border-y">
            {[
              {
                aturan: "Tarif tidak melebihi plafon koridor",
                objek: "trg_cek_plafon_tarif",
                isi: "Tarif per kursi dibandingkan terhadap plafon per kilometer dikali jarak rute. Jarak dihitung di peladen, bukan dikirim klien.",
              },
              {
                aturan: "Maksimal dua perjalanan aktif per hari",
                objek: "trg_cek_maks_trip_aktif",
                isi: "Menghitung perjalanan berstatus terbuka dan berlangsung milik satu pengemudi pada tanggal yang sama menurut waktu Asia/Jakarta.",
              },
              {
                aturan: "Kursi terpesan tidak melebihi kapasitas",
                objek: "trg_cek_kursi_penuh",
                isi: "Menjumlahkan kursi pada pemesanan yang masih aktif sebelum baris baru diterima.",
              },
              {
                aturan: "Identitas dijamin institusi",
                objek: "koridor.institusi_id",
                isi: "Perjalanan wajib terikat koridor, dan koridor wajib terikat institusi lewat kunci asing.",
              },
              {
                aturan: "Kontak terbuka bertahap",
                objek: "GET /api/bookings/:id/kontak",
                isi: "Nomor telepon hanya keluar bila pemanggil adalah pihak pada pemesanan itu dan statusnya sudah terkonfirmasi.",
              },
              {
                aturan: "Ledger dampak tidak dapat disunting",
                objek: "ledger_dampak.versi_rumus",
                isi: "Hasil disimpan sekali saat perjalanan selesai. Tidak ada endpoint pembaruan maupun penghapusan.",
              },
            ].map((butir) => (
              <div key={butir.objek} className="grid gap-1 py-4 md:grid-cols-12 md:gap-4">
                <dt className="md:col-span-4">
                  <span className="font-medium">{butir.aturan}</span>
                  <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                    {butir.objek}
                  </span>
                </dt>
                <dd className="text-sm text-muted-foreground md:col-span-8">{butir.isi}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

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
