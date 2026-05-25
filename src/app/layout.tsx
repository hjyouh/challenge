import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

export const metadata: Metadata = {
  title: "디인챌 복주머니 미션",
  description: "인스타그램 해시태그 품앗이 챌린지 PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "디인챌",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0F172A",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
