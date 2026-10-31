import { useCallback } from 'react';
import { deliverStoryPack } from '../services/storyPackDeliveryService';
import type { StoryPackDelivery } from '../lib/storyPackDelivery.ts';

export function useStoryPackDelivery() {
  return useCallback(async (payload: StoryPackDelivery): Promise<void> => {
    await deliverStoryPack(payload);
  }, []);
}
