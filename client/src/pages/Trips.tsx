import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SELANG_POLLING_MS } from "@/lib/queryClient";
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
import type { Trip, PengemudiPublik, Koridor } from "@shared/schema";

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

  if (!user) { navigate("/login"); return null; }

  const { data: trips, isLoading } = useQuery<TripWithDriver[]>({
    queryKey: ["/api/trips"],
    refetchInterval: SELANG_POLLING_MS,
  });

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
              <SelectItem value="kampus">Kampus</SelectItem>
              <SelectItem value="industri">Industri</SelectItem>
              <SelectItem value="stasiun">Stasiun</SelectItem>
              <SelectItem value="event">Event</SelectItem>
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
                        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                          <Car className="h-5 w-5" />
                        </div>
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
