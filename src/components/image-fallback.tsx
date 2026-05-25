"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  emoji: string;
  className?: string;
};

export function ImageFallback({ src, alt, emoji, className }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex items-center justify-center rounded-2xl border border-amber-300/20 bg-slate-900/80 ${className ?? ""}`}>
        <span className="text-5xl">{emoji}</span>
      </div>
    );
  }

  return <Image src={src} alt={alt} width={240} height={240} className={className} onError={() => setFailed(true)} />;
}
