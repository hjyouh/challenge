import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-white/10 bg-slate-800/80 p-5 shadow-xl shadow-black/20 ${className}`}>{children}</section>;
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "danger" | "gold" }) {
  const tones = {
    default: "bg-slate-700 text-slate-200",
    success: "bg-emerald-500/15 text-emerald-300",
    danger: "bg-red-500/15 text-red-300",
    gold: "bg-amber-400/15 text-amber-200",
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-12 rounded-2xl bg-amber-400 px-5 py-3 font-extrabold text-slate-950 transition enabled:hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-12 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-amber-300 ${props.className ?? ""}`}
    />
  );
}
