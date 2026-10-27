import { Tabs } from "expo-router";

export default function TonightLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="inbox" options={{ title: "Tonight" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="promote" options={{ title: "Promote" }} />
    </Tabs>
  );
}
