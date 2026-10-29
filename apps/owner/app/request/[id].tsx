// Native wrapper: owns data, navigation, haptics and safe areas. The DOM screen only draws.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import RequestScreen from '../../features/requests/components/RequestScreen';
import { destinationAfterAccept } from '../../features/requests/lib/acceptOutcome';
import { leaveAfterReturning } from '../../shared/navigation/leaveAfterReturning';
import { useRequestOffer } from '../../features/requests/hooks/useRequestOffer';

export default function RequestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const request = useRequestOffer(id);
  if (!request) return null;

  return (
    <RequestScreen
      offer={request.offer}
      countdownText={request.countdownText}
      secondsLeft={request.secondsLeft}
      maxSeconds={request.maxSeconds}
      isExpired={request.isExpired}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onAccept={async () => {
        const destination = destinationAfterAccept(await request.accept());
        if (destination.kind === 'stay') return;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        leaveAfterReturning(() => {
          if (destination.kind === 'chat') router.replace({ pathname: '/chat/[id]', params: { id: destination.chatId } });
          else router.replace('/chats');
        });
      }}
      onDecline={async () => {
        if (!(await request.decline())) return;
        await Haptics.selectionAsync();
        leaveAfterReturning(() => router.back());
      }}
      dom={{ style: { flex: 1 } }}
    />
  );
}
