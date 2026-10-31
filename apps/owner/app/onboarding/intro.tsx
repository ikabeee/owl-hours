// Thin route adapter: the intro pager owns the slides.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IntroScreen from '../../features/onboarding/components/IntroScreen';
import { useIntro } from '../../features/onboarding/hooks/useIntro';
import { resolveNext } from '../../features/onboarding/lib/setupSteps';

export default function IntroRoute() {
  const insets = useSafeAreaInsets();
  const intro = useIntro();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  return (
    <IntroScreen
      slides={intro.slides}
      insets={safeInsets}
      onSkip={async () => { router.push(resolveNext('/onboarding/intro', 'next')); }}
      onCreateAccount={async () => { router.push(resolveNext('/onboarding/intro', 'next')); }}
      onHasAccount={async () => { router.replace(resolveNext('/onboarding/intro', 'has-account')); }}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
