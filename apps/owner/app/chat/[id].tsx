// Native wrapper: owns data, navigation and safe areas. The DOM screen only draws.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatLoadError from '../../features/chats/components/ChatLoadError';
import ChatScreen from '../../features/chats/components/ChatScreen';
import { useConversation } from '../../features/chats/hooks/useConversation';

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversation = useConversation(id);
  const safeInsets = { top: insets.top, bottom: insets.bottom };

  if (conversation.status === 'failed') {
    return <ChatLoadError insets={safeInsets} onRetry={conversation.retry} dom={domHost} />;
  }
  if (conversation.status !== 'ready') return null;

  const { view } = conversation;
  return (
    <ChatScreen
      customerName={view.customerName}
      customerFirstName={view.customerFirstName}
      acceptedAt={view.acceptedAt}
      thread={view.thread}
      step={view.step}
      preview={view.preview}
      polishEnabled={view.polishEnabled}
      polishFailed={view.polishFailed}
      sendFailed={view.sendFailed}
      hasJob={view.jobId !== null}
      suggestedQuoteText={view.suggestedQuoteText}
      insets={safeInsets}
      onSend={view.send}
      onSendChoice={view.sendChoice}
      onSetPolishEnabled={view.setPolishEnabled}
      onOpenJob={async () => {
        if (view.jobId) router.push({ pathname: '/job/[id]', params: { id: view.jobId } });
      }}
      onReviewQuote={async () => router.push({ pathname: '/chat/[id]/quote', params: { id } })}
      onBack={async () => router.back()}
      dom={domHost}
    />
  );
}

// Expo's DOM wrapper defaults to contentInsetAdjustmentBehavior "automatic", which adds the
// safe area on top of the insets the screens already pad, so the screens own the insets alone.
const domHost = { style: { flex: 1 }, contentInsetAdjustmentBehavior: 'never' } as const;
