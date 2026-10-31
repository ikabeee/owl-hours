import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerifiedStoryPackExport, zipFiles, type ExportHandoff } from './storyPackExport.ts';

function fixture(): ExportHandoff {
  return {
    pack: { id: 'draft-1', sourceJobId: 'job-1', sourceMediaIds: ['before-a', 'after-b'], businessName: 'Synthetic shop',
      jobTitle: 'Synthetic repair', caption: 'Synthetic test caption',
      slides: [1, 2, 3].map(i => ({ title: `Slide ${i}`, body: 'Saved test copy' })),
      platforms: { facebook: true, instagram: true }, status: 'approved', canHandoff: true,
      isDemo: true, createdAt: '2026-10-30', updatedAt: '2026-10-30' },
    source: { id: 'job-1', businessName: 'Synthetic shop', jobTitle: 'Synthetic repair', state: 'done',
      shareConsent: 'yes', isDemo: true, assets: [
        { id: 'before-a', role: 'before', revision: 'before-v1', label: 'Synthetic before', imageUrl: 'data:image/png;base64,AA==' },
        { id: 'after-b', role: 'after', revision: 'after-v1', label: 'Synthetic after', imageUrl: 'data:image/png;base64,AA==' },
      ] },
  };
}
const rendered = [1, 2, 3].map(i => ({ name: `story-0${i}.png`, bytes: new Uint8Array([137, 80, 78, 71, i]) }));

test('export reauthorizes after image rendering and emits a portable five-file ZIP without signed URLs', async () => {
  const order: string[] = [];
  const { bytes, filename } = await createVerifiedStoryPackExport({
    authorize: async () => { order.push('authorize'); return fixture(); },
    render: async () => { order.push('render'); return rendered; },
    now: () => '2026-10-30T00:00:00Z',
  });
  assert.deepEqual(order, ['authorize', 'render', 'authorize']);
  assert.equal(filename, 'zukki-story-pack.zip');
  const files = readStoredZip(bytes);
  assert.deepEqual(files.map(f => f.name), ['story-01.png', 'story-02.png', 'story-03.png', 'caption.txt', 'manifest.json']);
  assert.equal(new TextDecoder().decode(files[3]!.bytes), 'Synthetic test caption');
  const manifest = JSON.parse(new TextDecoder().decode(files[4]!.bytes));
  assert.equal(manifest.published, false);
  assert.deepEqual(manifest.sourceMediaIds, ['before-a', 'after-b']);
  assert.equal(manifest.images[0].width, 1080);
  assert.equal(manifest.images[0].height, 1920);
  assert.equal(JSON.stringify(manifest).includes('data:image'), false);
});

test('revocation after rendering blocks delivery', async () => {
  let calls = 0;
  await assert.rejects(createVerifiedStoryPackExport({
    authorize: async () => { const h = fixture(); if (++calls === 2) h.source.shareConsent = 'no'; return h; },
    render: async () => rendered,
  }), /no longer eligible/);
});

for (const mutation of ['removed', 'role-changed'] as const) {
  test(`selected after B ${mutation}, with an alternate after C, blocks delivery`, async () => {
    let calls = 0;
    await assert.rejects(createVerifiedStoryPackExport({
      authorize: async () => {
        const h = fixture();
        if (++calls === 2) {
          if (mutation === 'removed') h.source.assets.pop();
          else h.source.assets[1]!.role = 'job_photo';
          h.source.assets.push({ id: 'after-c', role: 'after', label: 'Other after', imageUrl: 'data:image/png;base64,AA==' });
        }
        return h;
      }, render: async () => rendered,
    }), /no longer eligible/);
  });
}

test('concurrent copy changes and failed final authorization block delivery', async () => {
  for (const denied of [false, true]) {
    let calls = 0;
    await assert.rejects(createVerifiedStoryPackExport({
      authorize: async () => { const h = fixture(); if (++calls === 2) { if (denied) return null; h.pack.caption = 'Changed'; } return h; },
      render: async () => rendered,
    }), denied ? /authorization expired/ : /story changed/);
  }
});

test('an unapproved pack never starts photo rendering', async () => {
  let renderedPhoto = false;
  await assert.rejects(createVerifiedStoryPackExport({
    authorize: async () => { const h = fixture(); h.pack.status = 'draft'; return h; },
    render: async () => { renderedPhoto = true; return rendered; },
  }), /no longer eligible/);
  assert.equal(renderedPhoto, false);
});

test('a replaced image under the same selected id blocks delivery, while signed URL rotation is allowed', async () => {
  for (const replacement of [false, true]) {
    let calls = 0;
    const pending = createVerifiedStoryPackExport({
      authorize: async () => {
        const h = fixture();
        if (++calls === 2) {
          h.source.assets[1]!.imageUrl = 'https://example.test/after?token=rotated';
          if (replacement) h.source.assets[1]!.revision = 'after-v2';
        }
        return h;
      }, render: async () => rendered,
    });
    if (replacement) await assert.rejects(pending, /story changed/);
    else assert.equal((await pending).filename, 'zukki-story-pack.zip');
  }
});

test('a live handoff without a stable selected image revision is not deliverable', async () => {
  await assert.rejects(createVerifiedStoryPackExport({
    authorize: async () => { const h = fixture(); h.pack.isDemo = false; h.source.isDemo = false; delete h.source.assets[1]!.revision; return h; },
    render: async () => rendered,
  }), /no longer eligible/);
});

test('ZIP filenames cannot create paths outside the extracted bundle', () => {
  assert.throws(() => zipFiles([{ name: '../outside', bytes: new Uint8Array() }]), /Invalid/);
});

function readStoredZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files: { name: string; bytes: Uint8Array }[] = [];
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0); // stored compression
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const dataStart = offset + 30 + nameLength;
    files.push({ name: new TextDecoder().decode(bytes.subarray(offset + 30, dataStart)), bytes: bytes.subarray(dataStart, dataStart + size) });
    offset = dataStart + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), files.length);
  return files;
}

test('equivalent snapshot key and media ordering does not block export', async () => {
  let calls=0;
  const result=await createVerifiedStoryPackExport({
    authorize:async()=>{
      const h=fixture();
      if(++calls===2) {
        h.pack.platforms={instagram:true,facebook:true};
        h.pack.slides=h.pack.slides.map(({title,body})=>({body,title}));
        h.pack.sourceMediaIds.reverse();
        h.source.assets.reverse();
      }
      return h;
    },render:async()=>rendered,
  });
  assert.ok(result.bytes.length>0);
});
