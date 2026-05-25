"use client";

import { motion } from "framer-motion";
import { ImageFallback } from "@/components/image-fallback";

export function CompletionAnimation() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5 text-center">
      <motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 180 }}>
        <ImageFallback src="/images/angel.png" alt="천사 캐릭터" emoji="👼" className="mx-auto size-28 object-contain" />
      </motion.div>
      <motion.div
        className="absolute left-10 top-20 h-1 w-28 rounded-full bg-amber-200"
        initial={{ x: -90, opacity: 0 }}
        animate={{ x: 210, opacity: [0, 1, 0] }}
        transition={{ duration: 0.9, delay: 0.25 }}
      />
      <motion.div
        className="mx-auto mt-2 grid size-24 place-items-center rounded-full border border-amber-300/40 bg-slate-950"
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
      >
        <motion.div animate={{ rotate: [-6, 6, -6], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <ImageFallback src="/images/bok-small.png" alt="복주머니" emoji="🧧" className="size-16 object-contain" />
        </motion.div>
      </motion.div>
      <h2 className="mt-4 text-2xl font-black text-amber-100">참 잘했어요!</h2>
      <p className="mt-2 text-sm font-bold text-slate-200">오늘의 복주머니가 쌓였어요.</p>
      <p className="text-sm text-amber-200">복 많이 받으세요.</p>
    </div>
  );
}
