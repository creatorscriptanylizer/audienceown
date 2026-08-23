export type ScheduleInput = {
  localValue: string;
  timeZone: string;
  isoValue: string;
};

export function combineScheduleLocalValue(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return "";
  return `${date}T${time}`;
}

export function localScheduleToIso(localValue: string) {
  if (!localParts(localValue)) return "";
  const instant = new Date(localValue);
  return Number.isNaN(instant.getTime()) ? "" : instant.toISOString();
}

function localParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3],
    hour: match[4],
    minute: match[5],
  };
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateScheduleInput(input: ScheduleInput) {
  const expected = localParts(input.localValue);
  if (!expected || !isValidTimeZone(input.timeZone)) return null;
  const instant = new Date(input.isoValue);
  if (Number.isNaN(instant.getTime())) return null;
  const actual = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: input.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(instant).map((part) => [part.type, part.value]),
  );
  return ["year", "month", "day", "hour", "minute"].every(
    (key) => actual[key] === expected[key as keyof typeof expected],
  ) ? instant.toISOString() : null;
}

export function formatScheduledDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}
