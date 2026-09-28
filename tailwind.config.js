/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        panel: "#121821",
        panel2: "#0F141C",
        line: "#243041",
        ink: "#E7EEF7",
        muted: "#8B9BB0",
        policy: "#F5B942",
        model: "#F59E0B",
        dev: "#3B82F6",
        os: "#22C55E",
        head: "#8B5CF6",
        allow: "#22C55E",
        ask: "#F5B942",
        deny: "#EF4444",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        log: ["11px", "15px"],
        body: ["12.5px", "17px"],
      },
      keyframes: {
        fadein: { from: { opacity: "0", transform: "translateY(2px)" }, to: { opacity: "1", transform: "none" } },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        dash: { to: { strokeDashoffset: "-20" } },
      },
      animation: {
        fadein: "fadein 200ms ease-out",
        shake: "shake 200ms linear 2",
        dash: "dash 600ms linear infinite",
      },
    },
  },
  plugins: [],
};
