import Ticket from "@/models/tickets";
import TicketResolution from "@/models/ticketResolution";
import TicketMessage from "@/models/ticketMessage";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function diffMs(from, to) {
  if (!from || !to) return null;

  const start = new Date(from).getTime();
  const end = new Date(to).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return Math.max(0, end - start);
}

function average(values) {
  const valid = values.filter(
    (value) => typeof value === "number" && Number.isFinite(value),
  );

  if (!valid.length) return null;

  return Math.round(
    valid.reduce((sum, value) => sum + value, 0) / valid.length,
  );
}

export async function GET() {
  try {
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

    await ConnectDb();

    const agents = await User.find({
      role: "agent",
    })
      .select("_id name email phone siteLastSeenAt createdAt")
      .sort({ name: 1 })
      .lean();

    const tickets = await Ticket.find({
      assignedTo: {
        $in: agents.map((agent) => agent._id),
      },
    })
      .select(
        [
          "_id",
          "title",
          "ticketNumber",
          "creator",
          "project",
          "assignedTo",
          "assignedAt",
          "agentViewedAt",
          "agentFirstReplyAt",
          "status",
          "priority",
          "deadline",
          "deadlineAt",
          "unseenReminder2hSentAt",
          "unseenAlarm3hSentAt",
          "unseenEscalation4hSentAt",
          "createdAt",
          "updatedAt",
        ].join(" "),
      )
      .populate("creator", "name")
      .populate("project", "name code")
      .sort({ assignedAt: -1, createdAt: -1 })
      .lean();
    const ticketIds = tickets.map((ticket) => ticket._id);

    const agentIds = agents.map((agent) => agent._id);

    const latestAgentMessages = ticketIds.length
      ? await TicketMessage.aggregate([
          {
            $match: {
              ticket: { $in: ticketIds },
              sender: { $in: agentIds },
              type: "text",
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $group: {
              _id: "$ticket",
              createdAt: { $first: "$createdAt" },
            },
          },
        ])
      : [];

    const latestAgentReplyMap = new Map(
      latestAgentMessages.map((message) => [
        message._id.toString(),
        message.createdAt,
      ]),
    );
    const resolutions = ticketIds.length
      ? await TicketResolution.find({
          ticket: {
            $in: ticketIds,
          },
        })
          .select(
            "ticket isResolved rating agentRating processRating feedback createdAt updatedAt",
          )
          .lean()
      : [];

    const resolutionMap = new Map(
      resolutions.map((resolution) => [
        resolution.ticket.toString(),
        resolution,
      ]),
    );

    const ticketsByAgent = new Map();

    for (const ticket of tickets) {
      const agentId = ticket.assignedTo?.toString();

      if (!agentId) continue;

      if (!ticketsByAgent.has(agentId)) {
        ticketsByAgent.set(agentId, []);
      }

      const resolution = resolutionMap.get(ticket._id.toString());
      const lastAgentReplyAt =
        latestAgentReplyMap.get(ticket._id.toString()) || null;

      const legacyRating =
        resolution?.agentRating && resolution?.processRating
          ? Math.round((resolution.agentRating + resolution.processRating) / 2)
          : resolution?.agentRating || resolution?.processRating || null;

      const rating = resolution?.rating || legacyRating || null;

      ticketsByAgent.get(agentId).push({
        id: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber || "",
        title: ticket.title || "",
        customer: ticket.creator
          ? {
              id: ticket.creator._id?.toString(),
              name: ticket.creator.name || "بدون نام",
            }
          : null,
        project: ticket.project
          ? {
              id: ticket.project._id?.toString(),
              name: ticket.project.name || "",
              code: ticket.project.code || "",
            }
          : null,

        status: ticket.status,
        priority: ticket.priority,

        createdAt: ticket.createdAt || null,

        assignedAt: ticket.assignedAt || null,

        agentViewedAt: ticket.agentViewedAt || null,

        agentFirstReplyAt: ticket.agentFirstReplyAt || null,

        lastAgentReplyAt,

        firstViewDurationMs: diffMs(ticket.assignedAt, ticket.agentViewedAt),

        firstReplyDurationMs: diffMs(
          ticket.agentViewedAt,
          ticket.agentFirstReplyAt,
        ),
        deadline: ticket.deadline || null,
        deadlineAt: ticket.deadlineAt || null,

        alerts: {
          reminder2h: Boolean(ticket.unseenReminder2hSentAt),
          alarm3h: Boolean(ticket.unseenAlarm3hSentAt),
          escalation4h: Boolean(ticket.unseenEscalation4hSentAt),
        },

        customerResolution: resolution
          ? {
              isResolved: resolution.isResolved,
              rating,
              feedback: resolution.feedback || "",
              createdAt: resolution.createdAt,
              updatedAt: resolution.updatedAt,
            }
          : null,

        updatedAt: ticket.updatedAt || null,
      });
    }

    const agentRows = agents.map((agent) => {
      const agentTickets = ticketsByAgent.get(agent._id.toString()) || [];

      const totalTickets = agentTickets.length;

      const viewedTickets = agentTickets.filter((ticket) =>
        Boolean(ticket.agentViewedAt),
      ).length;

      const unseenTickets = agentTickets.filter(
        (ticket) => !ticket.agentViewedAt,
      ).length;

      const repliedTickets = agentTickets.filter((ticket) =>
        Boolean(ticket.agentFirstReplyAt),
      ).length;

      const withoutFirstReply = agentTickets.filter(
        (ticket) => ticket.status !== "closed" && !ticket.agentFirstReplyAt,
      ).length;

      const resolvedTickets = agentTickets.filter(
        (ticket) => ticket.status === "resolved" || ticket.status === "closed",
      ).length;

      const openTickets = agentTickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in-progress",
      ).length;

      const customerConfirmed = agentTickets.filter(
        (ticket) => ticket.customerResolution?.isResolved === true,
      ).length;

      const customerRejected = agentTickets.filter(
        (ticket) => ticket.customerResolution?.isResolved === false,
      ).length;

      const awaitingCustomerConfirmation = agentTickets.filter(
        (ticket) => ticket.status === "resolved" && !ticket.customerResolution,
      ).length;

      const escalatedTickets = agentTickets.filter(
        (ticket) => ticket.alerts.escalation4h,
      ).length;

      const ratings = agentTickets
        .map((ticket) => ticket.customerResolution?.rating)
        .filter(
          (rating) => typeof rating === "number" && Number.isFinite(rating),
        );

      const averageRating = ratings.length
        ? Number(
            (
              ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            ).toFixed(2),
          )
        : null;

      return {
        id: agent._id.toString(),
        name: agent.name || "پشتیبان بدون نام",
        email: agent.email || "",
        phone: agent.phone || "",
        siteLastSeenAt: agent.siteLastSeenAt || null,
        createdAt: agent.createdAt || null,

        stats: {
          totalTickets,
          openTickets,
          resolvedTickets,

          viewedTickets,
          unseenTickets,

          repliedTickets,
          withoutFirstReply,

          customerConfirmed,
          customerRejected,
          awaitingCustomerConfirmation,

          escalatedTickets,

          averageFirstViewMs: average(
            agentTickets.map((ticket) => ticket.firstViewDurationMs),
          ),

          averageFirstReplyMs: average(
            agentTickets.map((ticket) => ticket.firstReplyDurationMs),
          ),

          averageRating,
          ratingCount: ratings.length,
        },

        tickets: agentTickets,
      };
    });

    const allAgentTickets = agentRows.flatMap((agent) => agent.tickets);

    const summary = {
      totalAgents: agentRows.length,

      totalTickets: allAgentTickets.length,

      openTickets: allAgentTickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in-progress",
      ).length,

      resolvedTickets: allAgentTickets.filter(
        (ticket) => ticket.status === "resolved" || ticket.status === "closed",
      ).length,

      unseenTickets: allAgentTickets.filter((ticket) => !ticket.agentViewedAt)
        .length,

      withoutFirstReply: allAgentTickets.filter(
        (ticket) => ticket.status !== "closed" && !ticket.agentFirstReplyAt,
      ).length,

      customerConfirmed: allAgentTickets.filter(
        (ticket) => ticket.customerResolution?.isResolved === true,
      ).length,

      customerRejected: allAgentTickets.filter(
        (ticket) => ticket.customerResolution?.isResolved === false,
      ).length,

      escalatedTickets: allAgentTickets.filter(
        (ticket) => ticket.alerts.escalation4h,
      ).length,
    };

    return Response.json(
      {
        success: true,
        serverTime: new Date().toISOString(),
        summary,
        agents: agentRows,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("ADMIN MONITORING ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "server error",
      },
      {
        status: 500,
      },
    );
  }
}
