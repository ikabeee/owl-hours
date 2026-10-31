import { useState } from "react";
import { exportAndDeliverStoryPack } from "./storyPackExportController.ts";
import { createStoryPhotoFetcher } from "../services/storyPackPhotoService.ts";
import type { ExportFile, ExportHandoff, FetchStoryPhoto } from "../lib/storyPackExport.ts";
import { storyPackExportCopys } from "../copys/storyPackExportCopys.ts";
import { contentCopys as copy } from "../copys/contentCopys.ts";

type ExportDeps = Parameters<typeof exportAndDeliverStoryPack>[0];

export type UseStoryPackExportDeps = Omit<ExportDeps, "render"> & {
  render: (handoff: ExportHandoff, fetchPhoto: FetchStoryPhoto) => Promise<ExportFile[]>;
  fetchPhoto?: FetchStoryPhoto;
};

export function useStoryPackExport(deps: UseStoryPackExportDeps) {
  const [defaultFetchPhoto] = useState(() => createStoryPhotoFetcher());
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const fetchPhoto = deps.fetchPhoto ?? defaultFetchPhoto;

  async function exportPack() {
    setExporting(true);
    setExportError(null);
    try {
      await exportAndDeliverStoryPack({
        ...deps,
        render: (handoff) => deps.render(handoff, fetchPhoto),
      });
    } catch (error) {
      const knownMessages: string[] = Object.values(storyPackExportCopys);
      setExportError(
        error instanceof Error && knownMessages.includes(error.message)
          ? error.message
          : copy.exportFailed,
      );
    } finally {
      setExporting(false);
    }
  }
  return {
    exporting,
    exportError,
    exportPack,
    clearExportError: () => setExportError(null),
  };
}
