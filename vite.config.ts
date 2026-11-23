import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: process.env.VERCEL ? "/" : "./",
  define:
    mode === "test"
      ? {}
      : {
          "import.meta.env.VITE_AI_ENABLED": JSON.stringify(
            process.env.VERCEL ? "true" : "false",
          ),
        },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    include: ["src/**/*.test.{ts,tsx}"],
  },
}));
