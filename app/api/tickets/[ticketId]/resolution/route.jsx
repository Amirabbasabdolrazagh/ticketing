import TicketResolution from "@/models/ticketResolution";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";

export async function POST(req, { params }) {
  try {
    const { ticketId } = await params;
    const { isResolved } = await req.json();
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
    const existingResolution = await TicketResolution.findOne({
      ticket: ticketId,
    });

    let ticketResolution;

    if (existingResolution) {
      existingResolution.isResolved = isResolved;
      ticketResolution = await existingResolution.save();
    } else {
      ticketResolution = await TicketResolution.create({
        ticket: ticketId,
        customer: user._id,
        isResolved,
      });
    }

    return Response.json(
      {
        success: true,
        message: "customer confirming created",
        ticketResolution,
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
