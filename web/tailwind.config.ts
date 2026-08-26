import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Graphite / ink surfaces — flat, no elevation tricks.
        ink: {
          DEFAULT: "#14171C", // page background
          raised: "#191D23", // panel background
          sunken: "#111419", // inputs, table headers
          hover: "#1E232B",
        },
        line: {
          DEFAULT: "#262B33", // default 1px border
          strong: "#333A44", // active / focused border
        },
        ash: {
          DEFAULT: "#E6E8EB", // primary text      — 14.6:1 on ink
          dim: "#9AA2AD", // secondary text     —  6.6:1 on ink-raised
          faint: "#818994", // labels, meta       —  4.8:1 on ink-raised
        },
        // Single accent. Amber, desaturated enough to read as a tool, not a toy.
        amber: {
          DEFAULT: "#C88A3A", //  5.8:1 on ink-raised
          bright: "#DDA05A",
          dim: "#8A6029",
          wash: "#2A2115",
        },
        // Verdict colours are all >= 4.5:1 against both their own wash and the
        // panel background, so 11px badge text meets WCAG AA. Verified by the
        // contrast audit in the README's accessibility note.
        verdict: {
          flag: "#D06B5E", //  4.7:1 on flagWash
          flagWash: "#2B1917",
          review: "#C88A3A", //  5.4:1 on reviewWash
          reviewWash: "#2A2115",
          approve: "#5C9A69", //  4.9:1 on approveWash
          approveWash: "#16221A",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        // Tight radii only. Nothing pill-shaped.
        DEFAULT: "2px",
        sm: "2px",
        md: "3px",
      },
      letterSpacing: {
        label: "0.08em",
      },
    },
  },
  plugins: [],
};

export default config;
