import {
  createVerifiedStoryPackExport,
  type ExportFile,
  type ExportHandoff,
} from "../lib/storyPackExport.ts";
import {
  encodeStoryPackBytes,
  type StoryPackDelivery,
} from "../lib/storyPackDelivery.ts";

export async function exportAndDeliverStoryPack(deps: {
  authorize: () => Promise<ExportHandoff | null>;
  render: (handoff: ExportHandoff) => Promise<ExportFile[]>;
  deliver: (payload: StoryPackDelivery) => Promise<void>;
  delivered: (packId: string) => Promise<void>;
}): Promise<void> {
  let packId: string | null = null;
  const result = await createVerifiedStoryPackExport({
    authorize: async () => {
      const handoff = await deps.authorize();
      if (handoff) packId = handoff.pack.id;
      return handoff;
    },
    render: deps.render,
  });
  await deps.deliver({
    filename: result.filename,
    base64: encodeStoryPackBytes(result.bytes),
  });
  if (packId) await deps.delivered(packId);
}
