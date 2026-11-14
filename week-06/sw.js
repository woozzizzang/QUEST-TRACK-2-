// 서비스 워커: 앱 화면 파일을 폰에 저장해 두어서 인터넷이 끊겨도 앱이 열리게 함.
// 날씨 정보는 여기서 저장하지 않고, index.html 이 마지막으로 받은 것을 따로 저장함.
// 앱 파일을 바꾸면 아래 번호를 올려야 폰이 새 파일을 받음.
const CACHE = 'weather-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 날씨 서버(다른 주소)로 가는 요청은 건드리지 않음
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // 먼저 인터넷에서 새 파일을 받고, 안 되면 저장해 둔 파일을 씀
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
        .then(hit => hit || new Response('저장된 파일이 없어요', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
  );
});
