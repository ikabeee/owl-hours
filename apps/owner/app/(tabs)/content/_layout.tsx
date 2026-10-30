import { Stack } from 'expo-router';

export default function ContentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accounts" />
    </Stack>
  );
}
