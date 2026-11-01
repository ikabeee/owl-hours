import type { ConfigContext, ExpoConfig } from "expo/config";

// The preview APK reaches the local stack over the LAN (http://<laptop-ip>), so only that EAS profile
// allows cleartext traffic; every other build stays HTTPS-only (Android blocks cleartext by default).
const previewCleartext: ExpoConfig["plugins"] = [["expo-build-properties", { android: { usesCleartextTraffic: true } }]];

export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    plugins: [...(config.plugins ?? []), ...(process.env.EAS_BUILD_PROFILE === "preview" ? previewCleartext : [])],
  }) as ExpoConfig;
