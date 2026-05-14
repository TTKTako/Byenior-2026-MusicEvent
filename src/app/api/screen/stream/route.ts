import { readStateFromDb } from "@/app/lib/db";
import { addSubscriber, removeSubscriber } from "@/app/lib/sse-emitter";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let subscriber: ((data: string) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send the current persisted state immediately on connect
      const initial = readStateFromDb();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)
      );

      // Register for live updates
      subscriber = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Stream already closed — will be cleaned up on cancel
        }
      };
      addSubscriber(subscriber);
    },
    cancel() {
      if (subscriber) {
        removeSubscriber(subscriber);
        subscriber = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
