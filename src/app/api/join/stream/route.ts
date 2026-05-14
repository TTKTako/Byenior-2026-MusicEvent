import { NextRequest } from "next/server";
import {
  addJoinSubscriber,
  removeJoinSubscriber,
  type JoinEvent,
} from "@/app/lib/join-emitter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: JoinEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // controller already closed
        }
      };

      addJoinSubscriber(send);

      req.signal.addEventListener("abort", () => {
        removeJoinSubscriber(send);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
