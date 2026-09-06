import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserPublic } from "@shared/schema";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

interface AuthContextType {
  user: UserPublic | null;
  /** Benar selama sesi masih diperiksa ke server. */
  sedangMemuat: boolean;
  segarkan: () => Promise<void>;
  keluar: () => Promise<void>;
  isAdmin: boolean;
  isDriver: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  sedangMemuat: true,
  segarkan: async () => {},
  keluar: async () => {},
  isAdmin: false,
  isDriver: false,
});

/**
 * Sumber kebenaran sesi adalah server, bukan state di memori.
 *
 * Sebelumnya pengguna disimpan di useState, sehingga login hilang setiap kali
 * halaman dimuat ulang. Sekarang sesi dibaca dari GET /api/auth/me yang
 * membaca cookie httpOnly, jadi login bertahan setelah refresh.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<{ user: UserPublic } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<{ user: UserPublic } | null>({ on401: "returnNull" }),
    staleTime: 60_000,
    retry: false,
  });

  const user = data?.user ?? null;

  async function segarkan() {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }

  async function keluar() {
    await apiRequest("POST", "/api/auth/logout");
    // Seluruh cache dikosongkan supaya data akun sebelumnya tidak tertinggal
    // di layar setelah pengguna keluar.
    queryClient.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        sedangMemuat: isLoading,
        segarkan,
        keluar,
        isAdmin: user?.role === "admin",
        isDriver: user?.role === "driver",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
