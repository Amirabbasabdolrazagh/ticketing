import Organization from "@/models/organizations";
import Ticket from "@/models/tickets";
import "@/models/projects";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || user.role !== "organization_manager") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const organization = await Organization.findOne({ isActive: true, $or: [{ manager: user._id }, { _id: user.organization }] }).lean();
    const contract = organization?.supportContract;
    const now = new Date();
    const allowed = contract?.status === "active" && contract?.features?.secureCall && (!contract.startAt || new Date(contract.startAt) <= now) && (!contract.endAt || new Date(contract.endAt) >= now);
    if (!allowed) return Response.json({ success: false, message: "تماس امن در قرارداد فعال سازمان شما وجود ندارد" }, { status: 403 });
    const tickets = await Ticket.find({ creator: { $in: organization.members }, status: { $ne: "closed" } })
      .populate("creator", "name")
      .populate("assignedTo", "name")
      .populate("project", "name")
      .sort({ updatedAt: -1 })
      .limit(30)
      .lean();
    return Response.json({ success: true, tickets });
  } catch (error) {
    console.error("ORGANIZATION TICKETS ERROR", error);
    return Response.json({ success: false, message: "دریافت تیکت‌های سازمان ناموفق بود" }, { status: 500 });
  }
}
