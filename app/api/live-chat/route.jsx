import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";
import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import {
  getPresenceForRole,
  liveSupportChat,
  touchPresence,
} from "@/lib/liveSupportChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const encoder = new TextEncoder();

async function getChatUser() {
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin", "agent"])) return null;
  return user;
}

export async function GET(req) {
  const user = await getChatUser();
  if (!user) {
    return Response.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  touchPresence(user);

  let closeConnection;
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (event, data) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const onMessage = (message) => {
        const isRecipient =
          message.recipientId === user._id.toString() ||
          message.senderId === user._id.toString();
        if (isRecipient) send("message", message);
      };

      const onPresence = (presence) => {
        if (presence.role !== user.role) send("presence", presence);
      };

      const heartbeat = setInterval(() => send("ping", { time: Date.now() }), 25000);
      liveSupportChat.on("message", onMessage);
      liveSupportChat.on("presence", onPresence);
      const otherRole = user.role === "admin" ? "agent" : "admin";
      send("connected", {
        success: true,
        presence: getPresenceForRole(otherRole),
        serverTime: Date.now(),
      });

      closeConnection = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        liveSupportChat.off("message", onMessage);
        liveSupportChat.off("presence", onPresence);
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

export async function POST(req) {
  try {
    const user = await getChatUser();
    if (!user) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    touchPresence(user);

    const { text, recipientId } = await req.json();
    const cleanText = typeof text === "string" ? text.trim() : "";
    if (!cleanText || cleanText.length > 1000) {
      return Response.json(
        { success: false, message: "متن پیام باید بین ۱ تا ۱۰۰۰ کاراکتر باشد" },
        { status: 400 },
      );
    }

    if (!isValidObjectId(recipientId)) {
      return Response.json(
        { success: false, message: "مخاطب معتبر نیست" },
        { status: 400 },
      );
    }

    const recipient = await User.findById(recipientId).select("name role");
    const expectedRole = user.role === "admin" ? "agent" : "admin";
    if (!recipient || recipient.role !== expectedRole) {
      return Response.json(
        { success: false, message: "مخاطب مجاز نیست" },
        { status: 400 },
      );
    }

    const message = {
      id: randomUUID(),
      text: cleanText,
      senderId: user._id.toString(),
      senderName: user.name || (user.role === "admin" ? "ادمین" : "پشتیبان"),
      senderRole: user.role,
      recipientId: recipient._id.toString(),
      recipientName: recipient.name || expectedRole,
      sentAt: new Date().toISOString(),
    };

    liveSupportChat.emit("message", message);
    return Response.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.log("LIVE CHAT ERROR:", error);
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
