import { storyPackExportCopys as exportCopy } from "../copys/storyPackExportCopys.ts";
import {
  hasSelectedStoryMedia,
  type StoryPack,
  type StorySource,
} from "./storyPack.ts";

export type ExportHandoff = { pack: StoryPack; source: StorySource };
export type ExportFile = { name: string; bytes: Uint8Array };

function fingerprint({ pack, source }: ExportHandoff): string {
  const assets = source.assets
    .filter((asset) => pack.sourceMediaIds.includes(asset.id))
    .map(({ id, role, revision }) => [id, role, revision] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : Number(a[0] > b[0])));
  // Compare domain values, never object insertion order or response ordering.
  return JSON.stringify([
    pack.id,
    pack.sourceJobId,
    [...pack.sourceMediaIds].sort(),
    pack.caption,
    pack.slides.map((slide) => [slide.title, slide.body]),
    [pack.platforms.facebook, pack.platforms.instagram],
    source.businessName,
    assets,
  ]);
}

function requireEligible({ pack, source }: ExportHandoff): void {
  const selected = pack.sourceMediaIds.map((id) =>
    source.assets.find((asset) => asset.id === id),
  );
  if (
    pack.status !== "approved" ||
    !pack.canHandoff ||
    !hasSelectedStoryMedia(pack, source) ||
    selected.some(
      (asset) => !asset?.imageUrl || !["before", "after"].includes(asset.role),
    ) ||
    (!pack.isDemo && selected.some((asset) => !asset?.revision))
  ) {
    throw new Error(exportCopy.selectedMedia);
  }
}

// Authorize twice: once before reading photos and again after rendering, before
// making any download available. This is a point-in-time permission check;
// an already downloaded file cannot be recalled after later consent revocation.
export async function createVerifiedStoryPackExport(deps: {
  authorize: () => Promise<ExportHandoff | null>;
  render: (handoff: ExportHandoff) => Promise<ExportFile[]>;
  now?: () => string;
}): Promise<{ bytes: Uint8Array; filename: string }> {
  const first = await deps.authorize();
  if (!first) throw new Error(exportCopy.authorization);
  requireEligible(first);
  const files = await deps.render(first);
  if (
    files.length !== 3 ||
    files.some(
      (file, index) =>
        file.name !== `story-0${index + 1}.png` || !file.bytes.length,
    )
  ) {
    throw new Error(exportCopy.imagesRequired);
  }
  const final = await deps.authorize();
  if (!final) throw new Error(exportCopy.expired);
  requireEligible(final);
  if (fingerprint(first) !== fingerprint(final))
    throw new Error(exportCopy.changed);
  const encoder = new TextEncoder();
  const manifest = {
    format: "zukki-story-pack-v2",
    published: false,
    isDemo: first.pack.isDemo,
    checkedAt: (deps.now ?? (() => new Date().toISOString()))(),
    sourceJobId: first.pack.sourceJobId,
    sourceMediaIds: first.pack.sourceMediaIds,
    slides: first.pack.slides,
    formats: first.pack.platforms,
    images: files.map((file) => ({
      filename: file.name,
      width: 1080,
      height: 1920,
      mimeType: "image/png",
    })),
  };
  return {
    bytes: zipFiles([
      ...files,
      { name: "caption.txt", bytes: encoder.encode(first.pack.caption) },
      {
        name: "manifest.json",
        bytes: encoder.encode(JSON.stringify(manifest, null, 2)),
      },
    ]),
    filename: "zukki-story-pack.zip",
  };
}

// Small, uncompressed ZIP writer. PNG is already compressed; no runtime ZIP
// dependency or remote rendering service is needed.
export function zipFiles(files: ExportFile[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  let directorySize = 0;
  for (const file of files) {
    if (!/^[a-z0-9][a-z0-9.-]*$/i.test(file.name))
      throw new Error("Invalid export filename.");
    const name = new TextEncoder().encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const l = new DataView(local.buffer);
    l.setUint32(0, 0x04034b50, true);
    l.setUint16(4, 20, true);
    l.setUint16(12, 33, true); // DOS date: 1980-01-01
    l.setUint32(14, crc, true);
    l.setUint32(18, file.bytes.length, true);
    l.setUint32(22, file.bytes.length, true);
    l.setUint16(26, name.length, true);
    local.set(name, 30);
    parts.push(local, file.bytes);
    const central = new Uint8Array(46 + name.length);
    const c = new DataView(central.buffer);
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(4, 20, true);
    c.setUint16(6, 20, true);
    c.setUint16(14, 33, true);
    c.setUint32(16, crc, true);
    c.setUint32(20, file.bytes.length, true);
    c.setUint32(24, file.bytes.length, true);
    c.setUint16(28, name.length, true);
    c.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central);
    directorySize += central.length;
    offset += local.length + file.bytes.length;
  }
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, directorySize, true);
  e.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + end.length);
  let cursor = 0;
  for (const part of [...parts, ...directory, end]) {
    result.set(part, cursor);
    cursor += part.length;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
