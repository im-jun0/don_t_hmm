/* 게임 시작 알림을 받는 서비스 워커. /api/cron/tick 이 보낸 푸시를 띄워요. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Don't Hmm", {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: payload.url || "/game" },
      tag: "dont-hmm-game", // 같은 판 알림이 여러 개 쌓이지 않게
      renotify: true,
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/game";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
