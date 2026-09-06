import { useAuth } from "../components/AuthContext";
import { useLocation } from "wouter";
import Navbar from "../components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Shield, Car, CheckCircle, XCircle, User } from "lucide-react";

export default function ProfilePage() {
  const { user, keluar } = useAuth();
  const [, navigate] = useLocation();

  if (!user) { navigate("/login"); return null; }

  const trustLevel = (score: number) => {
    if (score >= 4.8) return { label: "Sangat Terpercaya", color: "text-green-600 dark:text-green-400" };
    if (score >= 4.0) return { label: "Terpercaya", color: "text-blue-600 dark:text-blue-400" };
    if (score >= 3.0) return { label: "Cukup", color: "text-yellow-600 dark:text-yellow-400" };
    return { label: "Perlu Perhatian", color: "text-red-600 dark:text-red-400" };
  };
  const trust = trustLevel(user.trustScore ?? 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <h1 className="text-2xl font-extrabold">Profil Saya</h1>

        {/* Avatar & basic info */}
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-extrabold flex-shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold" data-testid="text-profile-name">{user.name}</h2>
                <p className="text-muted-foreground text-sm">{user.phone}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                  <Badge variant="outline" className="capitalize">{user.category}</Badge>
                  {user.gender !== "unspecified" && <Badge variant="outline" className="capitalize">{user.gender}</Badge>}
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`h-4 w-4 ${i <= Math.floor(user.trustScore ?? 5) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                  ))}
                  <span className="font-bold text-sm">{user.trustScore?.toFixed(1)}</span>
                  <span className={`text-sm font-medium ${trust.color}`}>— {trust.label}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verifikasi */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Status Verifikasi</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Nomor HP (OTP)", status: true, required: true },
              { label: "KTP / e-KYC", status: user.ktpVerified ?? false, required: true },
              { label: "SIM (untuk driver)", status: user.simVerified ?? false, required: user.role === "driver" },
              { label: "Selfie Liveness", status: false, required: false },
              { label: "STNK Kendaraan", status: false, required: user.role === "driver" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {item.status ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className={`h-4 w-4 ${item.required ? 'text-red-500' : 'text-muted-foreground'}`} />
                  )}
                  <span className={item.required && !item.status ? 'font-medium' : ''}>{item.label}</span>
                  {item.required && <Badge variant="outline" className="text-xs py-0">Wajib</Badge>}
                </div>
                {!item.status && (
                  <Button size="sm" variant="ghost" className="text-xs text-primary h-7">
                    Verifikasi
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-extrabold text-primary">{user.totalTrips}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Perjalanan</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-extrabold text-primary">{user.trustScore?.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">Trust Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="text-2xl font-extrabold capitalize">
                {user.category === 'social' ? '🤝' : user.category === 'premium' ? '⭐' : '👤'}
              </div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">{user.category}</div>
            </CardContent>
          </Card>
        </div>

        {/* Safety */}
        <Card>
          <CardHeader><CardTitle className="text-base">Keamanan</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Kontak darurat (max 3 orang) yang dihubungi saat panic button ditekan:</p>
            <div className="space-y-2">
              {["Belum ditambahkan", "Belum ditambahkan"].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Kontak {i + 1}</span>
                  <Button size="sm" variant="ghost" className="text-xs text-primary h-7">Tambah</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full" onClick={async () => { await keluar(); navigate("/"); }}>
          Keluar dari Akun
        </Button>
      </main>
    </div>
  );
}
