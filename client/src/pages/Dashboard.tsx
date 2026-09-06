import { useAuth } from "../components/AuthContext";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SELANG_POLLING_MS } from "@/lib/queryClient";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Car, MapPin, Clock, Star, Plus, ChevronRight, Shield, Users, Zap } from "lucide-react";
import type { Trip, PengemudiPublik, Koridor } from "@shared/schema";

type TripWithDriver = Trip & { driver?: PengemudiPublik | null; koridor?: Koridor | null };

const PRICE_MODE_LABEL: Record<string, string> = {
  social: "Gratis/Sosial",
  "cost-sharing": "Cost-Sharing",
  premium: "Premium",
};
const PRICE_MODE_COLOR: Record<string, string> = {
  social: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "cost-sharing": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  premium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function DashboardPage() {
  const { user, isAdmin, isDriver } = useAuth();
  const [, navigate] = useLocation();

  if (!user) {
    navigate("/login");
    return null;
  }

  const { data: trips, isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ["/api/trips"],
    refetchInterval: SELANG_POLLING_MS,
  });

  const openTrips = trips?.filter(t => t.status === "open").slice(0, 4) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold mb-1" data-testid="text-welcome">
            Halo, {user.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Panel admin SeArah" : isDriver ? "Kelola perjalananmu" : "Temukan tumpangan searahmu hari ini"}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-extrabold text-primary">{user.trustScore?.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Trust Score</div>
              <div className="flex items-center gap-0.5 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-3 w-3 ${i <= Math.floor(user.trustScore ?? 5) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-extrabold text-primary">{user.totalTrips}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Perjalanan</div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">Aktif</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-extrabold">
                {user.ktpVerified ? <span className="text-green-600 dark:text-green-400">✓</span> : <span className="text-amber-500">!</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">KTP Verifikasi</div>
              <div className={`text-xs mt-1 font-medium ${user.ktpVerified ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                {user.ktpVerified ? "Terverifikasi" : "Belum"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-2xl font-extrabold capitalize">{user.category}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Kategori Akun</div>
              <Badge variant="secondary" className="text-xs mt-1 capitalize">{user.role}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {isDriver && (
            <Link href="/trips/new">
              <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">Buat Perjalanan</div>
                    <div className="text-xs text-muted-foreground">Tawarkan kursi kosong</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          )}
          <Link href="/trips">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <MapPin className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold">Cari Tumpangan</div>
                  <div className="text-xs text-muted-foreground">Temukan perjalanan searah</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/bookings">
            <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold">Pesananku</div>
                  <div className="text-xs text-muted-foreground">Riwayat & aktif</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent trips */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Perjalanan Tersedia</h2>
            <Link href="/trips">
              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : openTrips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Belum ada perjalanan tersedia saat ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openTrips.map(trip => (
                <Link key={trip.id} href={`/trips/${trip.id}`}>
                  <Card className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all" data-testid={`card-trip-${trip.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Car className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="font-medium text-foreground truncate">{trip.originName}</span>
                              <span className="flex-shrink-0">→</span>
                              <span className="font-medium text-foreground truncate">{trip.destinationName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(trip.departureTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                              </span>
                              <span>{trip.availableSeats - (trip.bookedSeats ?? 0)} kursi tersisa</span>
                              {trip.driver && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                  {trip.driver.trustScore?.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRICE_MODE_COLOR[trip.priceMode]}`}>
                            {PRICE_MODE_LABEL[trip.priceMode]}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {trip.priceMode === 'social' ? 'Gratis' : `Rp${(trip.pricePerSeat ?? 0).toLocaleString('id-ID')}`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
