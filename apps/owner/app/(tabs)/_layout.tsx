import { Tabs } from "expo-router";
import { TABS, TabBar } from "../../shared/shell/TabBar";

// Expo Router 58 renders only the screens a layout declares, so every tab is declared here.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
