"use client";

export type BrowserPushErrorCode =
  | "unsupported"
  | "permission_denied"
  | "service_worker_failed"
  | "subscription_failed"
  | "server_registration_failed";

export type BrowserPushResult =
  | { ok: true; subscription: PushSubscription; permission: "granted" }
  | { ok: false; code: BrowserPushErrorCode };

export function browserPushSupport() {
  if (typeof window === "undefined"
    || !("serviceWorker" in navigator)
    || !("PushManager" in window)
    || !("Notification" in window)) {
    return { supported: false as const, permission: "unsupported" as const };
  }
  return { supported: true as const, permission: Notification.permission };
}

export function vapidPublicKeyToBytes(value: string) {
  const normalized = value.trim().replaceAll("-", "+").replaceAll("_", "/");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new Error("invalid_vapid_key");
  }
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = atob(padded);
  const bytes = Uint8Array.from(raw, (character) => character.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error("invalid_vapid_key");
  return bytes;
}

export async function enableBrowserPush(publicKey: string): Promise<BrowserPushResult> {
  const support = browserPushSupport();
  if (!support.supported) return { ok: false, code: "unsupported" };
  if (support.permission === "denied") return { ok: false, code: "permission_denied" };

  let permission: NotificationPermission = support.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, code: "permission_denied" };

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch {
    return { ok: false, code: "service_worker_failed" };
  }

  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing && (!existing.expirationTime || existing.expirationTime > Date.now())) {
      return { ok: true, subscription: existing, permission: "granted" };
    }
    if (existing) await existing.unsubscribe().catch(() => false);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKeyToBytes(publicKey),
    });
    return { ok: true, subscription, permission: "granted" };
  } catch {
    return { ok: false, code: "subscription_failed" };
  }
}

export async function unsubscribeBrowserPush() {
  if (!browserPushSupport().supported) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    return subscription ? await subscription.unsubscribe() : true;
  } catch {
    return false;
  }
}
