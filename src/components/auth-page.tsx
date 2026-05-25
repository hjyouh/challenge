"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { Card, Input, PrimaryButton } from "@/components/ui";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    enterDemo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    enterDemo();
  }

  function enterDemo() {
    localStorage.setItem(
      "deinchal-demo-profile",
      JSON.stringify({
        id: "demo-user",
        email: email || "demo@example.com",
        nickname: nickname || "로컬회원",
        instagram_id: (instagramId || "deinchal_demo").replace(/^@/, ""),
        role: "member",
        status: "active",
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    );
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-400 text-slate-950">
            <Gift size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black">디인챌 복주머니 미션</h1>
            <p className="text-sm text-slate-400">{mode === "signup" ? "새 챌린지 회원 등록" : "오늘의 미션을 확인해요"}</p>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={submit}>
          <Input type="email" placeholder="이메일" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <Input type="password" placeholder="비밀번호" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          {mode === "signup" && (
            <>
              <Input placeholder="닉네임" value={nickname} onChange={(event) => setNickname(event.target.value)} required />
              <Input placeholder="인스타그램 ID" value={instagramId} onChange={(event) => setInstagramId(event.target.value)} required />
            </>
          )}
          {message && <p className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{message}</p>}
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? "처리 중..." : mode === "signup" ? "회원가입" : "로컬 데모 로그인"}
          </PrimaryButton>
        </form>

        <div className="mt-5 text-center text-sm text-slate-400">
          {mode === "signup" ? (
            <Link className="font-bold text-amber-300" href="/login">
              이미 계정이 있어요
            </Link>
          ) : (
            <Link className="font-bold text-amber-300" href="/signup">
              처음이라면 회원가입
            </Link>
          )}
        </div>
      </Card>
    </main>
  );
}
