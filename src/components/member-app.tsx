"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Gift, Home, LogOut, Medal, Trophy, UserRound } from "lucide-react";
import { CompletionAnimation } from "@/components/completion-animation";
import { ImageFallback } from "@/components/image-fallback";
import { Card, Pill, PrimaryButton } from "@/components/ui";
import {
  buildMissionInput,
  emptyMission,
  formatKoreanDate,
  getMonthMissionDates,
  getMissionDatesBetween,
  getNextMissionDate,
  getPreviousMissionDate,
  getRecentMonths,
  isMissionDay,
  parseDateKey,
  toDateKey,
} from "@/lib/mission";
import { getGrade, getRate, getReward } from "@/lib/rewards";
import type { Mission, MissionCheck, Profile, PublicProfile } from "@/lib/types";

type Tab = "home" | "card" | "ranking" | "my";

function createDemoProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: "demo-user",
    email: "local@test.com",
    nickname: "로컬회원",
    instagram_id: "deinchal_demo",
    role: "member",
    status: "active",
    joined_at: now,
    created_at: now,
    updated_at: now,
  };
}

function createDemoMissions() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const demoMissions: Mission[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    if (isMissionDay(cursor)) demoMissions.push(emptyMission(new Date(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }
  return demoMissions;
}

function createDemoMembers(profile: Profile): PublicProfile[] {
  const joined = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString();
  return [
    { id: profile.id, nickname: profile.nickname, instagram_id: profile.instagram_id, joined_at: profile.joined_at, status: "active" },
    { id: "demo-friend-1", nickname: "복주머니왕", instagram_id: "bok_king", joined_at: joined, status: "active" },
    { id: "demo-friend-2", nickname: "천사챌린저", instagram_id: "angel_challenge", joined_at: joined, status: "active" },
  ];
}

export function MemberApp() {
  const router = useRouter();
  const initialProfile = createDemoProfile();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [missions, setMissions] = useState<Mission[]>(createDemoMissions);
  const [checks, setChecks] = useState<MissionCheck[]>([]);
  const [members, setMembers] = useState<PublicProfile[]>(() => createDemoMembers(initialProfile));
  const [tab, setTab] = useState<Tab>("home");
  const [selectedMonth, setSelectedMonth] = useState(getRecentMonths(1)[0].value);
  const [checked, setChecked] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const rawProfile = localStorage.getItem("deinchal-demo-profile");
      const demoProfile = rawProfile ? (JSON.parse(rawProfile) as Profile) : createDemoProfile();
      localStorage.setItem("deinchal-demo-profile", JSON.stringify(demoProfile));
      const demoMissions = createDemoMissions();
      const storedChecks = JSON.parse(localStorage.getItem("deinchal-demo-checks") ?? "[]") as MissionCheck[];
      setProfile(demoProfile);
      setMissions(demoMissions);
      setChecks(storedChecks);
      setMembers(createDemoMembers(demoProfile));
      setLoading(false);
      return;
    } catch (error) {
      localStorage.removeItem("deinchal-demo-profile");
      localStorage.removeItem("deinchal-demo-checks");
      setMessage(error instanceof Error ? error.message : "로컬 데모 초기화 중 오류가 발생했습니다.");
      setLoading(false);
    }
  }

  async function completeMission(mission: Mission) {
    if (!profile || !checked) return;
    setMessage("");
      const existing = checks.some((check) => check.user_id === profile.id && check.mission_id === mission.id);
      if (existing) {
        setMessage("이미 완료한 미션이에요.");
        return;
      }
      const nextChecks: MissionCheck[] = [
        ...checks,
        {
          id: `demo-check-${mission.id}`,
          user_id: profile.id,
          mission_id: mission.id,
          mission_date: mission.mission_date,
          status: "completed",
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem("deinchal-demo-checks", JSON.stringify(nextChecks));
      setChecks(nextChecks);
      setJustCompleted(true);
      setChecked(false);
      return;
  }

  async function logout() {
      localStorage.removeItem("deinchal-demo-profile");
      localStorage.removeItem("deinchal-demo-checks");
      router.replace("/login");
      return;
  }

  const today = new Date();
  const todayKey = toDateKey(today);
  const todayMission = missions.find((mission) => mission.mission_date === todayKey) ?? (isMissionDay(today) ? emptyMission(today) : null);
  const recentDate = getPreviousMissionDate(today);
  const recentMission = missions.find((mission) => mission.mission_date === toDateKey(recentDate)) ?? emptyMission(recentDate);
  const myChecks = checks.filter((check) => check.user_id === profile?.id);
  const todayDone = Boolean(myChecks.find((check) => check.mission_date === todayKey && check.status === "completed"));
  const recentDone = Boolean(myChecks.find((check) => check.mission_date === recentMission.mission_date && check.status === "completed"));

  const monthStats = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const dates = getMonthMissionDates(year, month - 1);
    const completed = myChecks.filter((check) => dates.includes(check.mission_date) && check.status === "completed").length;
    const rate = getRate(completed, dates.length);
    return { year, monthIndex: month - 1, dates, completed, total: dates.length, rate, reward: getReward(completed), grade: getGrade(rate) };
  }, [myChecks, selectedMonth]);

  const ranking = useMemo(() => {
    const dates = monthStats.dates;
    return members
      .map((member) => {
        const memberChecks = checks.filter((check) => check.user_id === member.id && dates.includes(check.mission_date) && check.status === "completed");
        const completed = memberChecks.length;
        const rate = getRate(completed, dates.length);
        const latest = memberChecks.map((check) => check.completed_at ?? "").sort()[0] ?? member.joined_at;
        return { member, completed, rate, grade: getGrade(rate), latest };
      })
      .sort((a, b) => b.rate - a.rate || b.completed - a.completed || a.latest.localeCompare(b.latest));
  }, [checks, members, monthStats.dates]);

  const cumulative = useMemo(() => {
    if (!profile) return { total: 0, completed: 0, rate: 0, grade: getGrade(0) };
    const joined = toDateKey(new Date(profile.joined_at));
    const total = missions.filter((mission) => mission.mission_date >= joined).length;
    const completed = myChecks.filter((check) => check.mission_date >= joined && check.status === "completed").length;
    const rate = getRate(completed, total);
    return { total, completed, rate, grade: getGrade(rate) };
  }, [missions, myChecks, profile]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center text-slate-300">
        <div>
          <p>복주머니를 불러오는 중...</p>
          {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="grid min-h-screen place-items-center px-4 text-center text-slate-300">
        <div>
          <p>로컬 데모를 시작하지 못했습니다.</p>
          {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
          <button className="mt-4 rounded-2xl bg-amber-400 px-5 py-3 font-black text-slate-950" onClick={load}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-24 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-amber-200">디인챌 복주머니 미션</p>
          <h1 className="text-2xl font-black">{profile.nickname}님</h1>
        </div>
        <Pill tone={profile.status === "active" ? "success" : "danger"}>{profile.status}</Pill>
      </header>

      {tab === "home" && (
        <HomeTab
          todayMission={todayMission}
          recentMission={recentMission}
          todayDone={todayDone}
          recentDone={recentDone}
          checked={checked}
          justCompleted={justCompleted}
          message={message}
          setChecked={setChecked}
          completeMission={completeMission}
        />
      )}
      {tab === "card" && <CardTab selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} stats={monthStats} checks={myChecks} />}
      {tab === "ranking" && <RankingTab ranking={ranking} profile={profile} />}
      {tab === "my" && <MyTab profile={profile} stats={monthStats} cumulative={cumulative} logout={logout} />}

      <nav className="safe-bottom fixed inset-x-0 bottom-0 mx-auto grid max-w-md grid-cols-4 gap-1 border-t border-white/10 bg-slate-950/95 px-3 pt-2 backdrop-blur">
        {[
          ["home", Home, "홈"],
          ["card", CalendarDays, "내 카드"],
          ["ranking", Trophy, "랭킹"],
          ["my", UserRound, "마이"],
        ].map(([key, Icon, label]) => (
          <button key={key as string} onClick={() => setTab(key as Tab)} className={`grid place-items-center gap-1 rounded-2xl py-2 text-xs font-bold ${tab === key ? "bg-amber-400 text-slate-950" : "text-slate-400"}`}>
            <Icon size={20} />
            {label as string}
          </button>
        ))}
      </nav>
    </main>
  );
}

function HomeTab(props: {
  todayMission: Mission | null;
  recentMission: Mission;
  todayDone: boolean;
  recentDone: boolean;
  checked: boolean;
  justCompleted: boolean;
  message: string;
  setChecked: (value: boolean) => void;
  completeMission: (mission: Mission) => void;
}) {
  const missionToday = isMissionDay(new Date());
  const next = getNextMissionDate(new Date(Date.now() + (missionToday ? 24 * 60 * 60 * 1000 : 0)));

  return (
    <div className="grid gap-4">
      {!missionToday && (
        <Card className="bg-slate-900/80">
          <h2 className="text-xl font-black">오늘은 미션하는 날이 아니에요.</h2>
          <p className="mt-2 text-slate-300">다음 미션은 {formatKoreanDate(next)}이에요.</p>
          <p className="text-sm text-slate-400">다음 미션일에 다시 들어와 주세요.</p>
        </Card>
      )}

      {missionToday && props.todayMission && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">오늘은 디인챌 미션일이에요</h2>
              <p className="mt-2 text-3xl font-black text-amber-200">{props.todayMission.hashtag}</p>
            </div>
            <ImageFallback src="/images/bok-small.png" alt="오늘 미션" emoji="🧧" className="size-20 object-contain" />
          </div>
          <a className="mt-5 flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 font-extrabold text-amber-200" href={props.todayMission.instagram_url} target="_blank" rel="noreferrer">
            인스타그램에서 해시태그 보러가기
          </a>
          {props.todayDone ? (
            <Pill tone="success">오늘 미션 완료</Pill>
          ) : (
            <>
              <label className="mt-4 flex gap-3 rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-200">
                <input type="checkbox" checked={props.checked} onChange={(event) => props.setChecked(event.target.checked)} className="mt-1 size-5 accent-amber-400" />
                해당 해시태그 게시물을 확인하고 좋아요를 눌렀습니다.
              </label>
              {props.message && <p className="mt-3 text-sm text-red-300">{props.message}</p>}
              <PrimaryButton className="mt-4 w-full" disabled={!props.checked} onClick={() => props.completeMission(props.todayMission!)}>
                미션 완료
              </PrimaryButton>
            </>
          )}
        </Card>
      )}

      {props.justCompleted && <CompletionAnimation />}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">최근 미션</h2>
          <Pill tone={props.recentDone ? "success" : "danger"}>{props.recentDone ? "완료" : "미완료"}</Pill>
        </div>
        <p className="mt-3 text-slate-300">{formatKoreanDate(props.recentMission.mission_date)}</p>
        <p className="text-2xl font-black text-amber-200">{props.recentMission.hashtag}</p>
        {!props.recentDone && <p className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">이전 미션을 안 하셨네요 ㅠㅠ<br />이번 미션부터 다시 참여해 주세요.</p>}
      </Card>
    </div>
  );
}

function CardTab({ selectedMonth, setSelectedMonth, stats, checks }: { selectedMonth: string; setSelectedMonth: (value: string) => void; stats: any; checks: MissionCheck[] }) {
  const angel = stats.completed === stats.total && stats.total > 0;
  const nextLeft = stats.reward.nextTarget ? Math.max(stats.reward.nextTarget - stats.completed, 0) : 0;
  return (
    <div className="grid gap-4">
      <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="min-h-12 rounded-2xl border border-white/10 bg-slate-900 px-4 font-bold">
        {getRecentMonths(8).map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
      </select>
      <Card>
        <div className="flex gap-4">
          <ImageFallback src={angel ? "/images/angel-badge.png" : stats.reward.image} alt="보상" emoji={angel ? "👼" : "🧧"} className="size-24 object-contain" />
          <div>
            <h2 className="text-xl font-black">{stats.monthIndex + 1}월 디인챌 복주머니 현황</h2>
            <p className="mt-1 text-slate-300">완료 {stats.completed}회 / 전체 {stats.total}회</p>
            <p className="text-slate-300">참여율 {stats.rate}%</p>
            <p className="font-bold text-amber-200">현재 보상: {stats.reward.label}</p>
            <p className="text-sm text-slate-400">{angel ? "천사 배지를 받았어요." : nextLeft > 0 ? `다음 보상까지 ${nextLeft}회 남았어요` : "최고 보상에 도착했어요"}</p>
          </div>
        </div>
        <Pill tone="gold">{stats.grade.icon} {stats.grade.label}</Pill>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {stats.dates.map((date: string) => {
          const done = checks.some((check) => check.mission_date === date && check.status === "completed");
          const locked = date > toDateKey(new Date());
          return (
            <Card key={date} className="p-4">
              <p className="text-sm text-slate-400">{formatKoreanDate(date)}</p>
              <p className="mt-2 text-lg font-black">{done ? "completed" : locked ? "locked" : "missed"}</p>
              <Pill tone={done ? "success" : locked ? "default" : "danger"}>{done ? "완료" : locked ? "대기" : "미완료"}</Pill>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function RankingTab({ ranking, profile }: { ranking: any[]; profile: Profile }) {
  return (
    <div className="grid gap-3">
      <h2 className="text-xl font-black">이번 달 랭킹</h2>
      {ranking.map((row, index) => (
        <Card key={row.member.id} className={`p-4 ${row.member.id === profile.id ? "border-amber-300/70 bg-amber-300/10" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 font-black text-amber-200">{index + 1}</div>
              <div>
                <p className="font-black">{row.member.nickname}</p>
                <p className="text-sm text-slate-400">@{row.member.instagram_id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black">{row.completed}회</p>
              <p className="text-sm text-amber-200">{row.rate}% · {row.grade.icon}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MyTab({ profile, stats, cumulative, logout }: { profile: Profile; stats: any; cumulative: any; logout: () => void }) {
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-xl font-black">{profile.nickname}</h2>
        <p className="text-slate-400">@{profile.instagram_id}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="이번 달" value={`${stats.completed}/${stats.total}`} sub={`${stats.rate}% · ${stats.grade.icon} ${stats.grade.label}`} />
          <Stat label="누적" value={`${cumulative.completed}/${cumulative.total}`} sub={`${cumulative.rate}% · ${cumulative.grade.icon} ${cumulative.grade.label}`} />
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-3">
          <Gift className="text-amber-300" />
          <div>
            <h3 className="font-black">PWA 홈 화면 설치</h3>
            <p className="text-sm text-slate-400">이 앱을 홈 화면에 추가하면 더 편하게 사용할 수 있어요.</p>
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="font-black">앱 내부 알림</h3>
        <ul className="mt-3 grid gap-2 text-sm text-slate-300">
          <li>오늘은 미션하는 날이에요.</li>
          <li>아직 오늘 미션을 완료하지 않았어요.</li>
          <li>은색/황금 복주머니와 천사 배지 달성을 알려드려요.</li>
        </ul>
      </Card>
      <PrimaryButton onClick={logout} className="flex items-center justify-center gap-2 bg-slate-700 text-slate-100">
        <LogOut size={18} /> 로그아웃
      </PrimaryButton>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="text-xs text-amber-200">{sub}</p>
    </div>
  );
}
