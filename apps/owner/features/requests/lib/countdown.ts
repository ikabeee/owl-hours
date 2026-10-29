const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;

export function formatCountdown(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / SECONDS_PER_MINUTE);
  const remainder = String(wholeSeconds % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function secondsLeft(expiresAt: string, now: string): number {
  const msLeft = Date.parse(expiresAt) - Date.parse(now);
  return Math.max(0, Math.floor(msLeft / MS_PER_SECOND));
}

export function acceptWindowSeconds(urgent: boolean, acceptWindowMin: { urgent: number; other: number }): number {
  const minutes = urgent ? acceptWindowMin.urgent : acceptWindowMin.other;
  return minutes * SECONDS_PER_MINUTE;
}
