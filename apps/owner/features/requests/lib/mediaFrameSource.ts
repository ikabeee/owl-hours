const LOADABLE_URL = /^(https?:|data:)/;

// Where the banner image comes from: a demo id maps to its embedded frame, a real URL is used
// as is, and anything else has no frame (null), so the screen shows the caption instead of a blank banner.
export function mediaFrameSource(thumbUrl: string, demoFrames: Readonly<Record<string, string>>): string | null {
  const demoFrame = demoFrames[thumbUrl];
  if (demoFrame) return demoFrame;

  return LOADABLE_URL.test(thumbUrl) ? thumbUrl : null;
}
