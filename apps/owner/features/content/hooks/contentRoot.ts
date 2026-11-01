import { DEMO_NOW } from "../../../shared/data/mock.ts";
import type { ISODate } from "../../../shared/data/types.ts";
import type { OwnerApi } from "../../../shared/infra/ownerApi.ts";
import { localIsoString } from "../../../shared/lib/localIsoString.ts";
import { createLivePostsClient } from "../services/livePostsClient.ts";
import { createPostsService, defaultFakePostsClient } from "../services/postsService.ts";
import type { PostsService } from "../services/postsService.ts";

// What the content hooks run on: one posts service shared by the Content list and post review.
export type ContentRoot = { postsService: PostsService; now: () => ISODate };

// Live: the owner API client on the real clock; demo: the fake client on the designs' clock (null = demo).
export function contentRootFor(liveApi: OwnerApi | null): ContentRoot {
  if (!liveApi) return { postsService: createPostsService(defaultFakePostsClient), now: () => DEMO_NOW };

  const now = () => localIsoString(new Date());
  return { postsService: createPostsService(createLivePostsClient(liveApi), { now }), now };
}
