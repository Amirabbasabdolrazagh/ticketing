import Project from "@/models/projects";
import Ticket from "@/models/tickets";
import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { systemMessage } from "@/utils/createSystemMessage";
import { isValidObjectId } from "mongoose";
import ProjectCounter from "@/models/projectCounter";
import TicketResolution from "@/models/ticketResolution";
import {
  assignmentTelegramText,
} from "@/utils/telegram";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";
export async function GET(req, { params }) {
  const { ticketId } = await params;
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const isAllowedRole = authorization(user, ["admin", "agent", "customer"]);
    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const ticket = await Ticket.findById(ticketId)
      .populate("project", "name  description")
      .populate("creator", "name");
    if (!ticket) {
      return Response.json(
        { success: false, message: "ticket not found" },
        { status: 404 },
      );
    }
    const existingResolution = await TicketResolution.findOne({ ticket: ticket._id }).lean();

    const needsConfirmation =
      ticket.status === "resolved" &&
      user.role === "customer" &&
      (!existingResolution || ticket.updatedAt > existingResolution.updatedAt);

    const legacyRating = existingResolution?.agentRating && existingResolution?.processRating
      ? Math.round((existingResolution.agentRating + existingResolution.processRating) / 2)
      : existingResolution?.agentRating || existingResolution?.processRating;
    const rating = existingResolution?.rating || legacyRating;

    const response = Response.json({
      success: true,
      ticket,
      needsConfirmation,
      resolution: existingResolution ? {
        isResolved: existingResolution.isResolved,
        rating,
        ...(user.role === "admin" && rating <= 3
          ? { feedback: existingResolution.feedback || "" }
          : {}),
        createdAt: existingResolution.createdAt,
      } : null,
    });
    if (user.role === "admin") {
      return response;
    } else if (
      user.role === "agent" &&
      ticket.assignedTo &&
      ticket.assignedTo.toString() === user._id.toString()
    ) {
      return response;
    } else if (
      user.role === "customer" &&
      ticket.creator?._id.toString() === user._id.toString()
    ) {
      return response;
    } else {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
  } catch (error) {
      console.log("GET TICKET ERROR:", error);
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}

// patch ticket
export async function PATCH(req, { params }) {
  const { ticketId } = await params;

  try {
    const { project, assignedTo, status, priority, deadline } =
      await req.json();

    await ConnectDb();

    const user = await getCurrentUser();
    const validId = isValidObjectId(ticketId);

    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }

    const isAllowedRole = authorization(user, ["admin", "agent"]);

    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    if (ticketId === undefined || ticketId === null || !validId) {
      return Response.json(
        { success: false, message: "invalid ticketId" },
        { status: 400 },
      );
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      return Response.json(
        { success: false, message: "ticket not found" },
        { status: 404 },
      );
    }

    if (ticket.status === "closed") {
      return Response.json(
        { success: false, message: "the ticket was closed" },
        { status: 403 },
      );
    }

    const oldStatus = ticket.status;
    const oldAssignedTo = ticket.assignedTo;
    const oldProject = ticket.project;
    const oldPriority = ticket.priority;

    let projects;
    let agent;

    // =========================
    // ADMIN
    // =========================
    if (user.role === "admin") {
      // Validate project
      if (project !== undefined) {
        if (!isValidObjectId(project)) {
          return Response.json(
            { success: false, message: "invalid projectId" },
            { status: 400 },
          );
        }

        projects = await Project.findById(project);

        if (!projects) {
          return Response.json(
            { success: false, message: "project not found" },
            { status: 404 },
          );
        }
      }

      // Validate assigned agent
      if (assignedTo !== undefined) {
        if (!isValidObjectId(assignedTo)) {
          return Response.json(
            { success: false, message: "invalid assignedToId" },
            { status: 400 },
          );
        }

        agent = await User.findById(assignedTo).select(messengerUserSelect);

        if (!agent) {
          return Response.json(
            { success: false, message: "agent not found" },
            { status: 404 },
          );
        }

        if (agent.role !== "agent") {
          return Response.json(
            { success: false, message: "user role should be agent" },
            { status: 400 },
          );
        }
      }

      // At least one field must be sent
      if (
        project === undefined &&
        assignedTo === undefined &&
        status === undefined &&
        priority === undefined &&
        deadline === undefined
      ) {
        return Response.json(
          {
            success: false,
            message: "حداقل یکی از فیلد ها باید ارسال شود",
          },
          { status: 400 },
        );
      }

      // Update status
      if (status !== undefined) {
        ticket.status = status;
      }

      // Update priority
      if (priority !== undefined) {
        const allowPriority = ["low", "medium", "high"];

        if (!allowPriority.includes(priority)) {
          return Response.json(
            {
              success: false,
              message: "invalid priority",
            },
            { status: 400 },
          );
        }

        ticket.priority = priority;
      }

      // Update project
      if (project !== undefined) {
        ticket.project = projects._id;
      }

      // =========================
      // GENERATE TICKET NUMBER
      // =========================
      if (!ticket.ticketNumber && project !== undefined) {
        if (!projects.code) {
          return Response.json(
            {
              success: false,
              message: "project code is not configured",
            },
            { status: 400 },
          );
        }

        const counter = await ProjectCounter.findOneAndUpdate(
          {
            project: projects._id,
          },
          {
            $inc: {
              sequence: 1,
            },
          },
          {
            new: true,
            upsert: true,
          },
        );

        const sequence = String(counter.sequence).padStart(6, "0");

        ticket.ticketNumber = `${projects.code}-${sequence}`;
      }

      // Update assigned agent
      if (assignedTo !== undefined) {
        ticket.assignedTo = agent._id;
        if (oldAssignedTo?.toString() !== agent._id.toString()) {
          ticket.assignedAt = new Date();
          ticket.agentViewedAt = null;
          ticket.agentFirstReplyAt = null;
          ticket.unseenReminder2hSentAt = null;
          ticket.unseenAlarm3hSentAt = null;
          ticket.unseenEscalation4hSentAt = null;
        }
      }
      if (deadline !== undefined) {
        const deadlineDays = Number(deadline);
        if (!Number.isInteger(deadlineDays) || deadlineDays < 1 || deadlineDays > 365) {
          return Response.json(
            { success: false, message: "مهلت رسیدگی باید بین ۱ تا ۳۶۵ روز باشد" },
            { status: 400 },
          );
        }
        ticket.deadline = String(deadlineDays);
        ticket.deadlineAt = new Date(
          Date.now() + deadlineDays * 24 * 60 * 60 * 1000,
        );
      } else if (
        assignedTo !== undefined &&
        oldAssignedTo?.toString() !== ticket.assignedTo?.toString() &&
        Number(ticket.deadline) > 0
      ) {
        ticket.deadlineAt = new Date(
          Date.now() + Number(ticket.deadline) * 24 * 60 * 60 * 1000,
        );
      }

      await ticket.save();

      // =========================
      // SYSTEM MESSAGES
      // =========================

      if (deadline !== undefined) {
        await systemMessage(
          ticket._id,
          user._id,
          `مهلت رسیدگی تیکت روی ${ticket.deadline} روز تنظیم شد`,
          ["admin", "agent"],
        );
      }

      // Status changed
      if (oldStatus !== ticket.status) {
        if (status === "in-progress") {
          await systemMessage(
            ticket._id,
            user._id,
            "وضعیت تیکت از «باز» به «در حال بررسی» تغییر کرد",
          );
        } else if (status === "resolved") {
          await systemMessage(
            ticket._id,
            user._id,
            "وضعیت تیکت از «در حال بررسی» به «حل‌شده» تغییر کرد",
          );
        } else if (status === "closed") {
          await systemMessage(
            ticket._id,
            user._id,
            "وضعیت تیکت از «حل‌شده» به «بسته‌شده» تغییر کرد",
          );
        }
      }

      // Agent changed
      if (
        assignedTo !== undefined &&
        oldAssignedTo?.toString() !== ticket.assignedTo?.toString()
      ) {
        await systemMessage(
          ticket._id,
          user._id,
          `تیکت به پشتیبان «${agent.name || "انتخاب‌شده"}» اختصاص داده شد`,
        );
        const assignedProject = projects ||
          (ticket.project ? await Project.findById(ticket.project).select("name") : null);
        await sendMessengerNotification(
          agent,
          assignmentTelegramText({
            ticket,
            projectName: assignedProject?.name,
          }),
        );
      }

      // Project changed
      if (
        project !== undefined &&
        oldProject?.toString() !== ticket.project?.toString()
      ) {
        await systemMessage(
          ticket._id,
          user._id,
          `تیکت به خدمت «${projects.name}» اختصاص داده شد`,
        );
      }

      // Priority changed
      if (priority !== undefined && oldPriority !== ticket.priority) {
        await systemMessage(
          ticket._id,
          user._id,
          `اولویت تیکت از «${{ low: "کم", medium: "متوسط", high: "زیاد" }[oldPriority] || oldPriority}» به «${{ low: "کم", medium: "متوسط", high: "زیاد" }[ticket.priority] || ticket.priority}» تغییر کرد`,
        );
      }

      return Response.json(
        {
          success: true,
          message: "ticket updated successfully",
          ticket,
        },
        { status: 200 },
      );
    }

    // =========================
    // AGENT
    // =========================
    else if (
      user.role === "agent" &&
      ticket.assignedTo &&
      ticket.assignedTo.toString() === user._id.toString()
    ) {
      if (project !== undefined || assignedTo !== undefined) {
        return Response.json(
          { success: false, message: "forbidden" },
          { status: 403 },
        );
      }

      if (!status) {
        return Response.json(
          { success: false, message: "invalid status" },
          { status: 400 },
        );
      }

      if (ticket.status === "in-progress" && status === "resolved") {
        ticket.status = status;

        await ticket.save();

        if (oldStatus !== status) {
          await systemMessage(
            ticket._id,
            user._id,
            "وضعیت تیکت از «در حال بررسی» به «حل‌شده» تغییر کرد",
          );
        }

        return Response.json(
          {
            success: true,
            message: "تیکت با موفقیت به وضعیت حل‌شده تغییر کرد",
            ticket,
          },
          { status: 200 },
        );
      }

      return Response.json(
        { success: false, message: "invalid status" },
        { status: 400 },
      );
    }

    // =========================
    // FORBIDDEN
    // =========================
    else {
      return Response.json(
        { success: false, message: "user role forbidden" },
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
