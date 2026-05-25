import type { Mission } from "@/lib/types";

const dayFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

export function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatKoreanDate(date: Date | string) {
  return dayFormatter.format(typeof date === "string" ? parseDateKey(date) : date);
}

export function isMissionDay(date: Date) {
  const day = date.getDay();
  return day === 2 || day === 6;
}

export function getNextMissionDate(from = new Date()) {
  const next = new Date(from);
  next.setHours(0, 0, 0, 0);
  while (!isMissionDay(next)) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function getPreviousMissionDate(from = new Date()) {
  const prev = new Date(from);
  prev.setHours(0, 0, 0, 0);
  prev.setDate(prev.getDate() - 1);
  while (!isMissionDay(prev)) {
    prev.setDate(prev.getDate() - 1);
  }
  return prev;
}

export function buildMissionInput(date: Date) {
  const missionDate = new Date(date);
  missionDate.setHours(0, 0, 0, 0);
  const hashtagDate = new Date(missionDate);
  hashtagDate.setDate(hashtagDate.getDate() - 1);
  const mm = String(hashtagDate.getMonth() + 1).padStart(2, "0");
  const dd = String(hashtagDate.getDate()).padStart(2, "0");
  const tagBody = `디인챌_${mm}${dd}`;

  return {
    mission_date: toDateKey(missionDate),
    hashtag_date: toDateKey(hashtagDate),
    hashtag: `#${tagBody}`,
    instagram_url: `https://www.instagram.com/explore/tags/${tagBody}/`,
    status: "available" as const,
  };
}

export function getMonthMissionDates(year: number, monthIndex: number) {
  const dates: string[] = [];
  const cursor = new Date(year, monthIndex, 1);
  while (cursor.getMonth() === monthIndex) {
    if (isMissionDay(cursor)) dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getMissionDatesBetween(startKey: string, endKey: string) {
  const dates: string[] = [];
  const cursor = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  while (cursor <= end) {
    if (isMissionDay(cursor)) dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getMonthLabel(year: number, monthIndex: number) {
  return `${year}년 ${monthIndex + 1}월`;
}

export function getRecentMonths(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: getMonthLabel(date.getFullYear(), date.getMonth()),
      year: date.getFullYear(),
      monthIndex: date.getMonth(),
    };
  });
}

export function emptyMission(date: Date): Mission {
  const input = buildMissionInput(date);
  return {
    id: input.mission_date,
    ...input,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
