import type { StoryPackApprovalSnapshot } from "@owl-hours/shared";
import type { StoryPackDeps } from "../services/storyPackRuntime.ts";
import type {
  StoryPackPatch,
  StoryPackService,
} from "../services/storyPackService.ts";
import type { Session } from "../../../shared/infra/ownerSessionService.ts";
import { authCopys } from "../../../shared/copys/ownerAuthCopys.ts";
import { storyPackServiceCopys as copy } from "../copys/storyPackServiceCopys.ts";
import type {
  StoryHandoff,
  StoryPack,
  StoryPhotoJob,
  StorySource,
} from "../lib/storyPack.ts";

export type StoryPackState = {
  mode: StoryPackDeps["mode"];
  authStatus: "loading" | "signed_out" | "signed_in";
  sessionEmail: string | null;
  authBusy: boolean;
  sources: StorySource[];
  packs: StoryPack[];
  photoJobs: StoryPhotoJob[];
  selectedPack: StoryPack | null;
  deliveryReceipt: { packId: string; openedAt: string } | null;
  loading: boolean;
  error: string | null;
  notice: string | null;
};

// Only known product messages reach the UI. Unknown causes remain available to
// the caller's diagnostics callback without serializing credentials into DOM props.
export function storyPackErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const known: string[] = [...Object.values(copy), ...Object.values(authCopys)];
  return error instanceof Error && known.includes(error.message)
    ? error.message
    : fallback;
}

export function createStoryPackController(
  runtime: StoryPackDeps,
  onFailure?: (error: unknown) => void,
) {
  let state: StoryPackState = {
    mode: runtime.mode,
    authStatus: runtime.auth ? "loading" : "signed_out",
    sessionEmail: null,
    authBusy: false,
    sources: [],
    packs: [],
    photoJobs: [],
    selectedPack: null,
    deliveryReceipt: null,
    loading: runtime.mode !== "unconfigured",
    error: null,
    notice: null,
  };
  let active = false;
  let lifecycle = 0;
  let epoch = 0;
  let readSequence = 0;
  let selectedId: string | null = null;
  let ownerKey: string | null = null;
  let unsubscribe = () => {};
  let authorized: { packId: string; epoch: number } | null = null;
  const listeners = new Set<() => void>();

  function update(patch: Partial<StoryPackState>) {
    state = { ...state, ...patch };
    state.selectedPack =
      state.packs.find((pack) => pack.id === selectedId) ?? null;
    for (const listener of listeners) listener();
  }
  function clearOwnerData() {
    selectedId = null;
    authorized = null;
    update({
      sources: [],
      packs: [],
      photoJobs: [],
      deliveryReceipt: null,
      notice: null,
      error: null,
    });
  }
  function report(error: unknown, fallback: string) {
    onFailure?.(error);
    update({ error: storyPackErrorMessage(error, fallback) });
  }
  const current = (version: number) => active && epoch === version;
  const usable = () =>
    active &&
    !!runtime.service &&
    (runtime.mode !== "live" || state.authStatus === "signed_in");

  async function refresh(): Promise<boolean> {
    if (!usable()) {
      update({ loading: false });
      return false;
    }
    const version = epoch;
    const read = ++readSequence;
    update({ loading: true });
    try {
      const sources = await runtime.service!.listSources();
      const [packs, photoJobs] = await Promise.all([
        runtime.service!.listPacks(),
        runtime.service!.listPhotoJobs(),
      ]);
      if (!current(version) || read !== readSequence) return false;
      update({ sources, packs, photoJobs, error: null });
      return true;
    } catch (error) {
      if (current(version) && read === readSequence) {
        update({
          sources: [],
          photoJobs: [],
          packs: state.packs.map((pack) => ({ ...pack, canHandoff: false })),
        });
        report(error, copy.loadError);
      }
      return false;
    } finally {
      if (current(version) && read === readSequence) update({ loading: false });
    }
  }

  function acceptSession(session: Session | null) {
    const key = session?.user.id ?? session?.user.email ?? null;
    if (key !== ownerKey) {
      epoch++;
      ownerKey = key;
      clearOwnerData();
    }
    update({
      sessionEmail: session?.user.email ?? null,
      authStatus: session ? "signed_in" : "signed_out",
    });
    if (!session) update({ loading: false });
  }
  async function start() {
    active = true;
    const lifetime = ++lifecycle;
    epoch++;
    if (!runtime.auth) {
      await refresh();
      return;
    }
    let events = 0;
    unsubscribe = runtime.auth.subscribe((session) => {
      if (!active) return;
      events++;
      acceptSession(session);
      void refresh();
    });
    const version = events;
    try {
      const session = await runtime.auth.restore();
      if (!active || lifetime !== lifecycle || events !== version) return;
      acceptSession(session);
      await refresh();
    } catch (error) {
      if (active && lifetime === lifecycle && events === version) {
        acceptSession(null);
        report(error, authCopys.restoreError);
      }
    }
  }
  function stop() {
    active = false;
    lifecycle++;
    epoch++;
    authorized = null;
    unsubscribe();
  }

  async function perform(
    action: (service: StoryPackService) => Promise<StoryPack>,
    notice: string,
  ) {
    if (!usable()) return null;
    const version = epoch;
    const selectionAtStart = selectedId;
    try {
      const pack = await action(runtime.service!);
      if (!current(version)) return null;
      // A successful write is a successful save even if the subsequent list
      // refresh fails. Return it so the editor can commit its clean baseline.
      if (selectedId === selectionAtStart) selectedId = pack.id;
      update({
        packs: [...state.packs.filter((value) => value.id !== pack.id), pack],
        notice,
        error: null,
      });
      await refresh();
      if (!current(version)) return null;
      const refreshed = state.packs.find((value) => value.id === pack.id);
      // Eligibility may be refreshed, but never adopt another editor's unseen
      // copy/version as the receipt for the owner's just-completed save.
      return refreshed?.updatedAt === pack.updatedAt ? refreshed : pack;
    } catch (error) {
      if (current(version)) {
        await refresh();
        if (current(version)) report(error, copy.updateError);
      }
      return null;
    }
  }
  async function signIn(email: string) {
    if (!runtime.auth) return;
    const version = epoch;
    update({ authBusy: true, error: null });
    try {
      await runtime.auth.signIn(email);
      if (current(version)) update({ notice: authCopys.linkSent });
    } catch (error) {
      if (current(version)) report(error, authCopys.signInError);
    } finally {
      if (active) update({ authBusy: false });
    }
  }
  async function signOut() {
    if (!runtime.auth) return;
    epoch++;
    clearOwnerData();
    update({ authBusy: true, authStatus: "signed_out", sessionEmail: null });
    try {
      await runtime.auth.signOut();
      ownerKey = null;
    } catch (error) {
      if (active) report(error, authCopys.signOutError);
    } finally {
      if (active) update({ authBusy: false, loading: false });
    }
  }
  async function assignPhotos(
    jobId: string,
    beforeId: string,
    afterId: string,
  ) {
    if (!usable()) return;
    const version = epoch;
    try {
      await runtime.service!.assignPhotos(jobId, beforeId, afterId);
      if (current(version) && (await refresh()) && current(version))
        update({ notice: copy.photosAssigned });
    } catch (error) {
      if (current(version)) {
        await refresh();
        if (current(version)) report(error, copy.updateError);
      }
    }
  }
  async function prepareHandoff(): Promise<StoryHandoff | null> {
    if (!selectedId || !usable()) return null;
    const id = selectedId;
    const version = epoch;
    try {
      const result = await runtime.service!.prepareHandoff(id);
      if (!current(version)) return null;
      authorized = { packId: id, epoch: version };
      update({
        packs: state.packs.map((pack) => (pack.id === id ? result.pack : pack)),
        sources: state.sources.map((source) =>
          source.id === result.source.id ? result.source : source,
        ),
        error: null,
      });
      return result;
    } catch (error) {
      authorized = null;
      if (current(version)) {
        await refresh();
        if (current(version)) {
          update({
            packs: state.packs.map((pack) =>
              pack.id === id ? { ...pack, canHandoff: false } : pack,
            ),
          });
          report(error, copy.selectedMediaBlocked);
        }
      }
      return null;
    }
  }
  async function markHandoffDelivered(packId: string) {
    if (!active || authorized?.packId !== packId || authorized.epoch !== epoch)
      return;
    authorized = null;
    update({
      deliveryReceipt: { packId, openedAt: new Date().toISOString() },
      notice: copy.handoffReady,
    });
  }
  return {
    start,
    stop,
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    signIn,
    signOut,
    assignPhotos,
    prepareHandoff,
    markHandoffDelivered,
    reload: async () => {
      await refresh();
    },
    createFromJob: (jobId: string) =>
      perform(
        (service) => service.createFromJob(jobId),
        runtime.mode === "demo" ? copy.demoCreated : copy.created,
      ),
    updateDraft: (patch: StoryPackPatch) =>
      selectedId
        ? perform(
            (service) => service.updateDraft(selectedId!, patch),
            runtime.mode === "demo" ? copy.demoSaved : copy.saved,
          )
        : Promise.resolve(null),
    approve: (snapshot: StoryPackApprovalSnapshot) =>
      selectedId
        ? perform(
            (service) => service.approve(selectedId!, snapshot),
            runtime.mode === "demo" ? copy.demoApproved : copy.approved,
          )
        : Promise.resolve(null),
    selectPack: async (id: string | null) => {
      selectedId = id;
      update({});
    },
    clearNotice: async () => {
      update({ notice: null, error: null });
    },
  };
}
