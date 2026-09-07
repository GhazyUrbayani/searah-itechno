import { useQuery } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Leaf, Fuel, Coins, Calendar, FileText, AlertCircle } from "lucide-react";
import type { ParameterDampak } from "@shared/schema";
import type { AgregatDampak } from "@shared/dampak";

export default function DampakPage() {
  const { data: agregat, isLoading: muatAgregat } = useQuery<AgregatDampak>({
    queryKey: ["/api/dampak/agregat"],
    queryFn: async () => {
      const res = await fetch("/api/dampak/agregat");
      if (!res.ok) throw new Error("Gagal memuat agregat dampak");
      return res.json();
    },
  });

  const { data: parameter, isLoading: muatParameter } = useQuery<ParameterDampak[]>({
    queryKey: ["/api/parameter-dampak"],
    queryFn: async () => {
      const res = await fetch("/api/parameter-dampak");
      if (!res.ok) throw new Error("Gagal memuat parameter dampak");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Ledger Dampak</h1>
          <p className="text-muted-foreground mt-1">
            Penghematan bahan bakar dan emisi dari perjalanan bersama.
          </p>
        </div>

        {/* Ringkasan Angka Agregat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Emisi Dihindari</p>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {muatAgregat ? "..." : (agregat?.totalKgCo2eDihemat ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">kg CO2e</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">BBM Dihemat</p>
                  <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {muatAgregat ? "..." : (agregat?.totalLiterDihemat ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">liter bahan bakar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Biaya BBM Dihemat</p>
                  <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    Rp{muatAgregat ? "..." : (agregat?.totalRupiahDihemat ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">rupiah nilai BBM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Perjalanan Selesai</p>
                  <p className="text-2xl font-bold mt-1">
                    {muatAgregat ? "..." : (agregat?.totalPerjalanan ?? 0).toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">tercatat di ledger</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grafik Deret Waktu Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tren mingguan</CardTitle>
              <CardDescription>
                kg CO2e dan liter per minggu
              </CardDescription>
            </CardHeader>
            <CardContent>
              {muatAgregat ? (
                <Skeleton className="h-64 w-full" />
              ) : !agregat?.mingguan.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Belum ada data perjalanan selesai.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={agregat.mingguan} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="minggu" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="kgCo2eDihemat"
                        name="kg CO2e dihindari"
                        stroke="hsl(149, 81%, 23%)"
                        fill="hsl(149, 81%, 23%)"
                        fillOpacity={0.2}
                      />
                      <Area
                        isAnimationActive={false}
                        type="monotone"
                        dataKey="literDihemat"
                        name="Liter BBM dihemat"
                        stroke="hsl(211, 27%, 32%)"
                        fill="hsl(211, 27%, 32%)"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rupiah dihemat</CardTitle>
              <CardDescription>
                Nilai bahan bakar yang tidak terbakar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {muatAgregat ? (
                <Skeleton className="h-64 w-full" />
              ) : !agregat?.mingguan.length ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Belum ada data perjalanan selesai.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agregat.mingguan} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="minggu" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar
                        isAnimationActive={false}
                        dataKey="rupiahDihemat"
                        name="Rupiah dihemat"
                        fill="hsl(45, 97%, 46%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Metodologi dan Penjelasan Rumus */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Cara hitung
            </CardTitle>
            <CardDescription>
              Dihitung sekali saat perjalanan selesai, lalu disimpan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Angka lama tidak ikut berubah saat parameter diperbarui. Versi rumus ikut
              tersimpan di tiap baris.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">1. Liter BBM Dihemat</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  (Jarak / Konsumsi) * Faktor Pengalihan
                </code>
                <p className="text-xs mt-2">
                  Dari data kendaraan. Kosong, pakai 12 km/liter.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">2. Reduksi Emisi Karbon</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  Liter Dihemat * Faktor Emisi Bensin
                </code>
                <p className="text-xs mt-2">
                  Bensin, 2,32 kg CO2e per liter.
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="font-semibold text-foreground mb-1">3. Penghematan Biaya BBM</p>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  Liter Dihemat * Harga BBM Acuan
                </code>
                <p className="text-xs mt-2">
                  Harga acuan Rp10.000 per liter.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Batas model</p>
                <p className="mt-0.5">
                  Angka 0,6 berarti kami menduga 6 dari 10 penumpang akan menyetir sendiri
                  tanpa Searah. Dugaan ini belum diuji lapangan.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabel Parameter Dampak dari Basis Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parameter aktif</CardTitle>
            <CardDescription>
              Tersimpan sebagai baris, bisa diubah tanpa deploy ulang.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {muatParameter ? (
              <Skeleton className="h-40 w-full" />
            ) : !parameter?.length ? (
              <p className="text-sm text-muted-foreground">Data parameter belum terisi.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kunci Parameter</TableHead>
                      <TableHead>Nilai</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>Sumber Rujukan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameter.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.kunci}</TableCell>
                        <TableCell className="font-bold">{p.nilai}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{p.satuan}</TableCell>
                        <TableCell className="text-xs">{p.sumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
