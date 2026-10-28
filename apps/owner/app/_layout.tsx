import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tonight)" options={{ headerShown: false }} />
      <Stack.Screen name="quote/[id]" options={{ title: "Quote" }} />
    </Stack>
  );
}
