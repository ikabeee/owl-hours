// Spec: odd/tasks/owner-content.md, S3 requirement.
// Formats the post scheduling time with clock injection, returning the value only ("Today, 6:00 PM");
// the "When" label lives in copys.
// Non-today branch returns null (no raw ISO date).

const ISO_WALL_CLOCK = /T(\d{2}):(\d{2})/;
const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;

export function postWhenText(scheduledFor?: string | null, now?: string): string | null {
  if (!scheduledFor) {
    return null;
  }

  if (Number.isNaN(Date.parse(scheduledFor))) {
    return null;
  }

  const matchTime = ISO_WALL_CLOCK.exec(scheduledFor);
  const matchDate = ISO_DATE.exec(scheduledFor);
  if (!matchTime || !matchDate) {
    return null;
  }

  const hours24 = Number(matchTime[1]);
  const minutes = matchTime[2];
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const timeText = `${hours12}:${minutes} ${period}`;

  const nowDate = now ? ISO_DATE.exec(now)?.[1] : undefined;
  const isToday = !nowDate || matchDate[1] === nowDate;

  return isToday ? `Today, ${timeText}` : null;
}
