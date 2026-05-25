"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    const isLocal = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

    if (isLocal) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
      return;
    }

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return null;
}
