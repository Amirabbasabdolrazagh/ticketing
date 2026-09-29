import { isValidObjectId } from "mongoose";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

export async function POST(_req, { params }) {
  try {
    const { ticketId } = await params;
    const user = await getCurrentUser();
    if (!user) return Response.json({ success: false }, { status: 401 });
    if (user.role !== "agent" || !isValidObjectId(ticketId)) {
      return Response.json({ success: false }, { status: 403 });
    }

    await ConnectDb();
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, assignedTo: user._id, agentViewedAt: null },
      { $set: { agentViewedAt: new Date() } },
      { new: true },
    );
    return Response.json({ success: true, viewedAt: ticket?.agentViewedAt || null });
  } catch (error) {
    console.error("MARK TICKET SEEN ERROR:", error);
    return Response.json({ success: false }, { status: 500 });
  }
}
