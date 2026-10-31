// Opt-in Story Pack workspace; the Content tab remains owned by T6.
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StoryPackScreen from '../features/story-pack/components/StoryPackScreen';
import { useStoryPack } from '../features/story-pack/hooks/useStoryPack';
import { useStoryPackDelivery } from '../features/story-pack/hooks/useStoryPackDelivery';

export default function StoryPackRoute() {
  const storyPack = useStoryPack();
  const deliverExport = useStoryPackDelivery();
  const insets = useSafeAreaInsets();
  return <StoryPackScreen {...storyPack} deliverExport={deliverExport} insets={{ top: insets.top, bottom: insets.bottom }} />;
}
