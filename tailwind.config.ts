import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        status: {
          online: "hsl(149 81% 23%)",
          away: "hsl(45 97% 46%)",
          busy: "hsl(3 71% 41%)",
          offline: "hsl(103 7% 79%)",
        },

        /*
         * Kelas warna Tailwind yang sudah telanjur dipakai di halaman
         * dipetakan ke enam nilai palet. Hijau menjadi rambu, kuning dan
         * jingga menjadi marka, merah menjadi sirene, sedangkan biru, ungu,
         * dan abu menjadi turunan tinta dan kabut. Dengan begitu antarmuka
         * tidak pernah menampilkan warna ketujuh, tanpa perlu menyunting
         * ratusan kelas satu per satu.
         */
        green: {
          50: "hsl(149 30% 95%)", 100: "hsl(149 28% 88%)", 200: "hsl(149 26% 78%)",
          300: "hsl(149 28% 62%)", 400: "hsl(149 45% 44%)", 500: "hsl(149 60% 32%)",
          600: "hsl(149 81% 23%)", 700: "hsl(149 81% 19%)", 800: "hsl(149 80% 15%)",
          900: "hsl(149 78% 11%)", 950: "hsl(149 78% 7%)",
        },
        emerald: {
          50: "hsl(149 30% 95%)", 100: "hsl(149 28% 88%)", 200: "hsl(149 26% 78%)",
          300: "hsl(149 28% 62%)", 400: "hsl(149 45% 44%)", 500: "hsl(149 60% 32%)",
          600: "hsl(149 81% 23%)", 700: "hsl(149 81% 19%)", 800: "hsl(149 80% 15%)",
          900: "hsl(149 78% 11%)", 950: "hsl(149 78% 7%)",
        },
        amber: {
          50: "hsl(45 80% 95%)", 100: "hsl(45 78% 87%)", 200: "hsl(45 80% 76%)",
          300: "hsl(45 88% 64%)", 400: "hsl(45 92% 55%)", 500: "hsl(45 97% 46%)",
          600: "hsl(45 97% 39%)", 700: "hsl(43 95% 31%)", 800: "hsl(43 92% 24%)",
          900: "hsl(43 90% 17%)", 950: "hsl(43 90% 11%)",
        },
        yellow: {
          50: "hsl(45 80% 95%)", 100: "hsl(45 78% 87%)", 200: "hsl(45 80% 76%)",
          300: "hsl(45 88% 64%)", 400: "hsl(45 92% 55%)", 500: "hsl(45 97% 46%)",
          600: "hsl(45 97% 39%)", 700: "hsl(43 95% 31%)", 800: "hsl(43 92% 24%)",
          900: "hsl(43 90% 17%)", 950: "hsl(43 90% 11%)",
        },
        orange: {
          50: "hsl(45 80% 95%)", 100: "hsl(45 78% 87%)", 200: "hsl(45 80% 76%)",
          300: "hsl(45 88% 64%)", 400: "hsl(45 92% 55%)", 500: "hsl(45 97% 46%)",
          600: "hsl(45 97% 39%)", 700: "hsl(43 95% 31%)", 800: "hsl(43 92% 24%)",
          900: "hsl(43 90% 17%)", 950: "hsl(43 90% 11%)",
        },
        red: {
          50: "hsl(3 60% 96%)", 100: "hsl(3 60% 91%)", 200: "hsl(3 58% 83%)",
          300: "hsl(3 58% 71%)", 400: "hsl(3 62% 58%)", 500: "hsl(3 68% 48%)",
          600: "hsl(3 71% 41%)", 700: "hsl(3 72% 34%)", 800: "hsl(3 72% 26%)",
          900: "hsl(3 70% 18%)", 950: "hsl(3 70% 12%)",
        },
        rose: {
          50: "hsl(3 60% 96%)", 100: "hsl(3 60% 91%)", 200: "hsl(3 58% 83%)",
          300: "hsl(3 58% 71%)", 400: "hsl(3 62% 58%)", 500: "hsl(3 68% 48%)",
          600: "hsl(3 71% 41%)", 700: "hsl(3 72% 34%)", 800: "hsl(3 72% 26%)",
          900: "hsl(3 70% 18%)", 950: "hsl(3 70% 12%)",
        },
        blue: {
          50: "hsl(211 18% 95%)", 100: "hsl(211 18% 89%)", 200: "hsl(211 17% 79%)",
          300: "hsl(211 16% 65%)", 400: "hsl(211 18% 50%)", 500: "hsl(211 22% 40%)",
          600: "hsl(211 25% 32%)", 700: "hsl(211 27% 25%)", 800: "hsl(211 27% 18%)",
          900: "hsl(211 27% 12%)", 950: "hsl(211 27% 8%)",
        },
        purple: {
          50: "hsl(211 18% 95%)", 100: "hsl(211 18% 89%)", 200: "hsl(211 17% 79%)",
          300: "hsl(211 16% 65%)", 400: "hsl(211 18% 50%)", 500: "hsl(211 22% 40%)",
          600: "hsl(211 25% 32%)", 700: "hsl(211 27% 25%)", 800: "hsl(211 27% 18%)",
          900: "hsl(211 27% 12%)", 950: "hsl(211 27% 8%)",
        },
        gray: {
          50: "hsl(71 16% 96%)", 100: "hsl(103 8% 92%)", 200: "hsl(103 7% 85%)",
          300: "hsl(103 7% 79%)", 400: "hsl(103 6% 64%)", 500: "hsl(211 8% 46%)",
          600: "hsl(211 12% 36%)", 700: "hsl(211 18% 26%)", 800: "hsl(211 22% 17%)",
          900: "hsl(211 27% 11%)", 950: "hsl(211 27% 7%)",
        },
        slate: {
          50: "hsl(71 16% 96%)", 100: "hsl(103 8% 92%)", 200: "hsl(103 7% 85%)",
          300: "hsl(103 7% 79%)", 400: "hsl(103 6% 64%)", 500: "hsl(211 8% 46%)",
          600: "hsl(211 12% 36%)", 700: "hsl(211 18% 26%)", 800: "hsl(211 22% 17%)",
          900: "hsl(211 27% 11%)", 950: "hsl(211 27% 7%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-data)"],
      },
      /*
       * Bayangan abu yang sama di setiap kartu adalah ciri tampilan bawaan
       * yang hendak dihindari. Pemisahan bidang mengandalkan garis rambut.
       * Hanya lapisan mengambang seperti dropdown dan dialog yang tetap
       * memakai bayangan, dan bentuknya tegas, bukan kabut lebar.
       */
      boxShadow: {
        xs: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "0 2px 0 0 hsl(var(--border))",
        xl: "0 3px 0 0 hsl(var(--border))",
        "2xl": "0 3px 0 0 hsl(var(--border))",
        inner: "none",
        none: "none",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
