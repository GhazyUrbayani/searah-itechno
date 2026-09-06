import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "../components/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ChevronLeft, MapPin, Clock, Car, Info } from "lucide-react";
import type { Koridor, Institusi } from "@shared/schema";

type KoridorDenganInstitusi = Koridor & { institusi: Institusi | null };

const createTripSchema = z.object({
  originName: z.string().min(3, "Minimal 3 karakter"),
  originLat: z.coerce.number(),
  originLng: z.coerce.number(),
  destinationName: z.string().min(3, "Minimal 3 karakter"),
  destinationLat: z.coerce.number(),
  destinationLng: z.coerce.number(),
  departureTime: z.string().min(1, "Pilih waktu berangkat"),
  availableSeats: z.coerce.number().min(1).max(6),
  priceMode: z.enum(["social", "cost-sharing", "premium"]),
  pricePerSeat: z.coerce.number().min(0).default(0),
  maxDeviationKm: z.coerce.number().min(0).max(10).default(2),
  genderPreference: z.enum(["any", "male", "female"]).default("any"),
  koridorId: z.coerce.number().int().positive({ message: "Pilih koridor" }),
  notes: z.string().optional(),
});

type CreateTripForm = z.infer<typeof createTripSchema>;

export default function CreateTripPage() {
  const { user, isDriver } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user) { navigate("/login"); return null; }
  if (!isDriver) { navigate("/dashboard"); return null; }

  const form = useForm<CreateTripForm>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      originLat: -6.8651,
      originLng: 107.6126,
      destinationLat: -6.8942,
      destinationLng: 107.6096,
      availableSeats: 3,
      priceMode: "cost-sharing",
      pricePerSeat: 5000,
      maxDeviationKm: 2,
      genderPreference: "any",
    },
  });

  // Koridor diambil dari basis data. Perjalanan wajib terikat pada salah satu.
  const { data: daftarKoridor } = useQuery<KoridorDenganInstitusi[]>({
    queryKey: ["/api/koridor"],
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateTripForm) => {
      // driverId dan jarakKm ditentukan server, bukan dikirim klien.
      const res = await apiRequest("POST", "/api/trips", {
        ...data,
        departureTime: new Date(data.departureTime).toISOString(),
        status: "open",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "Perjalanan berhasil dibuat!", description: "Penumpang dapat menemukanmu sekarang." });
      navigate("/trips");
    },
    onError: (galat: unknown) =>
      toast({
        title: "Perjalanan ditolak",
        description: galat instanceof Error ? galat.message : "Periksa kembali isian formulir.",
        variant: "destructive",
      }),
  });

  const priceMode = form.watch("priceMode");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" className="gap-1 mb-6 -ml-2" onClick={() => navigate("/trips")}>
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" /> Buat Perjalanan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tawarkan kursi kosong kendaraanmu kepada penumpang yang searah
          </p>
        </div>

        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="py-3 flex gap-2">
            <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Dengan membuat perjalanan, kamu menyatakan bahwa ini adalah perjalanan asli untuk keperluanmu sendiri.
              Deviasi rute dari tujuan asli maksimal sesuai yang kamu atur.
            </p>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(d => mutation.mutate(d))} className="space-y-6">
            {/* Route */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Rute Perjalanan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="originName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titik Asal</FormLabel>
                    <FormControl><Input placeholder="Contoh: Kos Jalan Dago Atas" {...field} data-testid="input-origin" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="originLat" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lat Asal</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} data-testid="input-origin-lat" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="originLng" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lng Asal</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} data-testid="input-origin-lng" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="destinationName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tujuan</FormLabel>
                    <FormControl><Input placeholder="Contoh: Kampus ITB Ganesha" {...field} data-testid="input-destination" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="destinationLat" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lat Tujuan</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="destinationLng" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lng Tujuan</FormLabel>
                      <FormControl><Input type="number" step="any" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Time & Seats */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Waktu & Kapasitas</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="departureTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waktu Berangkat</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} data-testid="input-departure-time" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="availableSeats" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Kursi</FormLabel>
                      <FormControl><Input type="number" min={1} max={6} {...field} data-testid="input-seats" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="maxDeviationKm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deviasi Maks (km)</FormLabel>
                      <FormControl><Input type="number" min={0} max={10} step={0.5} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader><CardTitle className="text-base">Mode & Harga</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="priceMode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode Layanan</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-price-mode">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="social">Sosial atau Subsidi (warga kurang mampu)</SelectItem>
                        <SelectItem value="cost-sharing">Cost-Sharing (berbagi biaya bahan bakar)</SelectItem>
                        <SelectItem value="premium">Premium (jadwal presisi dan terjamin)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {priceMode !== "social" && (
                  <FormField control={form.control} name="pricePerSeat" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Harga per Kursi (Rp)</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive hover:bg-destructive/10 px-2"
                          onClick={() => {
                            form.setValue("pricePerSeat", 999999);
                            toast({
                              title: "Tarif diatur Rp999.999",
                              description: "Kirim formulir ini untuk menguji penolakan oleh trigger plafon basis data.",
                            });
                          }}
                          data-testid="button-uji-plafon-tarif"
                        >
                          Uji tarif di atas plafon
                        </Button>
                      </div>
                      <FormControl><Input type="number" min={0} step={1000} {...field} data-testid="input-price" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="koridorId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Koridor</FormLabel>
                      <Select
                        onValueChange={(nilai) => field.onChange(Number(nilai))}
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-corridor">
                            <SelectValue placeholder="Pilih koridor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(daftarKoridor ?? []).map((k) => (
                            <SelectItem key={k.id} value={String(k.id)}>
                              {k.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="genderPreference" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferensi Gender</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-gender">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="any">Semua Gender</SelectItem>
                          <SelectItem value="female">Perempuan Saja</SelectItem>
                          <SelectItem value="male">Laki-laki Saja</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan (opsional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Contoh: Tidak merokok, ada AC, dll." {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full font-bold" disabled={mutation.isPending} data-testid="button-submit-trip">
              {mutation.isPending ? "Menyimpan..." : "Buat Perjalanan"}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
