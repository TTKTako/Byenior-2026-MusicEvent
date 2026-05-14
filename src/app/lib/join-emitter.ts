export type JoinEventType = "emoji" | "text" | "image";

export interface JoinEvent {
  type: JoinEventType;
  id: string;
  payload: string; // emoji char, text string, or image URL
  direction?: "ltr" | "rtl"; // text only
}

type Subscriber = (event: JoinEvent) => void;
const subscribers = new Set<Subscriber>();

export function addJoinSubscriber(fn: Subscriber): void {
  subscribers.add(fn);
}

export function removeJoinSubscriber(fn: Subscriber): void {
  subscribers.delete(fn);
}

export function emitJoinEvent(event: JoinEvent): void {
  subscribers.forEach((fn) => fn(event));
}

// ─── Text rate-limiting ─────────────────────────────────────────────
const TEXT_DURATION_MS = 12_000;
const MAX_CONCURRENT_TEXTS = 5;
const activeTextTimes: number[] = [];

export function canSendText(): boolean {
  const now = Date.now();
  const active = activeTextTimes.filter((t) => now - t < TEXT_DURATION_MS);
  activeTextTimes.length = 0;
  activeTextTimes.push(...active);
  return active.length < MAX_CONCURRENT_TEXTS;
}

export function registerText(): void {
  activeTextTimes.push(Date.now());
}

// ─── Image rate-limiting ────────────────────────────────────────────
const IMAGE_DURATION_MS = 8_000;
const MAX_CONCURRENT_IMAGES = 3;
const activeImageTimes: number[] = [];

export function canSendImage(): boolean {
  const now = Date.now();
  const active = activeImageTimes.filter((t) => now - t < IMAGE_DURATION_MS);
  activeImageTimes.length = 0;
  activeImageTimes.push(...active);
  return active.length < MAX_CONCURRENT_IMAGES;
}

export function registerImage(): void {
  activeImageTimes.push(Date.now());
}
