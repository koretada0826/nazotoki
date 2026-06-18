// 自己消滅スイッチ：古いキャッシュとService Workerを完全に除去する。
// （以前のキャッシュ優先SWが古いUIを配り続けていた問題への根治）
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
// fetchは一切横取りしない（常にネットワークから最新を取る）
