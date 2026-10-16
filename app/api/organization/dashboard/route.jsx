import Organization from "@/models/organizations";
import Ticket from "@/models/tickets";
import TicketResolution from "@/models/ticketResolution";
import "@/models/projects";
import "@/models/users";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";

const activeStatuses = ["open", "in-progress"];

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || user.role !== "organization_manager") {
      return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const organization = await Organization.findOne({
      isActive: true,
      $or: [{ manager: user._id }, { _id: user.organization }],
    })
      .populate("manager", "name")
      .populate("members", "name lastLoginAt createdAt")
      .lean();
    if (!organization) {
      return Response.json({ success: false, message: "سازمان فعالی برای این حساب تعریف نشده است" }, { status: 404 });
    }

    const memberIds = organization.members.map((member) => member._id);
    const tickets = await Ticket.find({ creator: { $in: memberIds } })
      .populate("creator", "name")
      .populate("assignedTo", "name")
      .populate("project", "name")
      .sort({ createdAt: -1 })
      .lean();
    const resolutions = tickets.length
      ? await TicketResolution.find({ ticket: { $in: tickets.map((ticket) => ticket._id) } }).select("ticket isResolved rating feedback createdAt").lean()
      : [];
    const resolutionMap = new Map(resolutions.map((resolution) => [resolution.ticket.toString(), resolution]));
    const now = new Date();
    const overdue = tickets.filter((ticket) => activeStatuses.includes(ticket.status) && ticket.deadlineAt && new Date(ticket.deadlineAt) < now).length;
    const ratings = resolutions.map((resolution) => resolution.rating).filter(Number.isFinite);
    const satisfaction = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;

    const monthly = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      const monthTickets = tickets.filter((ticket) => new Date(ticket.createdAt) >= start && new Date(ticket.createdAt) < end);
      monthly.push({
        label: new Intl.DateTimeFormat("fa-IR", { month: "short" }).format(start),
        created: monthTickets.length,
        resolved: monthTickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length,
      });
    }

    const employeeStats = organization.members.map((member) => {
      const employeeTickets = tickets.filter((ticket) => ticket.creator?._id?.toString() === member._id.toString());
      const employeeRatings = employeeTickets.map((ticket) => resolutionMap.get(ticket._id.toString())?.rating).filter(Number.isFinite);
      return {
        id: member._id.toString(),
        name: member.name || "کارمند بدون نام",
        lastLoginAt: member.lastLoginAt,
        total: employeeTickets.length,
        active: employeeTickets.filter((ticket) => activeStatuses.includes(ticket.status)).length,
        resolved: employeeTickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).length,
        highPriority: employeeTickets.filter((ticket) => ticket.priority === "high").length,
        satisfaction: employeeRatings.length ? employeeRatings.reduce((sum, rating) => sum + rating, 0) / employeeRatings.length : null,
        latestTicketAt: employeeTickets[0]?.createdAt || null,
        recentTickets: employeeTickets.slice(0, 6).map((ticket) => ({
          id: ticket._id.toString(),
          title: ticket.title,
          ticketNumber: ticket.ticketNumber,
          service: ticket.project?.name || "سایر",
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.createdAt,
        })),
      };
    }).sort((a, b) => b.total - a.total);

    const issueMap = new Map();
    tickets.forEach((ticket) => {
      const key = ticket.project?.name || ticket.title;
      issueMap.set(key, (issueMap.get(key) || 0) + 1);
    });
    const recurringIssues = [...issueMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count }));
    const status = {
      open: tickets.filter((ticket) => ticket.status === "open").length,
      inProgress: tickets.filter((ticket) => ticket.status === "in-progress").length,
      resolved: tickets.filter((ticket) => ticket.status === "resolved").length,
      closed: tickets.filter((ticket) => ticket.status === "closed").length,
    };

    return Response.json({
      success: true,
      organization: {
        id: organization._id.toString(), name: organization.name, code: organization.code,
        manager: organization.manager, contract: organization.supportContract,
        equipment: organization.equipment, memberCount: organization.members.length,
      },
      summary: { totalTickets: tickets.length, activeTickets: status.open + status.inProgress, resolvedTickets: status.resolved + status.closed, overdue, satisfaction, ratingCount: ratings.length },
      status,
      monthly,
      employeeStats,
      recurringIssues,
      recentTickets: tickets.slice(0, 8).map((ticket) => ({
        id: ticket._id.toString(), ticketNumber: ticket.ticketNumber, title: ticket.title,
        employee: ticket.creator?.name || "نامشخص", agent: ticket.assignedTo?.name || "تخصیص‌نیافته",
        service: ticket.project?.name || "سایر", status: ticket.status, priority: ticket.priority,
        createdAt: ticket.createdAt, updatedAt: ticket.updatedAt,
      })),
      serviceHistory: tickets.filter((ticket) => ["resolved", "closed"].includes(ticket.status)).slice(0, 8).map((ticket) => ({
        id: ticket._id.toString(), title: ticket.title, employee: ticket.creator?.name || "نامشخص",
        service: ticket.project?.name || "سایر", agent: ticket.assignedTo?.name || "نامشخص",
        resolvedAt: ticket.updatedAt, rating: resolutionMap.get(ticket._id.toString())?.rating || null,
      })),
    });
  } catch (error) {
    console.error("ORGANIZATION DASHBOARD ERROR", error);
    return Response.json({ success: false, message: "دریافت داشبورد سازمان ناموفق بود" }, { status: 500 });
  }
}
