import { createContext, useContext, useEffect, useState } from "react";

type Tema = "light" | "dark";

const KUNCI_SIMPAN = "searah.tema";

const ThemeContext = createContext<{ theme: Tema; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

/**
 * Tema bawaan adalah terang, karena palet Searah dibangun di atas warna kertas
 * dan tinta. Preferensi sistem tidak dipakai sebagai nilai awal, supaya
 * identitas warna yang dirancang selalu menjadi tampilan pertama. Pilihan
 * pengguna disimpan dan dipulihkan pada kunjungan berikutnya.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Tema>(() => {
    try {
      const tersimpan = localStorage.getItem(KUNCI_SIMPAN);
      if (tersimpan === "light" || tersimpan === "dark") return tersimpan;
    } catch {
      // Penyimpanan lokal dapat diblokir. Jatuh ke nilai bawaan.
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KUNCI_SIMPAN, theme);
    } catch {
      // Kegagalan menyimpan preferensi tidak boleh menghentikan render.
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
