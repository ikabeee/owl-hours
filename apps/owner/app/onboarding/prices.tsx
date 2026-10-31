// Thin route adapter: the prices screen owns the draft, the route owns navigation.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingLoadError from '../../features/onboarding/components/OnboardingLoadError';
import PricesScreen from '../../features/onboarding/components/PricesScreen';
import { usePrices } from '../../features/onboarding/hooks/usePrices';
import { resolveNext } from '../../features/onboarding/lib/setupSteps';

export default function PricesRoute() {
  const insets = useSafeAreaInsets();
  const prices = usePrices();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (prices.status === 'failed') {
    return <OnboardingLoadError insets={safeInsets} onRetry={prices.retry} dom={domHost} />;
  }
  if (prices.status !== 'ready') return null;

  const { view } = prices;
  return (
    <PricesScreen
      prices={view.prices}
      fees={view.fees}
      insets={safeInsets}
      onSave={async (draft) => {
        await view.savePrices(draft);
        router.push(resolveNext('/onboarding/prices', 'next'));
      }}
      onBack={async () => { router.back(); }}
      dom={domHost}
    />
  );
}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
