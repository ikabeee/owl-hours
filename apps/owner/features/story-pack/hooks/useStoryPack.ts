import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  createStoryPackRuntime,
  type StoryPackDeps,
} from "../services/storyPackRuntime.ts";
import { createStoryPackController } from "./storyPackController.ts";
export type { StoryPackDeps } from "../services/storyPackRuntime.ts";

export function useStoryPack(deps?: StoryPackDeps) {
  const [defaults] = useState(() => deps ?? createStoryPackRuntime());
  const runtime = deps ?? defaults;
  const controller = useMemo(
    () => createStoryPackController(runtime),
    [runtime],
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(() => {
    void controller.start();
    return () => controller.stop();
  }, [controller]);
  return {
    ...state,
    signOut: controller.signOut,
    reload: controller.reload,
    assignPhotos: controller.assignPhotos,
    createFromJob: controller.createFromJob,
    selectPack: controller.selectPack,
    updateDraft: controller.updateDraft,
    approve: controller.approve,
    prepareHandoff: controller.prepareHandoff,
    markHandoffDelivered: controller.markHandoffDelivered,
    clearNotice: controller.clearNotice,
  };
}
export type StoryPackView = ReturnType<typeof useStoryPack>;
