// Native wrapper: owns data, navigation, haptics and safe areas. The DOM screen only draws.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import RequestScreen from '../../features/requests/components/RequestScreen';
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
        if (!(await request.accept())) return;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/chat/[id]', params: { id: `c_${id}` } });
      }}
      onDecline={async () => {
        if (!(await request.decline())) return;
        await Haptics.selectionAsync();
        router.back();
      }}
      dom={{ style: { flex: 1 } }}
    />
  );
}
