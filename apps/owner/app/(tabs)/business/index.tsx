// Thin route adapter: the Business module owns the screen.
import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BusinessScreen from "../../../features/business/components/BusinessScreen";
import BusinessLoadError from "../../../features/business/components/BusinessLoadError";
import { useBusiness } from "../../../features/business/hooks/useBusiness";

export default function BusinessRoute() {
  const insets = useSafeAreaInsets();
  const business = useBusiness();
  const reload = business.reload;
  // The three business screens share one demo service: re-read it on every
  // focus so prices saved in OwPrices show here when coming back.
  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (business.status === 'failed') {
    return <BusinessLoadError insets={safeInsets} onRetry={business.retry} dom={domHost} />;
  }
  if (business.status !== 'ready') return null;

  const { view } = business;
  return (
    <BusinessScreen
      name={view.name}
      rows={view.rows}
      insets={safeInsets}
      onOpenPrices={async () => router.push('/business/prices')}
      onOpenSettings={async () => router.push('/settings')}
      onTestZukki={async () => {}} // business/test lands in another slice
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
