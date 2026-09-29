import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";
import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import ProjectCounter from "@/models/projectCounter";
import User from "@/models/users";
import { classifyService, ensureDefaultServices } from "@/utils/serviceCatalog";
import { systemMessage } from "@/utils/createSystemMessage";
import { assignmentTelegramText } from "@/utils/telegram";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

export const runtime = "nodejs";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

export async function POST(req) {
  let savedFilePath;

  try {
    const contentType = req.headers.get("content-type") || "";
    let title;
    let priority;
    let attachment;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = formData.get("title")?.toString();
      priority = formData.get("priority")?.toString();
      attachment = formData.get("attachment");
    } else {
      ({ title, priority } = await req.json());
    }

    await ConnectDb();

    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }

    const isAllowedRole = authorization(user, ["customer"]);

    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    if (!title?.trim()) {
      return Response.json(
        { success: false, message: "وارد کردن عنوان تیکت الزامی است" },
        { status: 400 },
      );
    }

    if (attachment instanceof File && attachment.size > MAX_ATTACHMENT_SIZE) {
      return Response.json(
        { success: false, message: "حجم فایل نباید بیشتر از ۱۰ مگابایت باشد" },
        { status: 400 },
      );
    }

    let attachmentData;
    if (attachment instanceof File && attachment.size > 0) {
      const extension = path.extname(attachment.name).slice(0, 20);
      const storedName = `${randomUUID()}${extension}`;
      const uploadDirectory = path.join(
        process.cwd(),
        "storage",
        "ticket-attachments",
      );
      await mkdir(uploadDirectory, { recursive: true });
      savedFilePath = path.join(uploadDirectory, storedName);
      await writeFile(savedFilePath, Buffer.from(await attachment.arrayBuffer()));
      attachmentData = {
        originalName: path.basename(attachment.name).slice(0, 255),
        storedName,
        mimeType: attachment.type || "application/octet-stream",
        size: attachment.size,
      };
    }

    const catalogOwner = await User.findOne({ role: "admin" }).select("_id");
    if (!catalogOwner) {
      if (savedFilePath) await unlink(savedFilePath).catch(() => {});
      return Response.json(
        { success: false, message: "برای راه‌اندازی خدمات، وجود مدیر سیستم الزامی است" },
        { status: 503 },
      );
    }
    await ensureDefaultServices(catalogOwner._id);
    const service = await classifyService(title);
    if (!service?.defaultAgent) {
      if (savedFilePath) await unlink(savedFilePath).catch(() => {});
      return Response.json(
        { success: false, message: "برای این خدمت هنوز پشتیبان پیش‌فرض تعیین نشده است" },
        { status: 503 },
      );
    }

    const counter = await ProjectCounter.findOneAndUpdate(
      { project: service._id },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true },
    );
    const ticketNumber = `${service.code}-${String(counter.sequence).padStart(6, "0")}`;
    const ticket = await Ticket.create({
      title: title.trim(),
      priority,
      creator: user._id,
      attachment: attachmentData,
      project: service._id,
      assignedTo: service.defaultAgent,
      assignedAt: new Date(),
      ticketNumber,
      status: "in-progress",
    });

    const assignedAgent = await User.findById(service.defaultAgent).select(
      `name ${messengerUserSelect}`,
    );
    await systemMessage(
      ticket._id,
      user._id,
      `تیکت به‌صورت خودکار در خدمت «${service.name}» دسته‌بندی و به پشتیبان «${assignedAgent?.name || "تعیین‌شده"}» اختصاص داده شد`,
    );
    await sendMessengerNotification(
      assignedAgent,
      assignmentTelegramText({ ticket, projectName: service.name }),
    );

    return Response.json(
      {
        success: true,
        message: "تیکت با موفقیت ساخته شد",
        ticket,
      },
      { status: 201 },
    );
  } catch (error) {
    if (savedFilePath) {
      await unlink(savedFilePath).catch(() => {});
    }
    console.log(error.message);

    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const project = searchParams.get("project");
    const search = searchParams.get("search");

    // new
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    let limit = null;
    let page = null;

    if (limitParam !== null) {
      const parsedLimit = Number(limitParam);

      if (
        !Number.isInteger(parsedLimit) ||
        parsedLimit <= 0 ||
        parsedLimit > 50
      ) {
        return Response.json(
          {
            success: false,
            message: "invalid limit",
          },
          { status: 400 },
        );
      }

      limit = parsedLimit;
    }
    if (pageParam !== null) {
      const parsedPage = Number(pageParam);
      if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
        return Response.json(
          { success: false, message: "شماره صفحه نامعتبر است" },
          { status: 400 },
        );
      }
      page = parsedPage;
      if (limit === null) limit = 10;
    }

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

    const allowedStatus = ["open", "in-progress", "resolved", "closed"];

    const allowedPriority = ["low", "medium", "high"];

    const checkStatus = (status) => {
      return allowedStatus.includes(status);
    };

    const checkPriority = (priority) => {
      return allowedPriority.includes(priority);
    };

    let tickets;
    let totalTickets = 0;

    if (user.role === "admin") {
      const filter = {};

      if (status !== null) {
        if (checkStatus(status)) {
          filter.status = status;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid status",
            },
            { status: 400 },
          );
        }
      }

      if (search !== null && search.trim() !== "") {
        filter.title = { $regex: search, $options: "i" };
      }

      if (priority !== null) {
        if (checkPriority(priority)) {
          filter.priority = priority;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid priority",
            },
            { status: 400 },
          );
        }
      }

      if (project !== null) {
        if (isValidObjectId(project)) {
          filter.project = project;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid projectId",
            },
            { status: 400 },
          );
        }
      }

      totalTickets = await Ticket.countDocuments(filter);
      let query = Ticket.find(filter)
        .populate("project", "name")
        .populate("assignedTo", "name")
        .populate("creator", "name")
        .sort({
          createdAt: -1,
        });

      if (limit !== null) {
        if (page !== null) query = query.skip((page - 1) * limit);
        query = query.limit(limit);
      }

      tickets = await query;
    } else if (user.role === "agent") {
      const filter = {
        assignedTo: user._id,
      };

      if (status !== null) {
        if (checkStatus(status)) {
          filter.status = status;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid status",
            },
            { status: 400 },
          );
        }
      }

      if (priority !== null) {
        if (checkPriority(priority)) {
          filter.priority = priority;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid priority",
            },
            { status: 400 },
          );
        }
      }

      if (project !== null) {
        if (isValidObjectId(project)) {
          filter.project = project;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid projectId",
            },
            { status: 400 },
          );
        }
      }

      if (search !== null && search.trim() !== "") {
        filter.title = { $regex: search, $options: "i" };
      }

      totalTickets = await Ticket.countDocuments(filter);
      let query = Ticket.find(filter)
        .populate("project", "name")
        .populate("assignedTo", "name")
        .populate("creator", "name")
        .sort({
          createdAt: -1,
        });

      if (limit !== null) {
        if (page !== null) query = query.skip((page - 1) * limit);
        query = query.limit(limit);
      }

      tickets = await query;
    } else if (user.role === "customer") {
      const filter = {
        creator: user._id,
      };

      if (search !== null && search.trim() !== "") {
        filter.title = { $regex: search, $options: "i" };
      }

      if (status !== null) {
        if (checkStatus(status)) {
          filter.status = status;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid status",
            },
            { status: 400 },
          );
        }
      }

      if (priority !== null) {
        if (checkPriority(priority)) {
          filter.priority = priority;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid priority",
            },
            { status: 400 },
          );
        }
      }

      if (project !== null) {
        if (isValidObjectId(project)) {
          filter.project = project;
        } else {
          return Response.json(
            {
              success: false,
              message: "invalid projectId",
            },
            { status: 400 },
          );
        }
      }

      totalTickets = await Ticket.countDocuments(filter);
      let query = Ticket.find(filter)
        .populate("project", "name")
        .populate("assignedTo", "name")
        .populate("creator", "name")
        .sort({
          createdAt: -1,
        });

      if (limit !== null) {
        if (page !== null) query = query.skip((page - 1) * limit);
        query = query.limit(limit);
      }

      tickets = await query;
    }

    return Response.json(
      {
        success: true,
        tickets,
        pagination: {
          page: page || 1,
          limit: limit || totalTickets || 1,
          total: totalTickets,
          totalPages: limit ? Math.max(1, Math.ceil(totalTickets / limit)) : 1,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error.message);

    return Response.json(
      {
        success: false,
        message: "server error",
      },
      { status: 500 },
    );
  }
}
