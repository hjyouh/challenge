const CACHE = 'deinchal-v9';

// 이미지만 선캐시
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

  // Supabase API 요청은 캐시하지 않음 (Response body already used 에러 방지)
  if (url.hostname.includes('supabase.co')) return;

  // 이미지만 캐시 우선 (자주 바뀌지 않음)
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)(\?|$)/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.ok) {
            try { const c2 = res.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)); } catch(_) {}
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML / JS / CSS: 네트워크 우선 → 오프라인 시 캐시 폴백
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) {
        try { const c2 = res.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)); } catch(_) {}
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
