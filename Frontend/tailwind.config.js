/** @type {import('tailwindcss').Config} */

// Escala de color a partir de variables CSS "R G B" definidas en src/tailwind.css
const escala = (nombre) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((tono) => [
      tono,
      `rgb(var(--${nombre}-${tono}) / <alpha-value>)`,
    ]),
  )

const rol = (nombre) => `rgb(var(--c-${nombre}) / <alpha-value>)`

export default {
  content: ["./index.html", "./src/**/*.{html,js,jsx,ts,tsx}"],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Onest", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        marca: ["Bodoni Moda", "Didot", "Georgia", "serif"],
      },
      colors: {
        // Paleta propia; las escalas de Tailwind que usaba el proyecto apuntan a ella
        berry: escala("berry"),
        plum: escala("plum"),
        nude: escala("nude"),
        neutral: escala("neutral"),
        pink: escala("berry"),
        rose: escala("berry"),
        fuchsia: escala("berry"),
        purple: escala("plum"),
        violet: escala("plum"),
        indigo: escala("plum"),
        gray: escala("neutral"),
        slate: escala("neutral"),
        zinc: escala("neutral"),

        // Roles semánticos que cambian con el tema
        superficie: rol("surface"),
        "superficie-2": rol("surface-2"),
        linea: rol("line"),
        tinta: {
          DEFAULT: rol("ink"),
          suave: rol("ink-soft"),
          tenue: rol("ink-faint"),
        },
        laca: {
          DEFAULT: rol("primary"),
          hover: rol("primary-hover"),
          suave: rol("primary-soft"),
          tinta: rol("primary-ink"),
        },

        // Variables de shadcn/ui
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        xl: "calc(var(--radius) + 0.25rem)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "var(--sombra-1)",
        DEFAULT: "var(--sombra-1)",
        md: "var(--sombra-2)",
        lg: "var(--sombra-2)",
        xl: "var(--sombra-3)",
        "2xl": "var(--sombra-3)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
