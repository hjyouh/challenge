const CACHE = 'deinchal-v2';

const PRECACHE = [
  '/',
  '/index.html',
  '/pages/login.html',
  '/pages/attendance.html',
  '/pages/ranking.html',
  '/pages/my.html',
  '/manifest.json',
  '/assets/images/angel-intro.png',
  '/assets/images/angel-icon.png',
  '/assets/images/home.png',
  '/assets/images/attendance.png',
  '/assets/images/ranking.png',
  '/assets/images/user-avatar.png',
];

// 설치: 핵심 자산 선(先)캐시
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
});

// 활성화: 이전 캐시 삭제 후 즉시 제어권 획득
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// fetch: 캐시 우선 → 없으면 네트워크 받아서 자동 캐시
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
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
