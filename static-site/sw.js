const CACHE = 'deinchal-v3';

// 이미지만 선캐시 (HTML은 항상 네트워크에서 받아옴)
const PRECACHE = [
  '/assets/images/angel-intro.png',
  '/assets/images/angel-icon.png',
  '/assets/images/home.png',
  '/assets/images/attendance.png',
  '/assets/images/ranking.png',
  '/assets/images/user-avatar.png',
  '/manifest.json',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // ── HTML: 네트워크 우선 → 앱 업데이트 즉시 반영 ──────────────────
  // 오프라인이면 캐시 폴백
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // ── CSS / JS / 이미지: 캐시 우선 → ?v=X 버전 쿼리로 최신 보장 ────
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
