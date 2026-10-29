import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import * as SplashScreen from "expo-splash-screen";
import { LogBox } from "react-native";

SplashScreen.preventAutoHideAsync();

// Expo's DOM bridge (expo@58 webview-wrapper `emit`) does not catch the rejection when it
// injects into a WebView that a navigation already unmounted. It is harmless (the payload
// has no reader left) and still reaches the console; only the dev overlay ignores it.
// leaveAfterReturning removes the in-app trigger; remove this once Expo catches it upstream.
LogBox.ignoreLogs(["Unable to find the 'DomWebView' view with tag"]);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Figtree_600SemiBold, Figtree_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f1f1f1" } }} />
    </SafeAreaProvider>
  );
}
