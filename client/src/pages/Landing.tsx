import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "../components/ThemeProvider";
import { Moon, Sun, Shield, Users, MapPin, Zap, Car, Star, ChevronRight, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <svg aria-label="SeArah logo" viewBox="0 0 36 36" width="36" height="36" fill="none">
              <circle cx="18" cy="18" r="17" className="fill-primary" />
              <path d="M10 24 L18 10 L26 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="18" cy="18" r="3" fill="white"/>
              <path d="M13 24 L23 24" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
            </svg>
            <span className="font-display font-extrabold text-xl text-primary">SeArah</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/login">
              <Button variant="outline" size="sm">Masuk</Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="font-semibold">Daftar Gratis</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* BG decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent/8 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-6 font-medium gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary inline-block animate-pulse" />
                Platform Carpool Terverifikasi Indonesia
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
                Searah Tujuan,{" "}
                <span className="text-primary">Berbagi Perjalanan</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-xl">
                Bukan ojek online. Bukan taksi ilegal. SeArah menghubungkan driver yang sedang bepergian dengan penumpang yang searah — aman, terverifikasi, dan mendukung warga.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login">
                  <Button size="lg" className="font-bold gap-2 w-full sm:w-auto" data-testid="button-hero-cta">
                    Mulai Sekarang <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
                  Lihat Cara Kerja
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Identitas Terverifikasi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Live Tracking</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Panic Button</span>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl bg-card border shadow-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Perjalanan Tersedia</span>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">3 kursi</Badge>
                </div>
                {[
                  { from: "Kos Dago Atas", to: "Kampus ITB", time: "07:00", price: "Rp5.000", mode: "cost-sharing" },
                  { from: "Antapani", to: "ITB Jatinangor", time: "07:30", price: "Rp12.000", mode: "cost-sharing" },
                  { from: "Setrasari", to: "Stasiun Bandung", time: "08:00", price: "Gratis", mode: "social" },
                ].map((trip, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{trip.from} → {trip.to}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{trip.time} WIB</span>
                        <span className={`text-sm font-bold ${trip.mode === 'social' ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>
                          {trip.price}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">✓ Semua driver telah terverifikasi KTP</span>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-accent text-accent-foreground rounded-xl px-3 py-2 text-sm font-bold shadow-lg">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  4.8 Rating
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-card border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "2.400+", label: "Penumpang Terverifikasi" },
              { value: "320+", label: "Driver Aktif" },
              { value: "3 Koridor", label: "Pilot Aktif" },
              { value: "98%", label: "Tingkat Keamanan" },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-extrabold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Cara Kerja SeArah</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Platform matching berbasis rute nyata — bukan mencari penumpang, melainkan berbagi kursi kosong</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12">
            {/* Driver */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">D</div>
                <h3 className="text-xl font-bold">Untuk Driver</h3>
              </div>
              {[
                { step: "1", title: "Daftar & Verifikasi", desc: "Upload KTP, SIM, dan foto diri untuk mendapatkan badge terverifikasi" },
                { step: "2", title: "Input Perjalanan", desc: "Masukkan asal, tujuan, jam berangkat, dan kursi kosong yang ingin dibagi" },
                { step: "3", title: "Terima Penumpang", desc: "Sistem mencocokkan penumpang yang searah, kamu tinggal terima atau tolak" },
                { step: "4", title: "Mulai & Selesai", desc: "Live tracking aktif, dana diterima setelah perjalanan selesai dan dikonfirmasi" },
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <div className="font-semibold mb-0.5">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Passenger */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold">P</div>
                <h3 className="text-xl font-bold">Untuk Penumpang</h3>
              </div>
              {[
                { step: "1", title: "Daftar & Verifikasi", desc: "Verifikasi nomor HP dan opsional KTP untuk akses mode sosial gratis" },
                { step: "2", title: "Cari Tumpangan", desc: "Masukkan tujuanmu dan temukan driver yang melintas searah" },
                { step: "3", title: "Pesan & Bayar", desc: "Konfirmasi titik jemput, bayar biaya berbagi (bensin/tol/parkir)" },
                { step: "4", title: "Perjalanan Aman", desc: "Ikuti tracking real-time, bagikan ke kontak darurat, tombol panic tersedia" },
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent-foreground text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 dark:text-foreground">
                    {s.step}
                  </div>
                  <div>
                    <div className="font-semibold mb-0.5">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service modes */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Tiga Mode Layanan</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🤝",
                title: "Mode Sosial",
                subtitle: "Gratis / Sangat Murah",
                desc: "Untuk warga ekonomi rendah terverifikasi KTP/DTKS. Ongkos gratis atau sangat murah, disubsidi program.",
                badge: "Subsidi",
                badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              },
              {
                icon: "⛽",
                title: "Cost-Sharing",
                subtitle: "Berbagi Biaya Perjalanan",
                desc: "Untuk komuter umum. Penumpang berbagi biaya bensin, tol, dan parkir secara proporsional.",
                badge: "Paling Populer",
                badgeColor: "bg-primary/10 text-primary",
              },
              {
                icon: "⭐",
                title: "Mode Premium",
                subtitle: "SLA Lebih Jelas",
                desc: "Untuk kalangan menengah dengan jaminan ketepatan waktu lebih baik. Tetap dibatasi agar tidak menjadi taksi ilegal.",
                badge: "Premium",
                badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              },
            ].map((mode, i) => (
              <div key={i} className="bg-card rounded-2xl border p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{mode.icon}</div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-bold text-lg">{mode.title}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${mode.badgeColor}`}>
                    {mode.badge}
                  </span>
                </div>
                <p className="text-sm font-semibold text-primary mb-2">{mode.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{mode.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4">Safety by Architecture</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Keamanan bukan sekadar syarat Terms of Service — melainkan terbangun dalam setiap fitur platform</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Shield className="h-5 w-5" />, title: "KYC Bertingkat", desc: "OTP → KTP → SIM → Selfie liveness → STNK" },
              { icon: <MapPin className="h-5 w-5" />, title: "Live Tracking", desc: "Seluruh perjalanan dipantau real-time di aplikasi" },
              { icon: <Zap className="h-5 w-5" />, title: "Panic Button", desc: "Satu ketuk kirim darurat ke 3 kontak + admin" },
              { icon: <Users className="h-5 w-5" />, title: "Trust Score", desc: "Skor kepercayaan berbasis rating, riwayat, dan kepatuhan" },
              { icon: <Star className="h-5 w-5" />, title: "Escrow Pembayaran", desc: "Dana ditahan hingga perjalanan dikonfirmasi selesai" },
              { icon: <CheckCircle className="h-5 w-5" />, title: "Deteksi Anomali", desc: "GPS spoofing, cancel berulang, dan frekuensi trip abnormal terdeteksi otomatis" },
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <div className="font-semibold text-sm mb-1">{feature.title}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Siap Bergabung dengan SeArah?</h2>
          <p className="mb-8 opacity-90 max-w-xl mx-auto">
            Pilot aktif di Bandung — koridor kampus, industri, dan stasiun. Daftarkan dirimu sekarang.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="font-bold gap-2">
                Daftar sebagai Penumpang
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="bg-white/20 hover:bg-white/30 border-white/30 border font-bold">
                Daftar sebagai Driver
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <svg aria-label="SeArah logo" viewBox="0 0 36 36" width="24" height="24" fill="none">
              <circle cx="18" cy="18" r="17" className="fill-primary" />
              <path d="M10 24 L18 10 L26 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="18" cy="18" r="3" fill="white"/>
            </svg>
            <span className="font-display font-bold text-primary">SeArah</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © 2026 SeArah. Platform carpool terverifikasi berbasis perjalanan nyata.
          </p>
          <p className="text-xs text-muted-foreground">MVP · Pilot Bandung</p>
        </div>
      </footer>
    </div>
  );
}
