import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../components/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, SELANG_POLLING_MS } from "@/lib/queryClient";
import { Car, MapPin, Clock, Star, Users, Shield, AlertTriangle, ChevronLeft } from "lucide-react";
import { useState } from "react";
import type { Trip, PengemudiPublik, Koridor, Booking } from "@shared/schema";

type TripDetail = Trip & {
  driver?: PengemudiPublik | null;
  koridor?: Koridor | null;
  bookings?: Booking[];
  jumlahPemesanan?: number;
};

export default function TripDetailPage() {
  const [, params] = useRoute("/trips/:id");
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [pickupName, setPickupName] = useState("");
  const [pickupLat, setPickupLat] = useState("-6.8700");
  const [pickupLng, setPickupLng] = useState("107.6130");

  if (!user) { navigate("/login"); return null; }

  const { data: trip, isLoading } = useQuery<TripDetail>({
    queryKey: ["/api/trips", params?.id],
    refetchInterval: SELANG_POLLING_MS,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/trips/${params?.id}`);
      return res.json();
    },
    enabled: !!params?.id,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        tripId: trip!.id,
        passengerId: user.id,
        pickupName: pickupName || "Titik jemput default",
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        seatsBooked: 1,
        totalPrice: trip!.pricePerSeat ?? 0,
        status: "pending",
        paymentStatus: "unpaid",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Gagal memesan");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips", params?.id] });
      toast({ title: "Berhasil!", description: "Pemesanan kursi berhasil. Tunggu konfirmasi driver." });
      navigate("/bookings");
    },
    onError: (e: Error) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
  });

  const panicMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/incidents", {
        bookingId: null,
        reporterId: user.id,
        type: "panic",
        description: `Panic button ditekan oleh ${user.name} di trip #${trip?.id}`,
        status: "open",
      });
      return res.json();
    },
    onSuccess: () => toast({
      title: "Darurat Dilaporkan",
      description: "Tim keamanan SeArah telah diberitahu. Tetap tenang.",
      variant: "destructive",
    }),
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </main>
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8 text-center text-muted-foreground">
        <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p>Perjalanan tidak ditemukan</p>
      </main>
    </div>
  );

  const seatsLeft = trip.availableSeats - (trip.bookedSeats ?? 0);
  const isOwner = trip.driverId === user.id;
  const canBook = !isOwner && trip.status === "open" && seatsLeft > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-1 mb-6 -ml-2" onClick={() => navigate("/trips")}>
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="md:col-span-2 space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl">
                    {trip.originName} → {trip.destinationName}
                  </CardTitle>
                  <Badge className={
                    trip.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    trip.status === 'full' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-muted text-muted-foreground'
                  }>
                    {trip.status === 'open' ? 'Tersedia' : trip.status === 'full' ? 'Penuh' : trip.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Waktu Berangkat</p>
                    <p className="font-semibold flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" />
                      {new Date(trip.departureTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-sm text-muted-foreground ml-6">
                      {new Date(trip.departureTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Kursi Tersedia</p>
                    <p className="font-semibold flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-primary" />
                      {seatsLeft} dari {trip.availableSeats} kursi
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mode Perjalanan</p>
                    <p className="font-semibold capitalize">{
                      trip.priceMode === 'social' ? 'Sosial/Subsidi' :
                      trip.priceMode === 'cost-sharing' ? 'Bagi Biaya' : 'Premium'
                    }</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Harga per Kursi</p>
                    <p className="font-bold text-lg text-primary">
                      {trip.priceMode === 'social' ? 'GRATIS' : `Rp${(trip.pricePerSeat ?? 0).toLocaleString('id-ID')}`}
                    </p>
                  </div>
                </div>
                {trip.notes && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">Catatan: </span>{trip.notes}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {trip.koridor && <Badge variant="outline">{trip.koridor.nama}</Badge>}
                  {trip.genderPreference && trip.genderPreference !== 'any' && (
                    <Badge variant="outline">
                      {trip.genderPreference === 'female' ? 'Perempuan saja' : 'Laki-laki saja'}
                    </Badge>
                  )}
                  <Badge variant="outline">Deviasi maks {trip.maxDeviationKm} km</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Driver */}
            {trip.driver && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Profil Driver</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                      {trip.driver.name.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base">{trip.driver.name}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={`h-4 w-4 ${i <= Math.floor(trip.driver!.trustScore ?? 5) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                        ))}
                        <span className="font-semibold">{trip.driver.trustScore?.toFixed(1)}</span>
                        <span className="text-muted-foreground">({trip.driver.totalTrips} perjalanan)</span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {trip.driver.ktpVerified && <Badge variant="secondary" className="text-xs gap-1"><Shield className="h-3 w-3" /> KTP</Badge>}
                        {trip.driver.simVerified && <Badge variant="secondary" className="text-xs gap-1"><Shield className="h-3 w-3" /> SIM</Badge>}
                        <Badge variant="secondary" className="text-xs capitalize">{trip.driver.category}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Booking panel */}
          <div className="space-y-4">
            {canBook && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-base text-primary">Pesan Kursi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pickup">Titik Jemput</Label>
                    <Input
                      id="pickup"
                      placeholder="Nama lokasi jemput"
                      value={pickupName}
                      onChange={e => setPickupName(e.target.value)}
                      data-testid="input-pickup-name"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium mb-1">Rincian Pembayaran</p>
                    <div className="flex justify-between">
                      <span>Biaya kursi</span>
                      <span className="font-bold">
                        {trip.priceMode === 'social' ? 'Gratis' : `Rp${(trip.pricePerSeat ?? 0).toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full font-bold"
                    onClick={() => bookMutation.mutate()}
                    disabled={bookMutation.isPending}
                    data-testid="button-book-trip"
                  >
                    {bookMutation.isPending ? "Memproses..." : "Pesan Sekarang"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {isOwner && (
              <Card className="border-primary/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center">Ini adalah perjalananmu</p>
                  <p className="text-center font-bold mt-1">{trip.bookings?.length ?? 0} pemesanan masuk</p>
                </CardContent>
              </Card>
            )}

            {/* Safety */}
            <Card className="border-destructive/20">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Tombol Darurat
                </p>
                <p className="text-xs text-muted-foreground">Jika merasa tidak aman atau dalam bahaya, tekan tombol di bawah ini.</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => panicMutation.mutate()}
                  disabled={panicMutation.isPending}
                  data-testid="button-panic"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {panicMutation.isPending ? "Mengirim..." : "PANIC BUTTON"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Semua perjalanan dipantau langsung. Dana ditahan escrow sampai perjalanan selesai.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
