import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { monitoringEvents } from "@/lib/monitoringEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

export async function GET(req) {
  const user = await getCurrentUser();

  if (!user || !authorization(user, ["admin"])) {
    return Response.json(
      {
        success: false,
        message: "Forbidden",
      },
      {
        status: 403,
      },
    );
  }

  let closeConnection;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (eventName, data) => {
        if (closed) return;

        controller.enqueue(
          encoder.encode(
            `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      const onUpdate = (event) => {
        send("monitoring-update", event);
      };

      const heartbeat = setInterval(() => {
        send("ping", {
          serverTime: new Date().toISOString(),
        });
      }, 25000);

      monitoringEvents.on("update", onUpdate);

      send("connected", {
        success: true,
        serverTime: new Date().toISOString(),
      });

      closeConnection = () => {
        if (closed) return;

        closed = true;

        clearInterval(heartbeat);
        monitoringEvents.off("update", onUpdate);

        try {
          controller.close();
        } catch {}
      };

      req.signal.addEventListener("abort", closeConnection);
    },

    cancel() {
      closeConnection?.();
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
