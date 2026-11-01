// Thin route adapter: the Requests module owns the screen. OwRequests.
import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RequestsScreen from '../../features/requests/components/RequestsScreen';
import { useRequests } from '../../features/requests/hooks/useRequests';

export default function RequestsRoute() {
  const insets = useSafeAreaInsets();
  const { requests, reload } = useRequests();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  if (!requests) return null;

  return (
    <RequestsScreen
      requests={requests}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onOpenRequest={async (id) => router.push(`/request/${id}`)}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
