import TicketMessage from "@/models/ticketMessage";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";
import User from "@/models/users";
import {
  customerMessageTelegramText,
  ticketReplyTelegramText,
} from "@/utils/telegram";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

export async function POST(req, { params }) {
  try {
    const { ticketId } = await params;
    const { message } = await req.json();
    const user = await getCurrentUser();
    const validId = isValidObjectId(ticketId);
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    if (ticketId == undefined || ticketId === null || !validId) {
      return Response.json(
        { success: false, message: "invalid ticketId" },
        { status: 400 },
      );
    }
    await ConnectDb();
    const ticketInfo = await Ticket.findById(ticketId).populate("project", "name");
    if (!ticketInfo) {
      return Response.json(
        { success: false, message: "ticket not found" },
        { status: 404 },
      );
    }
    if (ticketInfo.status === "closed") {
      return Response.json(
        { success: false, message: "the ticket was closed" },
        { status: 403 },
      );
    }
    if (user.role == "admin") {
      if (!message) {
        return Response.json(
          { success: false, message: "please fill message feild" },
          { status: 400 },
        );
      }
      const messages = await TicketMessage.create({
        message,
        sender: user._id,
        ticket: ticketId,
        type: "text",
      });
      await messages.populate("sender", "name role");
      const customer = await User.findById(ticketInfo.creator).select(`${messengerUserSelect} siteLastSeenAt`);
      await sendMessengerNotification(
        customer,
        ticketReplyTelegramText({ ticket: ticketInfo, message, senderName: user.name, senderRole: "مدیر", serviceName: ticketInfo.project?.name }),
      );
      return Response.json(
        { success: true, message: "message create successfully",messages },
        { status: 201 },
      );
    } else if (user.role == "customer") {
      if (!message) {
        return Response.json(
          { success: false, message: "please fill message feild" },
          { status: 400 },
        );
      }
      if (ticketInfo.creator.toString() === user._id.toString()) {
        const messages = await TicketMessage.create({
          message,
          sender: user._id,
          ticket: ticketId,
          type: "text",
        });
        await messages.populate("sender", "name role");
        if (ticketInfo.assignedTo) {
          const assignedAgent = await User.findById(ticketInfo.assignedTo).select(`${messengerUserSelect} siteLastSeenAt`);
          await sendMessengerNotification(
            assignedAgent,
            customerMessageTelegramText({ ticket: ticketInfo, message, customerName: user.name, serviceName: ticketInfo.project?.name }),
          );
        }
        const admins = await User.find({ role: "admin" }).select(`${messengerUserSelect} siteLastSeenAt`);
        await Promise.all(
          admins.map((admin) =>
            sendMessengerNotification(
              admin,
              customerMessageTelegramText({
                ticket: ticketInfo,
                message,
                customerName: user.name,
                serviceName: ticketInfo.project?.name,
              }),
            ),
          ),
        );
        return Response.json(
          { success: true, message: "message create successfully" , messages },
          { status: 201 },
        );
      } else {
        return Response.json(
          { success: false, message: "Forbiden" },
          { status: 403 },
        );
      }
    } else if (user.role == "agent") {
      if (!ticketInfo.assignedTo) {
        return Response.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
      if (ticketInfo.assignedTo.toString() === user._id.toString()) {
        if (!message) {
          return Response.json(
            { success: false, message: "please fill message feild" },
            { status: 400 },
          );
        }
        const messages = await TicketMessage.create({
          message,
          sender: user._id,
          ticket: ticketId,
          type: "text",
        });
        await messages.populate("sender", "name role");
        const customer = await User.findById(ticketInfo.creator).select(`${messengerUserSelect} siteLastSeenAt`);
        await sendMessengerNotification(
          customer,
          ticketReplyTelegramText({ ticket: ticketInfo, message, senderName: user.name, senderRole: "پشتیبان", serviceName: ticketInfo.project?.name }),
        );
        return Response.json(
          { success: true, message: "message create successfully" ,messages },
          { status: 201 },
        );
      } else {
        return Response.json(
          { success: false, message: "Forbidden" },
          { status: 403 },
        );
      }
    } else {
      return Response.json(
        { success: false, message: "invalid role" },
        { status: 403 },
      );
    }
  } catch (error) {
    console.log(error.message);

    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
export async function GET(req, { params }) {
  try {
    const { ticketId } = await params;
    const user = await getCurrentUser();
    const validId = isValidObjectId(ticketId);
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    if (ticketId == undefined || ticketId === null || !validId) {
      return Response.json(
        { success: false, message: "invalid ticketId" },
        { status: 400 },
      );
    }
    await ConnectDb();
    const ticketInfo = await Ticket.findById(ticketId);
    if (!ticketInfo) {
      return Response.json(
        { success: false, message: "ticket not found" },
        { status: 404 },
      );
    }

    const messageFilter = { ticket: ticketInfo._id, type: "text" };

    const allmessages = await TicketMessage.find(messageFilter)
      .populate("sender", "name role")
      .sort({ createdAt: 1 });

    if (user.role == "admin") {
      return Response.json(
        {
          success: true,
          message: "operation was successfully",
          allmessages,
        },
        { status: 200 },
      );
    } else if (
      user.role === "customer" &&
      ticketInfo.creator.toString() === user._id.toString()
    ) {
      return Response.json(
        {
          success: true,
          message: "operation was successfully",
          allmessages,
        },
        { status: 200 },
      );
    } else if (
      user.role === "agent" &&
      ticketInfo.assignedTo &&
      ticketInfo.assignedTo.toString() === user._id.toString()
    ) {
      return Response.json(
        {
          success: true,
          message: "operation was successfully",
          allmessages,
        },
        { status: 200 },
      );
    } else {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
