import { validateStoryPackDelivery, type StoryPackDelivery } from '../lib/storyPackDelivery.ts';

export async function deliverStoryPack(payload: StoryPackDelivery): Promise<void> {
  validateStoryPackDelivery(payload);
  const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(payload.base64), char => char.charCodeAt(0))], { type: 'application/zip' }));
  const link = document.createElement('a');
  try {
    link.href = url; link.download = payload.filename; link.style.display = 'none';
    document.body.appendChild(link); link.click();
  } finally {
    link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
