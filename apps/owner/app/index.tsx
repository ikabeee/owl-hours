import { Redirect } from "expo-router";

// The app opens on the requests inbox; without this route "/" lands on an arbitrary tab.
export default function Index() {
  return <Redirect href="/requests" />;
}
