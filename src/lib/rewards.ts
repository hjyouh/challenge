export type Reward = {
  key: "none" | "small" | "silver" | "gold";
  label: string;
  image: string;
  nextTarget: number | null;
};

export function getReward(completed: number): Reward {
  if (completed >= 8) return { key: "gold", label: "황금 복주머니", image: "/images/bok-gold.png", nextTarget: null };
  if (completed >= 4) return { key: "silver", label: "은색 복주머니", image: "/images/bok-silver.png", nextTarget: 8 };
  if (completed >= 1) return { key: "small", label: "작은 복주머니", image: "/images/bok-small.png", nextTarget: 4 };
  return { key: "none", label: "아직 없음", image: "/images/inactive-card.png", nextTarget: 1 };
}

export function getGrade(rate: number) {
  if (rate >= 90) return { label: "다이아몬드", icon: "💎" };
  if (rate >= 80) return { label: "금", icon: "🥇" };
  if (rate >= 70) return { label: "은", icon: "🥈" };
  if (rate >= 60) return { label: "동", icon: "🥉" };
  return { label: "분발", icon: "🌱" };
}

export function getRate(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}
