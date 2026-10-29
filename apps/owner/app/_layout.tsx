import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Figtree_600SemiBold, Figtree_700Bold } from "@expo-google-fonts/figtree";
import * as SplashScreen from "expo-splash-screen";
import { LogBox } from "react-native";

SplashScreen.preventAutoHideAsync();

// Expo's DOM bridge (expo@58 webview-wrapper `emit`) sends props from a useEffect through
// injectJavaScript, an iOS async view function that rejects until the native view is
// registered, and never catches it. Every DOM screen mount can log this harmless rejection.
// It still reaches the console; only the dev overlay ignores it. Remove once
// https://github.com/expo/expo/issues/52503 is fixed.
LogBox.ignoreLogs(["Unable to find the 'DomWebView' view with tag"]);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Figtree_600SemiBold, Figtree_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#f1f1f1" } }}>
        {/* OwQuote slides up over the chat: https://docs.expo.dev/router/advanced/modals/ */}
        <Stack.Screen name="chat/[id]/quote" options={{ presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
