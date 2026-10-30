// Thin route adapter: the Business module owns the screen.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SettingsScreen from "../features/business/components/SettingsScreen";
import BusinessLoadError from "../features/business/components/BusinessLoadError";
import { useSettings } from "../features/business/hooks/useSettings";

export default function SettingsRoute() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (settings.status === 'failed') {
    return <BusinessLoadError insets={safeInsets} onRetry={settings.retry} dom={domHost} />;
  }
  if (settings.status !== 'ready') return null;

  const { view } = settings;
  return (
    <SettingsScreen
      settings={view.settings}
      acceptWindowValue={view.acceptWindowValue}
      linkedAccountsValue={view.linkedAccountsValue}
      insets={safeInsets}
      onBack={async () => router.back()}
      onToggleSetting={view.toggleSetting}
      onOpenAccounts={async () => router.push('/content/accounts')} // owned by the content slice
      onSignOut={async () => {}} // intro lands in another slice
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
