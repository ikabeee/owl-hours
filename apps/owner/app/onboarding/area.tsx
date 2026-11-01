// Thin route adapter: the area screen owns the draft, the route owns navigation.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AreaScreen from '../../features/onboarding/components/AreaScreen';
import OnboardingLoadError from '../../features/onboarding/components/OnboardingLoadError';
import { useArea } from '../../features/onboarding/hooks/useArea';
import { resolveNext } from '../../features/onboarding/lib/setupSteps';
import LoadingSkeleton from '../../shared/shell/LoadingSkeleton';

export default function AreaRoute() {
  const insets = useSafeAreaInsets();
  const area = useArea();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (area.status === 'failed') {
    return <OnboardingLoadError insets={safeInsets} onRetry={area.retry} dom={domHost} />;
  }
  if (area.status !== 'ready') return <LoadingSkeleton />;

  const { view } = area;
  return (
    <AreaScreen
      radiusKm={view.radiusKm}
      nightUrgent={view.nightUrgent}
      hoursSummary={view.hoursSummary}
      insets={safeInsets}
      onFinish={async (radiusKm, nightUrgent) => {
        await view.finish(radiusKm, nightUrgent);
        router.push(resolveNext('/onboarding/area', 'next'));
      }}
      onBack={async () => { router.back(); }}
      dom={domHost}
    />
  );
}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
