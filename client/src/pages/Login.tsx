import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../components/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

/**
 * Akun demo dibuat ulang setiap kali `npm run demo:reset` dijalankan.
 * Kredensial yang sama tercantum di README.
 */
const AKUN_DEMO = [
  { email: "driver@searah.id", password: "searah123", peran: "Pengemudi" },
  { email: "passenger@searah.id", password: "searah123", peran: "Penumpang" },
  { email: "admin@searah.id", password: "searah123", peran: "Admin koridor" },
];

type Mode = "masuk" | "daftar";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [sedangKirim, setSedangKirim] = useState(false);

  const { segarkan } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setSedangKirim(true);
    try {
      if (mode === "masuk") {
        await apiRequest("POST", "/api/auth/login", { email, password });
      } else {
        await apiRequest("POST", "/api/auth/register", {
          name: nama,
          email,
          phone: telepon,
          password,
          role: "passenger",
        });
      }
      await segarkan();
      navigate("/dashboard");
    } catch (galat) {
      toast({
        title: mode === "masuk" ? "Tidak bisa masuk" : "Pendaftaran gagal",
        description: galat instanceof Error ? galat.message : "Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setSedangKirim(false);
    }
  }

  async function masukDemo(akun: (typeof AKUN_DEMO)[number]) {
    setSedangKirim(true);
    try {
      await apiRequest("POST", "/api/auth/login", {
        email: akun.email,
        password: akun.password,
      });
      await segarkan();
      navigate("/dashboard");
    } catch (galat) {
      toast({
        title: "Akun demo belum tersedia",
        description:
          galat instanceof Error
            ? `${galat.message}. Jalankan npm run demo:reset untuk mengisi data demo.`
            : "Jalankan npm run demo:reset untuk mengisi data demo.",
        variant: "destructive",
      });
    } finally {
      setSedangKirim(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-2">
            <svg aria-label="Logo Searah" viewBox="0 0 36 36" width="40" height="40" fill="none">
              <circle cx="18" cy="18" r="17" className="fill-primary" />
              <path
                d="M10 24 L18 10 L26 24"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle cx="18" cy="18" r="3" fill="white" />
              <path d="M13 24 L23 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </svg>
            <span className="text-3xl font-extrabold text-primary font-display">Searah</span>
          </div>
          <p className="text-sm text-muted-foreground">Berbagi kursi kosong di koridor institusi</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === "masuk" ? "Masuk ke Searah" : "Buat akun Searah"}</CardTitle>
            <CardDescription>
              {mode === "masuk"
                ? "Gunakan email institusi dan kata sandi akun kamu."
                : "Isi data diri. Nomor telepon hanya terlihat lawan main setelah pemesanan dikonfirmasi."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={kirim} className="space-y-4">
              {mode === "daftar" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama lengkap</Label>
                    <Input
                      id="nama"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      required
                      minLength={3}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telepon">Nomor telepon</Label>
                    <Input
                      id="telepon"
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      required
                      inputMode="numeric"
                      placeholder="08xxxxxxxxxx"
                      autoComplete="tel"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nama@institusi.ac.id"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata sandi</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "daftar" ? 8 : 1}
                  autoComplete={mode === "masuk" ? "current-password" : "new-password"}
                />
                {mode === "daftar" && (
                  <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={sedangKirim}>
                {sedangKirim
                  ? "Memproses"
                  : mode === "masuk"
                    ? "Masuk"
                    : "Daftar dan masuk"}
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              className="w-full mt-2"
              onClick={() => setMode(mode === "masuk" ? "daftar" : "masuk")}
            >
              {mode === "masuk" ? "Belum punya akun. Daftar" : "Sudah punya akun. Masuk"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Akun demo</CardTitle>
            <CardDescription>Satu klik untuk masuk dengan data contoh.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {AKUN_DEMO.map((akun) => (
              <Button
                key={akun.email}
                type="button"
                variant="outline"
                className="justify-between h-auto py-2"
                disabled={sedangKirim}
                onClick={() => masukDemo(akun)}
              >
                <span className="font-medium">{akun.peran}</span>
                <span className="font-mono text-xs text-muted-foreground">{akun.email}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
