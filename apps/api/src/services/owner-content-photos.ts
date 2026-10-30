// Explicit owner attribution of customer photos; this flow never creates consent.
import { z } from "zod";
import type { OwnerSession } from "../http/auth.ts";
import { RepositoryError } from "../db/repository.ts";
import { unwrap } from "./db-result.ts";

const uuid = z.string().uuid();
const photoJobRows = z.array(z.object({
  id: uuid,
  businessName: z.string(),
  jobTitle: z.string(),
  shareConsent: z.enum(["yes", "no", "not_asked"]),
  consentRecordedAt: z.string().nullable(),
  assignmentBlockedReason: z.enum(["consent_required", "ambiguous_conversation"]).nullable(),
  assets: z.array(z.object({
    id: uuid,
    role: z.enum(["before", "after", "unassigned"]),
    storagePath: z.string().min(1),
  })),
}));

async function photoJobs(s: OwnerSession) {
  return photoJobRows.parse(unwrap(await s.db.rpc("owner_content_photo_jobs", { p_limit: 100 })));
}

export async function listContentPhotoJobs(s: OwnerSession) {
  const initial = await photoJobs(s);
  const paths = [...new Set(initial.flatMap((job) => job.assets.map((asset) => asset.storagePath)))];
  const links = new Map<string, string>();
  if (paths.length) {
    const result = await s.db.storage.from("media").createSignedUrls(paths, 600);
    if (result.error) throw new RepositoryError("Could not prepare photo previews.", null);
    for (const link of result.data ?? []) {
      if (link.path && link.signedUrl && !link.error) links.set(link.path, link.signedUrl);
    }
  }
  // Re-read after signing: a revoked consent or reassigned photo must not be
  // returned. Already-issued links retain the storage service's 600s TTL.
  // With no links to sign there was no external I/O race to recheck.
  const current = paths.length ? await photoJobs(s) : initial;
  return current.map(({ assets, ...job }) => {
    const previous = initial.find((item) => item.id === job.id);
    return {
      ...job,
      assets: assets.flatMap((asset) => {
        const wasEligible = previous?.assets.some((old) =>
          old.id === asset.id && old.storagePath === asset.storagePath && old.role === asset.role
        );
        const imageUrl = links.get(asset.storagePath);
        return wasEligible && imageUrl ? [{
          id: asset.id,
          role: asset.role,
          label: photoLabel(asset.role),
          imageUrl,
        }] : [];
      }),
    };
  });
}

export async function assignContentPhotos(s: OwnerSession, jobId: string, beforeMediaId: string, afterMediaId: string) {
  return z.object({ jobId: uuid, beforeMediaId: uuid, afterMediaId: uuid }).parse(unwrap(await s.db.rpc("owner_assign_content_photos", {
    p_job_id: jobId, p_before_media_id: beforeMediaId, p_after_media_id: afterMediaId,
  })));
}

const PHOTO_LABELS = {
  before: "Before photo",
  after: "After photo",
  unassigned: "Unassigned job photo",
} as const;

function photoLabel(role: keyof typeof PHOTO_LABELS): string {
  return PHOTO_LABELS[role];
}
