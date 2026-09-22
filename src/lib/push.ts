"use client";

import { deletePushSubscription, savePushSubscription } from "@/lib/api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** 브라우저가 웹 푸시를 지원하는지. (아이폰은 홈 화면에 추가해야 true 가 돼요) */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

export function pushDenied(): boolean {
  return typeof Notification !== "undefined" && Notification.permission === "denied";
}

/** VAPID 공개키(base64url)를 subscribe 가 받는 바이트 배열로 바꿔요. */
function toApplicationServerKey(base64url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** 알림 권한을 받고 구독을 서버에 저장해요. 거절하면 "denied" 로 throw 해요. */
export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("denied");

  const reg = await registration();
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const { endpoint, keys } = sub.toJSON();
  if (!endpoint || !keys?.p256dh || !keys?.auth) throw new Error("bad subscription");
  await savePushSubscription(endpoint, keys.p256dh, keys.auth);
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  const { endpoint } = sub.toJSON();
  await sub.unsubscribe();
  if (endpoint) await deletePushSubscription(endpoint);
}
