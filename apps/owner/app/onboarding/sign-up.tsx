// Thin route adapter: the sign-up screen owns the form, the route owns navigation.
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingLoadError from '../../features/onboarding/components/OnboardingLoadError';
import SignUpScreen from '../../features/onboarding/components/SignUpScreen';
import { useSignUp } from '../../features/onboarding/hooks/useSignUp';
import { resolveNext } from '../../features/onboarding/lib/setupSteps';

export default function SignUpRoute() {
  const insets = useSafeAreaInsets();
  const signup = useSignUp();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (signup.status === 'failed') {
    return <OnboardingLoadError insets={safeInsets} onRetry={signup.retry} dom={domHost} />;
  }
  if (signup.status !== 'ready') return null;

  const { view } = signup;
  return (
    <SignUpScreen
      defaultName={view.defaultName}
      defaultPhone={view.defaultPhone}
      insets={safeInsets}
      onSendCode={async (name, phone) => {
        if (await view.submit(name, phone)) router.push(resolveNext('/onboarding/sign-up', 'next'));
      }}
      onFacebook={async () => { router.push(resolveNext('/onboarding/sign-up', 'facebook')); }}
      onBack={async () => { router.back(); }}
      dom={domHost}
    />
  );
}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
