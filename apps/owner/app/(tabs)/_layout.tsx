import { Tabs } from "expo-router";
import { TabBar } from "../../shared/shell/TabBar";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />} />
  );
}
