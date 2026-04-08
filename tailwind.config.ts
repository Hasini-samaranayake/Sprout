import type { Config } from "tailwindcss";

/**
 * Pastel Botanical — content sources and shared tokens.
 * Theme colors and radii are primarily defined in `app/globals.css` (`@theme` + `:root`).
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        botanical: {
          canvas: "#f8faf6",
          leaf: "#376b00",
          mint: "#a3f959",
        },
      },
    },
  },
} satisfies Config;
