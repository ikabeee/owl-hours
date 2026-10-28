// Native wrapper: owns data, navigation, haptics and safe areas. The DOM screen only draws.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import RequestScreen from '../../features/requests/components/RequestScreen';

const offer = {
  title: 'Leaking toilet, water reaching the hallway',
  customerName: 'Ana L.',
  distanceKm: 1.2,
  secondsLeft: 272,
  zukkiSummary: 'Valve closed, no cables near the water. Likely a worn fill valve. From your prices: $130–160.',
};

export default function RequestRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  return (
    <RequestScreen
      offer={offer}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onAccept={async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({ pathname: '/chat/[id]', params: { id: `c_${id}` } });
      }}
      onDecline={async () => {
        await Haptics.selectionAsync();
        router.back();
      }}
      dom={{ style: { flex: 1 } }}
    />
  );
}
