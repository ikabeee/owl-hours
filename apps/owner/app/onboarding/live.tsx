// Thin route adapter: the live screen draws the saved business, the route owns navigation
// and the native permission prompt.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveScreen from '../../features/onboarding/components/LiveScreen';
import OnboardingLoadError from '../../features/onboarding/components/OnboardingLoadError';
import { useLive } from '../../features/onboarding/hooks/useLive';
import { resolveNext } from '../../features/onboarding/lib/setupSteps';

export default function LiveRoute() {
  const insets = useSafeAreaInsets();
  const live = useLive();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (live.status === 'failed') {
    return <OnboardingLoadError insets={safeInsets} onRetry={live.retry} dom={domHost} />;
  }
  if (live.status !== 'ready') return null;

  const { view } = live;
  return (
    <LiveScreen
      businessName={view.businessName}
      category={view.category}
      radiusKm={view.radiusKm}
      insets={safeInsets}
      onAllowNotifications={async () => {
        await requestNotificationPermissionStub();
        router.replace(resolveNext('/onboarding/live', 'next'));
      }}
      onLinkAccounts={async () => { router.push('/content/accounts'); }}
      dom={domHost}
    />
  );
}

// No-op for now: expo-notifications is not installed, so there is no OS prompt to call yet.
async function requestNotificationPermissionStub(): Promise<void> {}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
