import TicketResolution from "@/models/ticketResolution";
import "@/models/tickets";
import "@/models/projects";
import "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "ابتدا وارد حساب کاربری شوید" },
        { status: 401 },
      );
    }

    if (!authorization(user, ["admin"])) {
      return Response.json(
        { success: false, message: "دسترسی به این بخش مجاز نیست" },
        { status: 403 },
      );
    }

    await ConnectDb();

    const resolutions = await TicketResolution.find({ isResolved: false })
      .populate({
        path: "ticket",
        select:
          "ticketNumber title status priority project assignedTo creator deadline createdAt updatedAt",
        populate: [
          { path: "project", select: "name code" },
          { path: "assignedTo", select: "name" },
          { path: "creator", select: "name phone" },
        ],
      })
      .populate("customer", "name phone")
      .sort({ updatedAt: -1 })
      .lean();

    const unresolvedTickets = resolutions.filter((item) => item.ticket);

    return Response.json({ success: true, unresolvedTickets });
  } catch (error) {
    console.error("GET UNRESOLVED TICKETS ERROR:", error);
    return Response.json(
      { success: false, message: "دریافت موارد حل‌نشده ناموفق بود" },
      { status: 500 },
    );
  }
}
