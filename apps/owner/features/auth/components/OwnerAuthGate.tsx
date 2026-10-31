// Native auth gate in the root layout: redirects a signed-out live owner to sign-up
// once the root navigator is mounted. Renders nothing.
import { useEffect } from 'react';
import { router, usePathname, useRootNavigationState } from 'expo-router';
import { useOwnerAuth } from '../hooks/useOwnerAuth.tsx';
import { ownerAuthRedirect } from '../lib/ownerAuthGate.ts';

export default function OwnerAuthGate() {
  const auth = useOwnerAuth();
  const pathname = usePathname();
  const navigatorReady = useRootNavigationState()?.key !== undefined;
  const redirect = ownerAuthRedirect({
    configured: auth.configured,
    loading: auth.loading,
    signedIn: auth.session !== null,
    pathname,
  });

  useEffect(() => {
    if (navigatorReady && redirect !== null) router.replace(redirect);
  }, [navigatorReady, redirect]);

  return null;
}
