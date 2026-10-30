import { useRouter } from 'expo-router';
import { useOwnerAuth } from '../hooks/useOwnerAuth.tsx';
import OwnerAuthScreen from './OwnerAuthScreen.tsx';

export default function OwnerAuthRoute() {
  const auth = useOwnerAuth();
  const router = useRouter();
  return <OwnerAuthScreen email={auth.session?.user.email ?? null} busy={auth.loading}
    configured={auth.configured} error={auth.error} notice={auth.notice}
    onSignIn={auth.signIn} onSignOut={auth.signOut}
    onContinue={async () => { router.replace('/'); }} dom={{ style: { flex: 1 } }} />;
}
