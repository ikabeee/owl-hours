import { storyPackExportCopys as exportCopy } from '../copys/storyPackExportCopys.ts';
import { contentCopys as copy } from '../copys/contentCopys.ts';
import { fitStoryText } from '../lib/storyTextLayout.ts';
import type { ExportFile, ExportHandoff } from '../lib/storyPackExport.ts';

export async function renderStoryImages({ pack, source }: ExportHandoff): Promise<ExportFile[]> {
  const selected = source.assets.filter(asset => pack.sourceMediaIds.includes(asset.id));
  const before = selected.find(asset => asset.role === 'before');
  const after = selected.find(asset => asset.role === 'after');
  if (!before?.imageUrl || !after?.imageUrl) throw new Error(exportCopy.sourceUnavailable);
  const images: Awaited<ReturnType<typeof loadPhoto>>[] = [];
  try {
    // Keep the first decoded image inside this cleanup scope if the second fails.
    images.push(await loadPhoto(before.imageUrl, pack.isDemo));
    images.push(await loadPhoto(after.imageUrl, pack.isDemo));
    return await Promise.all(pack.slides.map(async (slide, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(exportCopy.unavailable);
      const photo = images[index === 0 ? 0 : 1].image;
      const scale = Math.max(1080 / photo.naturalWidth, 1320 / photo.naturalHeight);
      ctx.fillStyle = '#142638'; ctx.fillRect(0, 0, 1080, 1920);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1080, 1320); ctx.clip();
      ctx.drawImage(photo, (1080 - photo.naturalWidth * scale) / 2, (1320 - photo.naturalHeight * scale) / 2,
        photo.naturalWidth * scale, photo.naturalHeight * scale); ctx.restore();
      ctx.fillStyle = '#142638'; ctx.fillRect(0, 1260, 1080, 660);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
      ctx.fillText(copy.exportKicker(index, pack.isDemo), 64, 1340);
      const layout = fitStoryText(slide.title, slide.body, (text, size, bold) => {
        ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
        return ctx.measureText(text).width;
      });
      for (const [key, block] of Object.entries({ title: layout.title, body: layout.body })) {
        ctx.font = `${key === 'title' ? 'bold ' : ''}${block.size}px sans-serif`;
        block.lines.forEach((line, index) => ctx.fillText(line, 64, block.y + index * block.lineHeight));
      }
      ctx.font = '28px sans-serif'; ctx.fillText(source.businessName, 64, 1860, 952);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(exportCopy.renderFailed)), 'image/png'));
      return { name: `story-0${index + 1}.png`, bytes: new Uint8Array(await blob.arrayBuffer()) };
    }));
  } finally { for (const image of images) URL.revokeObjectURL(image.url); }
}

async function loadPhoto(url: string, isDemo: boolean): Promise<{ image: HTMLImageElement; url: string }> {
  const syntheticSvg = isDemo && url.startsWith('data:image/svg+xml');
  if (!/^https?:/.test(url) && !syntheticSvg) throw new Error(exportCopy.unsupportedSource);
  const response = await fetch(url, { credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(exportCopy.photoUnavailable);
  const blob = await response.blob();
  if ((!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) && !syntheticSvg) || blob.size > 15 * 1024 * 1024) {
    throw new Error(exportCopy.photoFormat);
  }
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image(); image.src = objectUrl;
  try { await image.decode(); } catch (error) { URL.revokeObjectURL(objectUrl); throw error; }
  if (!image.naturalWidth || !image.naturalHeight) { URL.revokeObjectURL(objectUrl); throw new Error(exportCopy.photoEmpty); }
  return { image, url: objectUrl };
}
