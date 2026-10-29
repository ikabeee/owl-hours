// Native wrapper: owns data, navigation and safe areas. The DOM screen only draws.
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatScreen from '../../features/chats/components/ChatScreen';
import { useConversation } from '../../features/chats/hooks/useConversation';

export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversation = useConversation(id);
  if (!conversation) return null;

  return (
    <ChatScreen
      customerName={conversation.customerName}
      customerFirstName={conversation.customerFirstName}
      acceptedAt={conversation.acceptedAt}
      thread={conversation.thread}
      step={conversation.step}
      preview={conversation.preview}
      polishEnabled={conversation.polishEnabled}
      polishFailed={conversation.polishFailed}
      insets={{ top: insets.top, bottom: insets.bottom }}
      onSend={conversation.send}
      onSendChoice={conversation.sendChoice}
      onSetPolishEnabled={conversation.setPolishEnabled}
      onOpenJob={async () => {}} // the job screen lands in T5
      onBack={async () => router.back()}
      dom={{ style: { flex: 1 } }}
    />
  );
}
