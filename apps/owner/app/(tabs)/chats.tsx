// Thin route adapter: the Chats module owns the screen. OwChats.
import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatsScreen from '../../features/chats/components/ChatsScreen';
import { useChats } from '../../features/chats/hooks/useChats';

export default function ChatsRoute() {
  const insets = useSafeAreaInsets();
  const { rows, reload } = useChats();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));
  if (!rows) return null;

  return (
    <ChatsScreen
      rows={rows}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onOpenChat={async (id) => router.push({ pathname: '/chat/[id]', params: { id } })}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
