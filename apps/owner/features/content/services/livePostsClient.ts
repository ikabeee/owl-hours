import {
  storyPackDraftSchema,
  storyPackReviewSchema,
  storyPackSourceSchema,
  type StoryPackDraftDto,
  type StoryPackSourceDto,
} from "@owl-hours/shared";
import type { OwnerApi } from "../../../shared/infra/ownerApi.ts";
import type { ID, PostDraft } from "../../../shared/data/types.ts";
import { localTimestamp } from "../../../shared/lib/localIsoString.ts";
import type { JobPhotoSource } from "../lib/jobPhotos.ts";
import type { PostsClient } from "./postsService.ts";

// PostsClient over GET /content/drafts and POST /content/drafts/:id/review (S1-S3, S5).
// Reads come from the drafts list (the API has no single-draft route); saving an approved post
// calls the review endpoint with the API's approval snapshot, and the next list shows its status.
export function createLivePostsClient(api: OwnerApi): PostsClient {
  const draftsById = new Map<ID, StoryPackDraftDto>();

  async function readDrafts(): Promise<StoryPackDraftDto[]> {
    const rows = (await api.get("/content/drafts")) as unknown[];
    if (!Array.isArray(rows)) throw new Error("The owner API answered drafts without a list.");
    const drafts = rows.map((row) => storyPackDraftSchema.parse(row));
    draftsById.clear();
    drafts.forEach((draft) => draftsById.set(draft.id, draft));
    return drafts;
  }

  async function rememberedDraft(id: ID): Promise<StoryPackDraftDto | null> {
    return draftsById.get(id) ?? (await readDrafts()).find((draft) => draft.id === id) ?? null;
  }

  async function findSource(jobId: ID): Promise<StoryPackSourceDto | null> {
    const rows = (await api.get("/content/sources")) as unknown[];
    if (!Array.isArray(rows)) throw new Error("The owner API answered sources without a list.");
    return rows.map((row) => storyPackSourceSchema.parse(row)).find((source) => source.id === jobId) ?? null;
  }

  async function approvalMedia(draft: StoryPackDraftDto): Promise<{ id: string; role: "before" | "after"; revision: string }[]> {
    if (!draft.sourceJobId) throw new Error(`Post ${draft.id} has no source job to approve against.`);
    const source = await findSource(draft.sourceJobId);
    const assets = new Map(source?.assets.map((asset) => [asset.id, asset]) ?? []);
    return draft.sourceMediaIds.map((id) => {
      const asset = assets.get(id);
      if (!asset) throw new Error(`Post ${draft.id} changed photos: reload it before approving.`);
      return { id: asset.id, role: asset.role, revision: asset.revision };
    });
  }

  async function saveReviewedPost(post: PostDraft): Promise<void> {
    if (post.status === "draft") throw new Error(`Post ${post.id} is still a draft: the live API only reviews approvals.`);
    const draft = await rememberedDraft(post.id);
    if (!draft) throw new Error(`Post ${post.id} is not in the owner's drafts.`);
    if (post.status === "rejected") {
      await api.post(reviewPath(post.id), storyPackReviewSchema.parse({ approve: false }));
      return;
    }
    const reviewed = storyPackReviewSchema.parse({
      approve: true,
      expectedUpdatedAt: draft.updatedAt,
      expectedMedia: await approvalMedia(draft),
    });
    const updated = storyPackDraftSchema.parse(await api.post(reviewPath(post.id), reviewed));
    draftsById.set(updated.id, updated);
  }

  return {
    listPosts: async () => (await readDrafts()).map(toPostDraft),

    findPost: async (id) => {
      const draft = (await readDrafts()).find((row) => row.id === id);
      return draft ? toPostDraft(draft) : null;
    },

    savePost: (post) => saveReviewedPost(post),

    // A content source is a finished, consented job: its signed before/after photos feed the review screen.
    findJob: async (id) => {
      const source = await findSource(id);
      return source ? toJobPhotoSource(source) : null;
    },

    getBusinessName: async () => {
      const me = (await api.get("/me")) as { businesses: { name: string }[] };
      const business = me.businesses[0];
      if (!business) throw new Error("The owner has no business");
      return business.name;
    },
  };
}

function reviewPath(id: ID): string {
  return `/content/drafts/${encodeURIComponent(id)}/review`;
}

// A story pack is the API's job-based post; an approved one is scheduled, not yet published.
function toPostDraft(draft: StoryPackDraftDto): PostDraft {
  return {
    id: draft.id,
    title: draft.title ?? "",
    caption: draft.caption,
    source: draft.source === "story_pack" || draft.source === "job" ? "job" : draft.source,
    ...(draft.sourceJobId ? { sourceJobId: draft.sourceJobId } : {}),
    targets: {
      facebook: draft.platforms.includes("facebook_page"),
      instagram: draft.platforms.includes("instagram"),
    },
    ...(draft.scheduledAt ? { scheduledFor: localTimestamp(draft.scheduledAt) } : {}),
    status: draft.status === "approved" ? "scheduled" : draft.status,
    ...(draft.publishedAt ? { publishedAt: localTimestamp(draft.publishedAt) } : {}),
  };
}

// The sources list carries no customer name; the consent line then names the customer generically.
function toJobPhotoSource(source: StoryPackSourceDto): JobPhotoSource {
  const before = source.assets.find((asset) => asset.role === "before")?.imageUrl;
  const after = source.assets.find((asset) => asset.role === "after")?.imageUrl;
  return {
    id: source.id,
    customerName: "",
    photos: { ...(before ? { before } : {}), ...(after ? { after } : {}), extra: [] },
    shareConsent: source.shareConsent,
  };
}
