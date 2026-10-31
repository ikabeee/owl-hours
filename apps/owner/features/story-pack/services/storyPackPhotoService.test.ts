import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStoryPhotoFetcher } from './storyPackPhotoService.ts';
import { storyPackExportCopys as copy } from '../copys/storyPackExportCopys.ts';

const photoUrl = 'https://photos.example/before.png';

function fakeFetch(response: Response) {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(input), init });
    return response;
  };
  return { requests, fetchPhoto: createStoryPhotoFetcher(fetchImpl) };
}

function imageResponse(type: string, size = 4) {
  return new Response(new Blob([new Uint8Array(size)], { type }));
}

test('fetches a photo without credentials or cache, with a timeout signal', async () => {
  const { requests, fetchPhoto } = fakeFetch(imageResponse('image/png'));
  const blob = await fetchPhoto(photoUrl, false);
  assert.equal(blob.type, 'image/png');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, photoUrl);
  assert.equal(requests[0].init?.credentials, 'omit');
  assert.equal(requests[0].init?.cache, 'no-store');
  assert.ok(requests[0].init?.signal instanceof AbortSignal);
});

test('rejects a non-http source without fetching it', async () => {
  const { requests, fetchPhoto } = fakeFetch(imageResponse('image/png'));
  await assert.rejects(fetchPhoto('file:///etc/passwd', false), { message: copy.unsupportedSource });
  await assert.rejects(fetchPhoto('data:image/svg+xml,<svg/>', false), { message: copy.unsupportedSource });
  assert.equal(requests.length, 0);
});

test('accepts the synthetic SVG only for demo packs', async () => {
  const { fetchPhoto } = fakeFetch(imageResponse('image/svg+xml'));
  const blob = await fetchPhoto('data:image/svg+xml,<svg/>', true);
  assert.equal(blob.type, 'image/svg+xml');
});

test('reports an unavailable photo when the response fails', async () => {
  const { fetchPhoto } = fakeFetch(new Response(null, { status: 404 }));
  await assert.rejects(fetchPhoto(photoUrl, false), { message: copy.photoUnavailable });
});

test('rejects unsupported formats and photos over 15 MB', async () => {
  await assert.rejects(fakeFetch(imageResponse('image/gif')).fetchPhoto(photoUrl, false), { message: copy.photoFormat });
  await assert.rejects(fakeFetch(imageResponse('image/jpeg', 15 * 1024 * 1024 + 1)).fetchPhoto(photoUrl, false), { message: copy.photoFormat });
});
