// Thin route adapter: Linked accounts screen.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentLoadError from '../../../features/content/components/ContentLoadError';
import AccountsScreen from '../../../features/content/components/AccountsScreen';
import { useLinkedAccounts } from '../../../features/content/hooks/useLinkedAccounts';

export default function AccountsRoute() {
  const insets = useSafeAreaInsets();
  const linked = useLinkedAccounts();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (linked.status === 'error') {
    return <ContentLoadError insets={safeInsets} onRetry={linked.retry} dom={domHost} />;
  }

  if (linked.status !== 'ready') {
    return null;
  }

  const { view } = linked;

  return (
    <AccountsScreen
      accounts={view.accounts}
      insets={safeInsets}
      onBack={async () => {
        router.back();
      }}
      onSeeDrafts={async () => {
        router.back();
      }}
      dom={domHost}
    />
  );
}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
