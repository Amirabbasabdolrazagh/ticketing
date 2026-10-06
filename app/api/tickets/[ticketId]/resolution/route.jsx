import TicketResolution from "@/models/ticketResolution";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";
import { emitMonitoringEvent } from "@/lib/monitoringEvents";

export async function POST(req, { params }) {
  try {
    const { ticketId } = await params;
    const { isResolved, rating, feedback } = await req.json();
    const user = await getCurrentUser();
    const validId = isValidObjectId(ticketId);
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }

    const isAllowedRole = authorization(user, ["customer"]);
    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "forbidden role" },
        { status: 403 },
      );
    }
    if (ticketId == undefined || ticketId === null || !validId) {
      return Response.json(
        { success: false, message: "invalid ticketId" },
        { status: 400 },
      );
    }
    await ConnectDb();

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return Response.json(
        { success: false, message: "ticket not found" },
        { status: 404 },
      );
    }
    if (ticket.creator.toString() !== user._id.toString()) {
      return Response.json(
        { success: false, message: "this user forbidden to answer" },
        { status: 403 },
      );
    }
    if (ticket.status !== "resolved") {
      return Response.json(
        {
          success: false,
          message: "The issue has not yet been resolved by the support team.",
        },
        { status: 400 },
      );
    }

    if (typeof isResolved !== "boolean") {
      return Response.json(
        {
          success: false,
          message: "invalid input",
        },
        { status: 400 },
      );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json(
        { success: false, message: "امتیاز باید بین ۱ تا ۵ باشد" },
        { status: 400 },
      );
    }
    const normalizedFeedback =
      typeof feedback === "string" ? feedback.trim() : "";
    if (rating <= 3 && !normalizedFeedback) {
      return Response.json(
        { success: false, message: "لطفاً علت امتیاز پایین را بنویسید" },
        { status: 400 },
      );
    }
    if (normalizedFeedback.length > 1000) {
      return Response.json(
        {
          success: false,
          message: "متن نظرسنجی نباید بیشتر از ۱۰۰۰ نویسه باشد",
        },
        { status: 400 },
      );
    }
    const existingResolution = await TicketResolution.findOne({
      ticket: ticketId,
    });

    let ticketResolution;

    if (existingResolution) {
      existingResolution.isResolved = isResolved;
      existingResolution.rating = rating;
      existingResolution.feedback = rating <= 3 ? normalizedFeedback : "";
      ticketResolution = await existingResolution.save();
    } else {
      ticketResolution = await TicketResolution.create({
        ticket: ticketId,
        customer: user._id,
        isResolved,
        rating,
        feedback: rating <= 3 ? normalizedFeedback : "",
      });
    }

    emitMonitoringEvent("ticket:customer-resolution", {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber || "",
      title: ticket.title || "",

      agentId: ticket.assignedTo?.toString() || null,

      status: ticket.status,
      priority: ticket.priority,

      isResolved: ticketResolution.isResolved,
      rating: ticketResolution.rating,
      feedback: ticketResolution.feedback || "",

      assignedAt: ticket.assignedAt ? ticket.assignedAt.toISOString() : null,

      agentViewedAt: ticket.agentViewedAt
        ? ticket.agentViewedAt.toISOString()
        : null,

      agentFirstReplyAt: ticket.agentFirstReplyAt
        ? ticket.agentFirstReplyAt.toISOString()
        : null,

      resolutionCreatedAt: ticketResolution.createdAt
        ? ticketResolution.createdAt.toISOString()
        : null,

      resolutionUpdatedAt: ticketResolution.updatedAt
        ? ticketResolution.updatedAt.toISOString()
        : null,
    });

    return Response.json(
      {
        success: true,
        message: "customer confirming created",
        ticketResolution: {
          isResolved: ticketResolution.isResolved,
          rating: ticketResolution.rating,
          createdAt: ticketResolution.createdAt,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // if (error.code === 11000) {
    //   return Response.json(
    //     {
    //       success: false,
    //       message: "You have already answered.",
    //     },
    //     { status: 409 },
    //   );
    // }
    return Response.json(
      {
        success: false,
        message: "server error",
      },
      { status: 500 },
    );
  }
}
