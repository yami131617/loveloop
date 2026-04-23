import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor config for the LoveLoop Android + iOS wrapper.
// Strategy: the native app is a WebView that loads the live web deployment.
// That way:
//   - every push to GitHub instantly updates the app for all users (no store review)
//   - APK/IPA stays tiny (just WebView shell)
//
// To switch to offline/bundled HTML, change `server.url` to empty and `bundledWebRuntime: true`,
// but that also means you lose automatic updates — every change needs a new release.
const config: CapacitorConfig = {
  appId: "app.loveloop.gen",
  appName: "LoveLoop",
  webDir: ".next-export", // placeholder; only used when bundling static
  server: {
    url: process.env.CAP_SERVER_URL || "https://loveloop.app",
    cleartext: process.env.NODE_ENV !== "production",
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#1a0e2eff",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#1a0e2eff",
  },
};

export default config;
