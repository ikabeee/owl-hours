import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CreateFacebookPostScreen from '../../features/content/components/CreateFacebookPostScreen';
import ContentLoadError from '../../features/content/components/ContentLoadError';
import { useCreateFacebookPost } from '../../features/content/hooks/useCreateFacebookPost';
import LoadingSkeleton from '../../shared/shell/LoadingSkeleton';
import { goBackOr } from '../../shared/lib/goBack';

export default function CreateFacebookPostRoute() {
  const insets = useSafeAreaInsets();
  const composer = useCreateFacebookPost();
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (composer.status === 'error') {
    return <ContentLoadError insets={safeInsets} onRetry={composer.retry} dom={domHost} />;
  }
  if (composer.status !== 'ready') return <LoadingSkeleton />;

  const { view } = composer;
  return (
    <CreateFacebookPostScreen
      pages={view.pages}
      selectedPageId={view.selectedPageId}
      prompt={view.prompt}
      canGenerate={view.canGenerate}
      isGenerating={view.isGenerating}
      error={view.error}
      insets={safeInsets}
      onBack={async () => { goBackOr(router, '/(tabs)/content'); }}
      onSelectPage={view.onSelectPage}
      onPromptChange={view.onPromptChange}
      onManageAccounts={async () => { router.push('/(tabs)/content/accounts'); }}
      onGenerate={async () => {
        const draft = await view.onGenerate();
        if (draft) router.replace({ pathname: '/post/[id]', params: { id: draft.id } });
      }}
      dom={domHost}
    />
  );
}

const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
