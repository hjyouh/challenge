"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, CalendarCheck, LayoutDashboard, Users } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import { buildMissionInput, formatKoreanDate, getMonthMissionDates, getRecentMonths, parseDateKey, toDateKey } from "@/lib/mission";
import { getGrade, getRate } from "@/lib/rewards";
import type { Mission, MissionCheck, Profile } from "@/lib/types";

type AdminTab = "dashboard" | "members" | "missions" | "monthly";

export function AdminApp() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [checks, setChecks] = useState<MissionCheck[]>([]);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(getRecentMonths(1)[0].value);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  async function load() {
    setLoading(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const dates = getMonthMissionDates(year, month - 1);
      const demoMembers: Profile[] = [
        demoProfile("demo-admin", "admin@example.com", "관리자", "deinchal_admin", "admin"),
        demoProfile("demo-user", "demo@example.com", "로컬회원", "deinchal_demo", "member"),
        demoProfile("demo-friend-1", "friend1@example.com", "복주머니왕", "bok_king", "member"),
        demoProfile("demo-friend-2", "friend2@example.com", "천사챌린저", "angel_challenge", "member"),
      ];
      const demoMissions = dates.map((date) => ({ ...buildMissionInput(parseDateKey(date)), id: date, created_at: "", updated_at: "" }));
      const storedChecks = JSON.parse(localStorage.getItem("deinchal-demo-checks") ?? "[]") as MissionCheck[];
      setProfile(demoMembers[0]);
      setMembers(demoMembers);
      setMissions(demoMissions);
      setChecks(storedChecks);
      setLoading(false);
      return;
  }

  const activeMembers = members.filter((member) => member.status === "active");
  const monthDates = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return getMonthMissionDates(year, month - 1);
  }, [selectedMonth]);

  const memberRows = useMemo(() => {
    return members.map((member) => {
      const joined = toDateKey(new Date(member.joined_at));
      const eligibleMonthDates = monthDates.filter((date) => date >= joined);
      const monthCompleted = checks.filter((check) => check.user_id === member.id && eligibleMonthDates.includes(check.mission_date)).length;
      const monthRate = getRate(monthCompleted, eligibleMonthDates.length);
      return {
        member,
        monthCompleted,
        monthRate,
        grade: getGrade(monthRate),
      };
    });
  }, [checks, members, monthDates]);

  const todayKey = toDateKey(new Date());
  const todayCompleted = checks.filter((check) => check.mission_date === todayKey).length;
  const totalSlots = activeMembers.length * monthDates.length;
  const monthCompletedAll = checks.length;
  const monthRateAll = getRate(monthCompletedAll, totalSlots);
  const top10 = [...memberRows].sort((a, b) => b.monthRate - a.monthRate || b.monthCompleted - a.monthCompleted).slice(0, 10);

  if (loading || !profile) {
    return <main className="grid min-h-screen place-items-center px-4 text-slate-300">관리자 데이터를 불러오는 중...</main>;
  }

  return (
    <main className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold text-amber-200">관리자 대시보드</p>
            <h1 className="text-3xl font-black">디인챌 복주머니 미션</h1>
          </div>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="min-h-12 rounded-2xl border border-white/10 bg-slate-900 px-4 font-bold">
            {getRecentMonths(12).map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2">
          {[
            ["dashboard", LayoutDashboard, "대시보드"],
            ["members", Users, "회원 목록"],
            ["missions", CalendarCheck, "미션 현황"],
            ["monthly", BarChart3, "월별 통계"],
          ].map(([key, Icon, label]) => (
            <button key={key as string} onClick={() => setTab(key as AdminTab)} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold ${tab === key ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
              <Icon size={18} /> {label as string}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Metric label="전체 회원 수" value={members.length} />
              <Metric label="active 회원 수" value={activeMembers.length} />
              <Metric label="이번 달 미션 수" value={monthDates.length} />
              <Metric label="이번 달 참여율" value={`${monthRateAll}%`} />
              <Metric label="오늘 완료자" value={todayCompleted} />
              <Metric label="오늘 미완료자" value={Math.max(activeMembers.length - todayCompleted, 0)} />
            </div>
            <Card>
              <h2 className="mb-4 text-xl font-black">상위 참여자 TOP 10</h2>
              <DataTable
                headers={["순위", "닉네임", "인스타그램", "완료", "참여율", "등급"]}
                rows={top10.map((row, index) => [index + 1, row.member.nickname, `@${row.member.instagram_id}`, row.monthCompleted, `${row.monthRate}%`, `${row.grade.icon} ${row.grade.label}`])}
              />
            </Card>
          </div>
        )}

        {tab === "members" && (
          <Card>
            <h2 className="mb-4 text-xl font-black">회원 목록</h2>
            <DataTable
              headers={["닉네임", "인스타그램", "이메일", "상태", "가입일", "이번 달 완료", "이번 달 참여율"]}
              rows={memberRows.map((row) => [row.member.nickname, `@${row.member.instagram_id}`, row.member.email, row.member.status, row.member.joined_at.slice(0, 10), row.monthCompleted, `${row.monthRate}%`])}
            />
          </Card>
        )}

        {tab === "missions" && (
          <div className="grid gap-4">
            {missions.map((mission) => {
              const completedIds = checks.filter((check) => check.mission_id === mission.id || check.mission_date === mission.mission_date).map((check) => check.user_id);
              const completedMembers = activeMembers.filter((member) => completedIds.includes(member.id));
              const missedMembers = activeMembers.filter((member) => !completedIds.includes(member.id));
              return (
                <Card key={mission.id}>
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h3 className="text-xl font-black">{formatKoreanDate(mission.mission_date)}</h3>
                      <p className="text-amber-200">{mission.hashtag}</p>
                    </div>
                    <div className="flex gap-2">
                      <Pill tone="success">완료 {completedMembers.length}</Pill>
                      <Pill tone="danger">미완료 {missedMembers.length}</Pill>
                      <Pill tone="gold">{getRate(completedMembers.length, activeMembers.length)}%</Pill>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <NameList title="완료자" members={completedMembers} />
                    <NameList title="미완료자" members={missedMembers} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "monthly" && (
          <div className="grid gap-5">
            <Card>
              <h2 className="mb-4 text-xl font-black">회원별 월별 통계</h2>
              <DataTable
                headers={["닉네임", "완료 수", "참여율", "등급"]}
                rows={memberRows.map((row) => [row.member.nickname, row.monthCompleted, `${row.monthRate}%`, `${row.grade.icon} ${row.grade.label}`])}
              />
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="mb-3 font-black">천사 배지 달성자</h3>
                <NameList title="" members={memberRows.filter((row) => row.monthCompleted === monthDates.length && monthDates.length > 0).map((row) => row.member)} />
              </Card>
              <Card>
                <h3 className="mb-3 font-black">황금 복주머니 달성자</h3>
                <NameList title="" members={memberRows.filter((row) => row.monthCompleted >= 8).map((row) => row.member)} />
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function demoProfile(id: string, email: string, nickname: string, instagramId: string, role: "member" | "admin"): Profile {
  const now = new Date().toISOString();
  return {
    id,
    email,
    nickname,
    instagram_id: instagramId,
    role,
    status: "active",
    joined_at: now,
    created_at: now,
    updated_at: now,
  };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-amber-200">{value}</p>
    </Card>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-slate-400">
          <tr>{headers.map((header) => <th key={header} className="border-b border-white/10 px-3 py-3">{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-white/5">
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-3 text-slate-100">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NameList({ title, members }: { title: string; members: Pick<Profile, "id" | "nickname" | "instagram_id">[] }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-4">
      {title && <p className="mb-2 text-sm font-black text-slate-300">{title}</p>}
      <div className="flex flex-wrap gap-2">
        {members.length === 0 && <span className="text-sm text-slate-500">없음</span>}
        {members.map((member) => <Pill key={member.id}>{member.nickname} @{member.instagram_id}</Pill>)}
      </div>
    </div>
  );
}
