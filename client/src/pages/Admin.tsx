import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Car, BookOpen, AlertTriangle, TrendingUp, Shield, CheckCircle, XCircle } from "lucide-react";
import type { User, Trip, Booking, Incident } from "@shared/schema";

type EnrichedIncident = Incident & { reporter?: User };

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  if (!user) { navigate("/login"); return null; }
  if (!isAdmin) { navigate("/dashboard"); return null; }

  const { data: stats } = useQuery<{
    totalUsers: number; totalDrivers: number; totalTrips: number; totalBookings: number; openIncidents: number;
  }>({ queryKey: ["/api/admin/stats"] });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({ queryKey: ["/api/users"] });
  const { data: trips, isLoading: tripsLoading } = useQuery<Trip[]>({ queryKey: ["/api/trips"] });
  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({ queryKey: ["/api/bookings"] });
  const { data: incidents, isLoading: incidentsLoading } = useQuery<EnrichedIncident[]>({ queryKey: ["/api/incidents"] });

  const suspendMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/users/${id}/suspend`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Akun disuspend" });
    },
  });

  const resolveIncidentMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/incidents/${id}/status`, { status: "resolved" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Insiden ditandai selesai" });
    },
  });

  const INCIDENT_COLORS: Record<string, string> = {
    open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    investigating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Panel Admin SeArah
          </h1>
          <p className="text-muted-foreground text-sm">Monitor, audit, dan kelola seluruh aktivitas platform</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: <Users className="h-5 w-5" />, value: stats?.totalUsers ?? "-", label: "Total Pengguna", color: "text-blue-600 dark:text-blue-400" },
            { icon: <Car className="h-5 w-5" />, value: stats?.totalDrivers ?? "-", label: "Driver Aktif", color: "text-green-600 dark:text-green-400" },
            { icon: <TrendingUp className="h-5 w-5" />, value: stats?.totalTrips ?? "-", label: "Total Trip", color: "text-primary" },
            { icon: <BookOpen className="h-5 w-5" />, value: stats?.totalBookings ?? "-", label: "Total Pesanan", color: "text-purple-600 dark:text-purple-400" },
            { icon: <AlertTriangle className="h-5 w-5" />, value: stats?.openIncidents ?? "-", label: "Insiden Terbuka", color: "text-red-600 dark:text-red-400" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className={`flex items-center gap-2 mb-1 ${s.color}`}>
                  {s.icon}
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <div className={`text-3xl font-extrabold ${s.color}`}>{s.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Pengguna</TabsTrigger>
            <TabsTrigger value="trips">Perjalanan</TabsTrigger>
            <TabsTrigger value="incidents">
              Insiden {(stats?.openIncidents ?? 0) > 0 && (
                <Badge className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0">{stats?.openIncidents}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bookings">Pesanan</TabsTrigger>
          </TabsList>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader><CardTitle className="text-base">Manajemen Pengguna</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {usersLoading ? <Skeleton className="h-48" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Trust</TableHead>
                        <TableHead>KTP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(u => (
                        <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{u.phone}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{u.category}</Badge></TableCell>
                          <TableCell>
                            <span className="font-bold">{u.trustScore?.toFixed(1)}</span>
                          </TableCell>
                          <TableCell>
                            {u.ktpVerified
                              ? <CheckCircle className="h-4 w-4 text-green-500" />
                              : <XCircle className="h-4 w-4 text-red-400" />
                            }
                          </TableCell>
                          <TableCell>
                            {u.isSuspended
                              ? <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Suspend</Badge>
                              : <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Aktif</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            {!u.isSuspended && u.role !== "admin" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs text-destructive border-destructive/30 h-7"
                                onClick={() => suspendMutation.mutate(u.id)}
                                disabled={suspendMutation.isPending}
                                data-testid={`button-suspend-${u.id}`}
                              >
                                Suspend
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trips */}
          <TabsContent value="trips">
            <Card>
              <CardHeader><CardTitle className="text-base">Manajemen Perjalanan</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {tripsLoading ? <Skeleton className="h-48" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rute</TableHead>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Kursi</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Koridor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips?.map(trip => (
                        <TableRow key={trip.id} data-testid={`row-trip-${trip.id}`}>
                          <TableCell className="font-medium max-w-48 truncate">
                            {trip.originName} → {trip.destinationName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(trip.departureTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell className="capitalize">{trip.priceMode}</TableCell>
                          <TableCell>{trip.bookedSeats}/{trip.availableSeats}</TableCell>
                          <TableCell>{trip.priceMode === 'social' ? 'Gratis' : `Rp${(trip.pricePerSeat ?? 0).toLocaleString('id-ID')}`}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{trip.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{trip.koridorId}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents */}
          <TabsContent value="incidents">
            <Card>
              <CardHeader><CardTitle className="text-base">Laporan Insiden</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {incidentsLoading ? <Skeleton className="h-48" /> :
                  !incidents?.length ? (
                    <p className="text-center text-muted-foreground py-8">Tidak ada insiden</p>
                  ) : (
                    incidents.map(inc => (
                      <div key={inc.id} className="flex items-start justify-between gap-4 p-4 rounded-xl border" data-testid={`card-incident-${inc.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge className={INCIDENT_COLORS[inc.status ?? 'open']}>
                              {inc.status === 'open' ? 'Terbuka' : inc.status === 'investigating' ? 'Diselidiki' : 'Selesai'}
                            </Badge>
                            <Badge variant="outline" className="capitalize">{inc.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(inc.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <p className="text-sm">{inc.description}</p>
                          {inc.reporter && (
                            <p className="text-xs text-muted-foreground mt-1">Pelapor: {inc.reporter.name}</p>
                          )}
                        </div>
                        {inc.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs flex-shrink-0"
                            onClick={() => resolveIncidentMutation.mutate(inc.id)}
                            disabled={resolveIncidentMutation.isPending}
                            data-testid={`button-resolve-${inc.id}`}
                          >
                            Selesaikan
                          </Button>
                        )}
                      </div>
                    ))
                  )
                }
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader><CardTitle className="text-base">Semua Pesanan</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                {bookingsLoading ? <Skeleton className="h-48" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Trip ID</TableHead>
                        <TableHead>Penumpang</TableHead>
                        <TableHead>Titik Jemput</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pembayaran</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings?.map(b => (
                        <TableRow key={b.id} data-testid={`row-booking-${b.id}`}>
                          <TableCell>#{b.id}</TableCell>
                          <TableCell>#{b.tripId}</TableCell>
                          <TableCell>Pengguna #{b.passengerId}</TableCell>
                          <TableCell className="text-sm">{b.pickupName}</TableCell>
                          <TableCell>{b.totalPrice === 0 ? 'Gratis' : `Rp${(b.totalPrice ?? 0).toLocaleString('id-ID')}`}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{b.status}</Badge></TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{b.paymentStatus}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
