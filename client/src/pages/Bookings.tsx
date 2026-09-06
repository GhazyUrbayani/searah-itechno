import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Car, Clock, MapPin, Star, Leaf, ChevronDown, ChevronUp } from "lucide-react";
import type { Booking, Trip, User, LedgerDampak } from "@shared/schema";

type EnrichedBooking = Booking & { trip?: Trip; driver?: User };

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "in-progress": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  "in-progress": "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

function PanelDampakBooking({ bookingId }: { bookingId: number }) {
  const [buka, setBuka] = useState(false);
  const { data: ledger, isLoading } = useQuery<LedgerDampak>({
    queryKey: ["/api/ledger-dampak", bookingId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/ledger-dampak/${bookingId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: buka,
  });

  return (
    <div className="mt-3 pt-3 border-t w-full">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs text-primary font-medium flex items-center gap-1.5"
        onClick={() => setBuka(!buka)}
        data-testid={`button-toggle-dampak-${bookingId}`}
      >
        <Leaf className="h-3.5 w-3.5" />
        <span>Rincian Dampak Lingkungan</span>
        {buka ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {buka && (
        <div className="mt-2 p-3 rounded-lg bg-muted/40 text-xs space-y-2 border">
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : !ledger ? (
            <p className="text-muted-foreground">Data dampak belum tercatat untuk pemesanan ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-[10px]">BBM Dihemat</p>
                  <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                    {ledger.literDihemat.toFixed(2)} L
                  </p>
                </div>
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-[10px]">Emisi Dihindari</p>
                  <p className="font-bold text-sm text-primary">
                    {ledger.kgCo2eDihemat.toFixed(2)} kg
                  </p>
                </div>
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-[10px]">Nilai BBM</p>
                  <p className="font-bold text-sm text-amber-600 dark:text-amber-400">
                    Rp{Math.round(ledger.rupiahDihemat).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="p-2 rounded bg-background border">
                  <p className="text-muted-foreground text-[10px]">Jarak Dihitung</p>
                  <p className="font-bold text-sm">
                    {ledger.jarakKm.toFixed(1)} km
                  </p>
                </div>
              </div>

              <div className="p-2 rounded bg-background/50 border text-muted-foreground text-[11px] space-y-1">
                <p className="font-medium text-foreground">Cara hitung dampak:</p>
                <p>
                  BBM dihemat dihitung dari jarak {ledger.jarakKm.toFixed(1)} km dibagi konsumsi bahan bakar,
                  lalu dikalikan faktor pengalihan moda 0,6.
                </p>
                <p>
                  Emisi karbon dihitung dengan faktor 2,32 kg CO2e per liter bahan bakar.
                </p>
                <p className="font-mono text-[10px] text-muted-foreground pt-1">
                  Versi rumus: {ledger.versiRumus}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user) { navigate("/login"); return null; }

  const { data: bookings, isLoading } = useQuery<EnrichedBooking[]>({
    queryKey: ["/api/passengers", user.id, "bookings"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/passengers/${user.id}/bookings`);
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/bookings/${id}/status`, { status: "cancelled" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/passengers", user.id, "bookings"] });
      toast({ title: "Pemesanan dibatalkan" });
    },
    onError: () => toast({ title: "Gagal", description: "Tidak dapat membatalkan", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold">Pesananku</h1>
          <p className="text-muted-foreground text-sm">Riwayat dan status pemesananmu</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        ) : !bookings?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Belum ada pemesanan</p>
            <p className="text-sm mt-1">Temukan tumpangan di halaman Cari Tumpangan</p>
            <Button className="mt-4" onClick={() => navigate("/trips")}>Cari Tumpangan</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        {booking.trip ? (
                          <>
                            <p className="font-bold truncate">
                              {booking.trip.originName} → {booking.trip.destinationName}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(booking.trip.departureTime).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} •{" "}
                                {new Date(booking.trip.departureTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Jemput: {booking.pickupName}
                              </span>
                            </div>
                          </>
                        ) : (
                          <p className="font-medium text-muted-foreground">Trip #{booking.tripId}</p>
                        )}
                        {booking.driver && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {booking.driver.name.slice(0, 1)}
                            </div>
                            <span>Driver: {booking.driver.name}</span>
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              {booking.driver.trustScore?.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={STATUS_COLORS[booking.status] ?? ''}>
                        {STATUS_LABEL[booking.status] ?? booking.status}
                      </Badge>
                      <p className="font-bold text-primary">
                        {booking.totalPrice === 0 ? "Gratis" : `Rp${(booking.totalPrice ?? 0).toLocaleString('id-ID')}`}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{booking.paymentStatus}</p>
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground text-xs"
                          onClick={() => cancelMutation.mutate(booking.id)}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-${booking.id}`}
                        >
                          Batalkan
                        </Button>
                      )}
                    </div>
                  </div>
                  {booking.status === "completed" && (
                    <PanelDampakBooking bookingId={booking.id} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
