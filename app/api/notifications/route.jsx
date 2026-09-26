import Ticket from "@/models/tickets";
import TicketMessage from "@/models/ticketMessage";
import "@/models/users";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

const DAY_MS = 24 * 60 * 60 * 1000;

function ticketLabel(ticket) {
  return ticket.ticketNumber || ticket.title;
}

function ticketReference(ticket) {
  if (ticket.ticketNumber) {
    return `شماره «${ticket.ticketNumber}» با عنوان «${ticket.title}»`;
  }
  return `با عنوان «${ticket.title}»`;
}

const legacySystemMessages = {
  "Ticket status changed from open to in-progress":
    "وضعیت تیکت از «باز» به «در حال بررسی» تغییر کرد",
  "Ticket status changed from in-progress to resolved":
    "وضعیت تیکت از «در حال بررسی» به «حل‌شده» تغییر کرد",
  "Ticket status changed from resolved to closed":
    "وضعیت تیکت از «حل‌شده» به «بسته‌شده» تغییر کرد",
  "Agent assigned to ticket": "یک پشتیبان برای تیکت تعیین شد",
  "Ticket assigned to project": "تیکت به خدمت اختصاص داده شد",
};

function translateSystemMessage(message) {
  if (legacySystemMessages[message]) return legacySystemMessages[message];

  const priorityChange = message.match(
    /^Ticket priority changed from (low|medium|high) to (low|medium|high)$/,
  );
  if (!priorityChange) return message;

  const labels = { low: "کم", medium: "متوسط", high: "زیاد" };
  return `اولویت تیکت از «${labels[priorityChange[1]]}» به «${labels[priorityChange[2]]}» تغییر کرد`;
}

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user) return Response.json({ success: false, message: "ابتدا وارد حساب شوید" }, { status: 401 });

    const ticketFilter = user.role === "agent"
      ? { assignedTo: user._id }
      : user.role === "customer"
        ? { creator: user._id }
        : {};
    const tickets = await Ticket.find(ticketFilter)
      .populate("assignedTo", "name")
      .select("title ticketNumber assignedTo creator status deadline deadlineAt updatedAt")
      .lean();
    const ticketIds = tickets.map((ticket) => ticket._id);
    const ticketMap = new Map(tickets.map((ticket) => [String(ticket._id), ticket]));
    const messages = await TicketMessage.find({ ticket: { $in: ticketIds } })
      .populate("sender", "name role")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const messageEvents = messages.flatMap((item) => {
      const ticket = ticketMap.get(String(item.ticket));
      if (!ticket || !item.sender) return [];
      if (item.type === "system") {
        const visibleTo = item.visibleTo?.length
          ? item.visibleTo
          : item.message.startsWith("مهلت رسیدگی تیکت")
            ? ["admin", "agent"]
            : ["admin", "agent", "customer"];
        if (!visibleTo.includes(user.role)) return [];
        return [{
          _id: `system:${item._id}`,
          type: "system",
          message: `${translateSystemMessage(item.message)} — تیکت ${ticketReference(ticket)}`,
          createdAt: item.createdAt,
          ticket: { _id: ticket._id, title: ticket.title, ticketNumber: ticket.ticketNumber },
        }];
      }

      const incomingForAgent = user.role === "agent" && item.sender.role === "customer";
      const incomingForCustomer = user.role === "customer" && ["agent", "admin"].includes(item.sender.role);
      if (!incomingForAgent && !incomingForCustomer) return [];
      const senderRole = item.sender.role === "customer" ? "مشتری" : "پشتیبان";
      return [{
        _id: `message:${item._id}`,
        type: "new-message",
        message: `پیام جدیدی از ${senderRole} ${item.sender.name || ""} برای تیکت ${ticketReference(ticket)} ثبت شده است.`,
        createdAt: item.createdAt,
        ticket: { _id: ticket._id, title: ticket.title, ticketNumber: ticket.ticketNumber },
      }];
    });

    const now = Date.now();
    const deadlineEvents = user.role === "customer" ? [] : tickets.flatMap((ticket) => {
      if (!["open", "in-progress"].includes(ticket.status) || !ticket.assignedTo || !ticket.deadline) return [];
      const deadlineAt = ticket.deadlineAt
        ? new Date(ticket.deadlineAt)
        : new Date(new Date(ticket.updatedAt).getTime() + Number(ticket.deadline) * DAY_MS);
      if (deadlineAt.getTime() > now) return [];
      const message = user.role === "agent"
        ? `مهلت رسیدگی تیکت «${ticketLabel(ticket)}» تمام شده است؛ لطفاً گزارش کار را برای مدیر ارسال کنید.`
        : `مهلت رسیدگی تیکت «${ticketLabel(ticket)}» برای پشتیبان ${ticket.assignedTo?.name || "تعیین‌شده"} تمام شده و هنوز انجام نشده است.`;
      return [{
        _id: `deadline:${ticket._id}:${deadlineAt.toISOString()}`,
        type: "deadline-expired",
        message,
        createdAt: deadlineAt,
        ticket: { _id: ticket._id, title: ticket.title, ticketNumber: ticket.ticketNumber },
      }];
    });

    const notifications = [...messageEvents, ...deadlineEvents]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100);
    return Response.json({ success: true, notifications });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return Response.json({ success: false, message: "دریافت پیام‌ها ناموفق بود" }, { status: 500 });
  }
}
