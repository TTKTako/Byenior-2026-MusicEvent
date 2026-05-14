/**
 * Module-level SSE subscriber registry.
 * Lives in the Node.js server process — survives across requests.
 */
type Subscriber = (data: string) => void;

const subscribers = new Set<Subscriber>();

export function addSubscriber(fn: Subscriber): void {
  subscribers.add(fn);
}

export function removeSubscriber(fn: Subscriber): void {
  subscribers.delete(fn);
}

export function emitState(state: unknown): void {
  const data = JSON.stringify(state);
  for (const fn of subscribers) {
    try {
      fn(data);
    } catch {
      subscribers.delete(fn);
    }
  }
}
