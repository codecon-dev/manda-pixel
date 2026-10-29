import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', ...defaultTheme.fontFamily.sans],
        pixel: ["Silkscreen", "ui-monospace", "monospace"],
      },
      colors: {
        brand: { purple: "#6A3378", yellow: "#FCD953" },
      },
    },
  },
  plugins: [],
};
export default config;
