const TZ = "Asia/Manila";
const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const dateOnly = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** For YYYY-MM-DD values (no time zone shift). */
export const formatDay = (ymd: string) => dateOnly.format(new Date(`${ymd}T00:00:00Z`));

/** Current Manila date and time as YYYY-MM-DD and HH:MM. */
export function nowManila() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
