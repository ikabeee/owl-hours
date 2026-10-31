import { File, Paths } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { deliverNativeStoryPack, type StoryPackDelivery } from '../lib/storyPackDelivery.ts';

export async function deliverStoryPack(payload: StoryPackDelivery): Promise<void> {
  await deliverNativeStoryPack(payload, {
    available: isAvailableAsync,
    async save({ base64 }) {
      const file = new File(Paths.cache, `zukki-story-pack-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`);
      try { await file.write(base64, { encoding: 'base64' }); }
      catch (error) { if (file.exists) await file.delete(); throw error; }
      return file.uri;
    },
    share: uri => shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive' }),
    async remove(uri) { const file = new File(uri); if (file.exists) await file.delete(); },
  });
}
