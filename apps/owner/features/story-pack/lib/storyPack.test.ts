import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildApprovalMediaSnapshot, buildStoryPack, canCreateStoryPack, hasSelectedStoryMedia } from "./storyPack.ts";
import type { StoryPack, StorySource } from "./storyPack.ts";
import { createFakeStoryPackClient, createStoryPackService } from "../services/storyPackService.ts";

const eligibleSource: StorySource = {
  id: "job-demo-complete",
  businessName: "Northside Plumbing (demo)",
  jobTitle: "Bathroom leak repair",
  state: "done",
  shareConsent: "yes",
  isDemo: true,
  assets: [
    { id: "media-before", role: "before", label: "Before · sample visual" },
    { id: "media-after", role: "after", label: "After · sample visual" },
  ],
};

const ineligibleSources: StorySource[] = [
  { ...eligibleSource, id: "job-in-progress", state: "on_site" },
  { ...eligibleSource, id: "job-no-consent", shareConsent: "no" },
  { ...eligibleSource, id: "job-consent-not-asked", shareConsent: "not_asked" },
  { ...eligibleSource, id: "job-no-after", assets: [eligibleSource.assets[0]] },
  { ...eligibleSource, id: "job-no-before", assets: [eligibleSource.assets[1]] },
];

describe("Story Pack source rules", () => {
  it("accepts only a completed job with current consent and both before and after assets", () => {
    assert.equal(canCreateStoryPack(eligibleSource), true);
    for (const source of ineligibleSources) {
      assert.equal(canCreateStoryPack(source), false, source.id);
    }
  });

  it("builds a three-slide draft from job facts without inventing a review or performance claim", () => {
    const pack = buildStoryPack(eligibleSource, "pack-1", "2026-10-29T12:00:00.000Z");

    assert.equal(pack.sourceJobId, eligibleSource.id);
    assert.equal(pack.status, "draft");
    assert.equal(pack.slides.length, 3);
    assert.deepEqual(pack.platforms, { facebook: false, instagram: false });
    assert.match(pack.caption, /Bathroom leak repair/);
    assert.match(pack.caption, /Northside Plumbing/);

    const storyCopy = [pack.caption, ...pack.slides.flatMap((slide) => [slide.title, slide.body])].join(" ");
    assert.doesNotMatch(storyCopy, /\b(?:review|testimonial|stars?|rating|minutes?|hours?|percent|% off)\b/i);
  });

  it("refuses to build a pack from an incomplete or unconsented job", () => {
    for (const source of ineligibleSources) {
      assert.throws(() => buildStoryPack(source, "pack-1", "2026-10-29T12:00:00.000Z"), Error, source.id);
    }
  });
});

function approvalSnapshot(pack:StoryPack) {
  return {expectedUpdatedAt:pack.updatedAt,expectedMedia:eligibleSource.assets.map(asset=>({id:asset.id,role:asset.role as "before"|"after",revision:"a".repeat(64)}))};
}

function createTestClient() {
  const sources = structuredClone([eligibleSource, ...ineligibleSources]);
  const packs: ReturnType<typeof buildStoryPack>[] = [];
  return {
    sources,
    packs,
    client: {
      listSources: async () => structuredClone(sources),
      listPacks: async () => structuredClone(packs),
      findPack: async (id: string) => structuredClone(packs.find((pack) => pack.id === id) ?? null),
      create: async (pack: ReturnType<typeof buildStoryPack>) => {
        packs.push(structuredClone(pack));
        return structuredClone(pack);
      },
      listPhotoJobs: async () => [],
      assignPhotos: async () => {},
      review: async (id: string) => {
        const pack = packs.find(pack => pack.id === id)!;
        Object.assign(pack, {status: "approved", canHandoff:true});
        return structuredClone(pack);
      },
      handoff: async (id: string) => {
        const pack = packs.find(pack => pack.id === id)!;
        Object.assign(pack, {canHandoff:true});
        return structuredClone({pack,source:sources[0]});
      },
      update: async (pack: ReturnType<typeof buildStoryPack>) => {
        const index = packs.findIndex((candidate) => candidate.id === pack.id);
        if (index < 0) throw new Error("pack not found");
        packs[index] = structuredClone(pack);
        return structuredClone(pack);
      },
    },
  };
}

describe("Story Pack service", () => {
  it("lists only completed, consented jobs with a before and after asset", async () => {
    const { client } = createTestClient();
    const service = createStoryPackService(client, {
      newId: () => "pack-1",
      now: () => "2026-10-29T12:00:00.000Z",
    });

    assert.deepEqual(await service.listSources(), [eligibleSource]);
  });

  it("creates drafts only from an eligible job and rejects unknown or ineligible sources", async () => {
    const { client, packs } = createTestClient();
    const service = createStoryPackService(client, {
      newId: () => "pack-1",
      now: () => "2026-10-29T12:00:00.000Z",
    });

    const draft = await service.createFromJob(eligibleSource.id);
    assert.equal(draft?.id, "pack-1");
    assert.equal(packs.length, 1);
    await assert.rejects(service.createFromJob("missing"), Error);
    await assert.rejects(service.createFromJob("job-no-consent"), Error);
  });

  it("lets the owner edit a draft and blocks edits after approval", async () => {
    const { client } = createTestClient();
    const service = createStoryPackService(client, {
      newId: () => "pack-1",
      now: () => "2026-10-29T12:00:00.000Z",
    });
    const draft = await service.createFromJob(eligibleSource.id);
    assert.ok(draft);

    const edited = await service.updateDraft(draft.id, {
      caption: "A completed bathroom repair from our demo workspace.",
      slides: draft.slides.map((slide, index) => index === 0 ? { ...slide, title: "A repair story" } : slide),
      platforms: { facebook: true, instagram: true },
    });
    assert.equal(edited?.caption, "A completed bathroom repair from our demo workspace.");
    assert.deepEqual(edited?.platforms, { facebook: true, instagram: true });

    await service.approve(draft.id,approvalSnapshot(edited));
    await assert.rejects(service.updateDraft(draft.id, { caption: "Changed after approval" }), Error);
  });

  it("requires approval before preparing a handoff, and never reports a successful publication", async () => {
    const { client } = createTestClient();
    const service = createStoryPackService(client, {
      newId: () => "pack-1",
      now: () => "2026-10-29T12:00:00.000Z",
    });
    const draft = await service.createFromJob(eligibleSource.id);
    assert.ok(draft);

    await assert.rejects(service.prepareHandoff(draft.id), Error);
    const saved = await service.updateDraft(draft.id, { platforms: { facebook:true, instagram:false } });
    const approved = await service.approve(draft.id,approvalSnapshot(saved));
    assert.equal(approved?.status, "approved");
    const handoff = await service.prepareHandoff(draft.id);
    assert.equal(handoff?.pack.status, "approved");
    assert.notEqual(handoff?.pack.status, "published");
    await assert.rejects(service.approve(draft.id,approvalSnapshot(saved)), Error);
  });
});


describe("selected Story Pack media", () => {
  it("rejects missing, duplicate, or foreign selected IDs even if another before/after pair exists", () => {
    const pack=buildStoryPack(eligibleSource,"pack-1","2026-10-30T00:00:00Z");
    assert.deepEqual(pack.sourceMediaIds,["media-before","media-after"]);
    assert.equal(hasSelectedStoryMedia(pack,eligibleSource),true);
    for(const sourceMediaIds of [["media-before"],["media-before","media-before"],["media-before","media-after","missing"],["missing","media-after"]]) {
      assert.equal(hasSelectedStoryMedia({...pack,sourceMediaIds},eligibleSource),false);
    }
    assert.equal(hasSelectedStoryMedia(pack,{...eligibleSource,shareConsent:"no"}),false);
    assert.equal(hasSelectedStoryMedia(pack,{...eligibleSource,id:"another-job"}),false);
  });
});


describe("business-neutral Story Pack copy", () => {
  it("uses the selected business and job without adding a plumbing-specific service", () => {
    const pack=buildStoryPack({...eligibleSource,businessName:"Local Tailoring",jobTitle:"Jacket alterations"},"pack-tailor","2026-10-30T00:00:00Z");
    const copy=[pack.caption,...pack.slides.flatMap(slide=>[slide.title,slide.body])].join(" ");
    assert.match(copy,/Local Tailoring/);
    assert.match(copy,/Jacket alterations/);
    assert.doesNotMatch(copy,/plumb|leak|repair/i);
  });
});


describe("approval snapshots",()=>{
  it("rejects a draft changed since the displayed approval version",async()=>{
    const {client,packs}=createTestClient();
    const service=createStoryPackService(client);
    const draft=await service.createFromJob(eligibleSource.id);
    const saved=await service.updateDraft(draft.id,{platforms:{facebook:true,instagram:false}});
    const snapshot=approvalSnapshot(saved);
    packs[0].updatedAt="2099-01-01T00:00:00.000Z";
    await assert.rejects(service.approve(saved.id,snapshot),/changed/);
    assert.equal(packs[0].status,"draft");
  });
  it("keeps authorization approved until delivery and rejects demo role changes after approval",async()=>{
    const service=createStoryPackService(createFakeStoryPackClient());
    const source=(await service.listSources())[0];
    const draft=await service.createFromJob(source.id);
    const saved=await service.updateDraft(draft.id,{platforms:{facebook:true,instagram:false}});
    await service.approve(saved.id,{expectedUpdatedAt:saved.updatedAt,expectedMedia:source.assets.map(asset=>({id:asset.id,role:asset.role as "before"|"after",revision:asset.revision!}))});
    assert.equal((await service.prepareHandoff(saved.id)).pack.status,"approved");
    assert.equal((await service.listPacks())[0].status,"approved");
    await service.assignPhotos(source.id,source.assets[1].id,source.assets[0].id);
    await assert.rejects(service.prepareHandoff(saved.id),/changed/);
    assert.equal((await service.listPacks())[0].canHandoff,false);
  });
});


describe('approval media snapshot', () => {
  it('returns the before/after selected media with their revisions', () => {
    const source: StorySource = {
      ...eligibleSource,
      assets: [
        { id: 'media-before', role: 'before', label: 'Before', revision: 'rev-before-1' },
        { id: 'media-after', role: 'after', label: 'After', revision: 'rev-after-1' },
        { id: 'media-job', role: 'job_photo', label: 'Job photo', revision: 'rev-job-1' },
      ],
    };
    const pack = buildStoryPack(source, 'pack-1', '2026-10-30T00:00:00.000Z');
    const result = buildApprovalMediaSnapshot(source, pack);

    assert.deepEqual(result, [
      { id: 'media-before', role: 'before', revision: 'rev-before-1' },
      { id: 'media-after', role: 'after', revision: 'rev-after-1' },
    ]);
  });

  it('returns null when any selected asset lacks a revision', () => {
    const sourceWithoutRevision: StorySource = {
      ...eligibleSource,
      assets: [
        { id: 'media-before', role: 'before', label: 'Before' },
        { id: 'media-after', role: 'after', label: 'After', revision: 'rev-after-1' },
      ],
    };
    const pack = buildStoryPack(sourceWithoutRevision, 'pack-1', '2026-10-30T00:00:00.000Z');
    const result = buildApprovalMediaSnapshot(sourceWithoutRevision, pack);

    assert.equal(result, null);
  });

  it('preserves approval when an unselected asset lacks a revision', () => {
    const sourceWithUnselectedMissing: StorySource = {
      ...eligibleSource,
      assets: [
        { id: 'media-before', role: 'before', label: 'Before', revision: 'rev-before-1' },
        { id: 'media-after', role: 'after', label: 'After', revision: 'rev-after-1' },
        { id: 'media-unselected', role: 'job_photo', label: 'Unselected without revision' },
      ],
    };
    const pack = buildStoryPack(sourceWithUnselectedMissing, 'pack-1', '2026-10-30T00:00:00.000Z');
    const result = buildApprovalMediaSnapshot(sourceWithUnselectedMissing, pack);

    assert.deepEqual(result, [
      { id: 'media-before', role: 'before', revision: 'rev-before-1' },
      { id: 'media-after', role: 'after', revision: 'rev-after-1' },
    ]);
  });
});

