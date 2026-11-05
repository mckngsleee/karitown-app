/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Makes Karitown installable on the phone's home screen and able to open with no signal.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Karitown",
        short_name: "Karitown",
        description: "Buy scrap by weight, fill the truck, sell the load.",
        lang: "en-PH",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F7F9F8",
        theme_color: "#F7F9F8",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,woff2}"],   // everything the app needs to open offline
      },
    }),
  ],
  server: {
    host: true,   // also reachable from your phone on the same Wi-Fi
  },
  test: {
    environment: "node",
  },
});
