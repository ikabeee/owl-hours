import { useState } from "react";
import { exportAndDeliverStoryPack } from "./storyPackExportController.ts";
import { storyPackExportCopys } from "../copys/storyPackExportCopys.ts";
import { contentCopys as copy } from "../copys/contentCopys.ts";

export function useStoryPackExport(
  deps: Parameters<typeof exportAndDeliverStoryPack>[0],
) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  async function exportPack() {
    setExporting(true);
    setExportError(null);
    try {
      await exportAndDeliverStoryPack(deps);
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
