import { useEffect } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuth } from "./components/AuthContext";

import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import TripsPage from "./pages/Trips";
import TripDetailPage from "./pages/TripDetail";
import CreateTripPage from "./pages/CreateTrip";
import BookingsPage from "./pages/Bookings";
import ProfilePage from "./pages/Profile";
import AdminPage from "./pages/Admin";
import DampakPage from "./pages/Dampak";
import KepatuhanPage from "./pages/Kepatuhan";
import NotFound from "./pages/not-found";

function LayarMemuat() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
      <p className="text-sm text-muted-foreground">Memeriksa sesi</p>
    </div>
  );
}

/**
 * Menahan render halaman sampai sesi selesai diperiksa ke server.
 *
 * Tanpa penahan ini, halaman terlindungi akan melempar pengguna ke layar masuk
 * pada render pertama, karena sesi belum sempat dibaca dari GET /api/auth/me.
 */
function RuteTerlindungi({
  component: Komponen,
  peran,
}: {
  component: () => JSX.Element | null;
  peran?: string[];
}) {
  const { user, sedangMemuat } = useAuth();
  const [, navigate] = useLocation();

  const bolehMasuk = user !== null && (!peran || peran.includes(user.role));

  useEffect(() => {
    if (sedangMemuat) return;
    if (!user) navigate("/login");
    else if (!bolehMasuk) navigate("/dashboard");
  }, [sedangMemuat, user, bolehMasuk, navigate]);

  if (sedangMemuat) return <LayarMemuat />;
  if (!bolehMasuk) return null;
  return <Komponen />;
}

function Rute() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard">
        <RuteTerlindungi component={DashboardPage} />
      </Route>
      <Route path="/trips/new">
        <RuteTerlindungi component={CreateTripPage} peran={["driver", "admin"]} />
      </Route>
      <Route path="/trips/:id">
        <RuteTerlindungi component={TripDetailPage} />
      </Route>
      <Route path="/trips">
        <RuteTerlindungi component={TripsPage} />
      </Route>
      <Route path="/bookings">
        <RuteTerlindungi component={BookingsPage} />
      </Route>
      <Route path="/profile">
        <RuteTerlindungi component={ProfilePage} />
      </Route>
      <Route path="/admin">
        <RuteTerlindungi component={AdminPage} peran={["admin"]} />
      </Route>
      <Route path="/dampak" component={DampakPage} />
      <Route path="/kepatuhan" component={KepatuhanPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router hook={useHashLocation}>
            <Rute />
          </Router>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
