const DEFAULT_TITLE = "AudienceOwn";
const DEFAULT_BODY = "A creator you follow shared a recovery update.";
const DEFAULT_URL = "/";

function safePath(value) {
  try {
    const url = new URL(typeof value === "string" ? value : DEFAULT_URL, self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_URL;
  } catch {
    return DEFAULT_URL;
  }
}

function notificationPayload(event) {
  let value = {};
  try {
    value = event.data ? event.data.json() : {};
  } catch {
    value = {};
  }
  const updateId = typeof value.updateId === "string" ? value.updateId.slice(0, 100) : "recovery";
  return {
    title: typeof value.title === "string" && value.title.trim() ? value.title.slice(0, 100) : DEFAULT_TITLE,
    body: typeof value.body === "string" && value.body.trim() ? value.body.slice(0, 240) : DEFAULT_BODY,
    icon: typeof value.icon === "string" && value.icon.startsWith("/") ? value.icon : "/brand/audienceown-icon-192.png",
    badge: typeof value.badge === "string" && value.badge.startsWith("/") ? value.badge : "/brand/audienceown-icon-192.png",
    tag: typeof value.tag === "string" && value.tag.trim() ? value.tag.slice(0, 120) : `audienceown:${updateId}`,
    url: safePath(value.url),
    updateId,
  };
}

self.addEventListener("push", (event) => {
  const payload = notificationPayload(event);
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    data: { url: payload.url, updateId: payload.updateId },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = safePath(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(path);
        return client.focus();
      }
    }
    return self.clients.openWindow(path);
  })());
});
