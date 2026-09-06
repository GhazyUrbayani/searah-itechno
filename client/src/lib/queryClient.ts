import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Selang pembaruan berkala, dalam milidetik.
 *
 * Searah berjalan di atas fungsi serverless. Fungsi serverless berumur pendek
 * dan tidak dapat menahan koneksi WebSocket, jadi kesegaran data dijaga dengan
 * penarikan ulang berkala. Nilai ini dipakai pada tampilan yang menunjukkan
 * sisa kursi, karena angka itulah yang paling cepat basi.
 */
export const SELANG_POLLING_MS = 3000;

/** Menyusun pesan galat yang bisa dibaca pengguna dari respons server. */
async function pesanGalat(res: Response): Promise<string> {
  const teks = await res.text();
  if (!teks) return `${res.status} ${res.statusText}`;

  try {
    const data = JSON.parse(teks);

    // Galat validasi Zod dikirim sebagai hasil flatten().
    if (data?.error?.fieldErrors) {
      const rincian = Object.entries(data.error.fieldErrors as Record<string, string[]>)
        .map(([kolom, pesan]) => `${kolom} ${pesan.join(", ")}`)
        .join("; ");
      if (rincian) return rincian;
    }

    const pesan = data?.error ?? data?.message;
    if (typeof pesan === "string") return pesan;
    return teks;
  } catch {
    return teks;
  }
}

async function lemparBilaGagal(res: Response): Promise<void> {
  if (res.ok) return;
  throw new Error(await pesanGalat(res));
}

/**
 * Mengirim satu permintaan ke API dan melempar galat pada respons non-2xx.
 * Selalu menembak jaringan. Tidak ada jalur data tiruan.
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    credentials: "include",
  });

  await lemparBilaGagal(res);
  return res;
}

type PerilakuTanpaIzin = "returnNull" | "throw";

/**
 * Mengubah queryKey menjadi path API. Contoh:
 *   ["/api/trips"]                          -> /api/trips
 *   ["/api/trips", 3]                       -> /api/trips/3
 *   ["/api/passengers", 7, "bookings"]      -> /api/passengers/7/bookings
 */
function bangunUrl(queryKey: readonly unknown[]): string {
  return queryKey
    .filter((bagian) => bagian !== undefined && bagian !== null && bagian !== "")
    .map((bagian) => String(bagian))
    .join("/")
    .replace(/\/{2,}/g, "/");
}

export function getQueryFn<T>(options: { on401: PerilakuTanpaIzin }): QueryFunction<T> {
  return async ({ queryKey }) => {
    const res = await fetch(bangunUrl(queryKey), { credentials: "include" });

    if (res.status === 401 && options.on401 === "returnNull") {
      return null as T;
    }

    await lemparBilaGagal(res);
    return (await res.json()) as T;
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
