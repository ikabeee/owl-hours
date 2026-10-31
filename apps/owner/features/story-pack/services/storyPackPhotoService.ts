import { storyPackExportCopys as copy } from '../copys/storyPackExportCopys.ts';
import type { FetchStoryPhoto } from '../lib/storyPackExport.ts';

const PHOTO_TIMEOUT_MS = 15_000;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function createStoryPhotoFetcher(fetchImpl: typeof fetch = fetch): FetchStoryPhoto {
  return async function fetchStoryPhoto(url, isDemo) {
    const isSyntheticSvg = isDemo && url.startsWith('data:image/svg+xml');
    if (!/^https?:/.test(url) && !isSyntheticSvg) throw new Error(copy.unsupportedSource);
    const response = await fetchImpl(url, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(PHOTO_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(copy.photoUnavailable);
    const blob = await response.blob();
    if (!isAcceptedPhoto(blob, isSyntheticSvg)) throw new Error(copy.photoFormat);
    return blob;
  };
}

function isAcceptedPhoto(blob: Blob, isSyntheticSvg: boolean): boolean {
  const hasAcceptedType = isSyntheticSvg || PHOTO_TYPES.includes(blob.type);
  return hasAcceptedType && blob.size <= MAX_PHOTO_BYTES;
}
