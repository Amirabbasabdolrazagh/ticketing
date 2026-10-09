import Project from "@/models/projects";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";
import Ticket from "@/models/tickets";
import User from "@/models/users";
export async function GET(req, { params }) {
  try {
    const { projectId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const isAllowedRole = authorization(user, ["admin"]);
    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const isValidId = isValidObjectId(projectId);
    if (!isValidId) {
      return Response.json(
        { success: false, message: "invalid projectId" },
        { status: 400 },
      );
    }
    await ConnectDb();

    const projectInfo = await Project.findById(projectId)
      .populate("defaultAgent", "name phone")
      .populate("passiveAgent", "name phone role")
      .populate("activeAgent", "name phone role");
    if (!projectInfo) {
      return Response.json(
        { success: false, message: "project not found" },
        { status: 404 },
      );
    }
    return Response.json(
      {
        success: true,
        message: "The request was successful",
        projectInfo,
      },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const { projectId } = await params;
    const { name, description, priority, status, code, defaultAgent, subcategories, keywords } = await req.json();
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { success: false, message: "user unauthorized" },
        { status: 401 },
      );
    }
    const isAllowedRole = authorization(user, ["admin"]);
    if (!isAllowedRole) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    const isValidId = isValidObjectId(projectId);
    if (!isValidId) {
      return Response.json(
        { success: false, message: "invalid projectId" },
        { status: 400 },
      );
    }
    if (
      name == undefined &&
      description == undefined &&
      priority === undefined &&
      status === undefined &&
      code === undefined &&
      defaultAgent === undefined &&
      subcategories === undefined &&
      keywords === undefined
    ) {
      return Response.json(
        { success: false, message: "Fill in at least one field." },
        { status: 400 },
      );
    }
    await ConnectDb();
    const projectInfo = await Project.findById(projectId);
    if (!projectInfo) {
      return Response.json(
        { success: false, message: "project not found" },
        { status: 404 },
      );
    }

    if (code !== undefined) {
      if (typeof code !== "string" || !code.trim()) {
        return Response.json(
          {
            success: false,
            message: "project code is required",
          },
          { status: 400 },
        );
      }

      const normalizedCode = code.trim().toUpperCase();
      const codeRegex = /^[A-Za-z0-9]+$/;

      if (!codeRegex.test(normalizedCode)) {
        return Response.json(
          {
            success: false,
            message:
              "project code can only contain English letters and numbers",
          },
          { status: 400 },
        );
      }

      if (normalizedCode.length > 10) {
        return Response.json(
          {
            success: false,
            message: "project code cannot be more than 10 characters",
          },
          { status: 400 },
        );
      }

      if (normalizedCode !== projectInfo.code) {
        const numberedTicketExists = await Ticket.exists({
          project: projectInfo._id,
          ticketNumber: { $exists: true, $ne: null },
        });

        if (numberedTicketExists) {
          return Response.json(
            {
              success: false,
              message:
                "project code cannot be changed after ticket numbers have been generated",
            },
            { status: 409 },
          );
        }
        const existingCode = await Project.findOne({
          code: normalizedCode,
          _id: { $ne: projectInfo._id },
        });

        if (existingCode) {
          return Response.json(
            {
              success: false,
              message: "project code already exists",
            },
            { status: 409 },
          );
        }
        projectInfo.code = normalizedCode;
      }
    }
    if (status) {
      if (status == "archived" || status == "active") {
        projectInfo.status = status;
      } else {
        return Response.json(
          { success: false, message: "invalid project status" },
          { status: 400 },
        );
      }
    }

    if (name && name !== null) {
      projectInfo.name = name;
    }
    if (description && description !== null) {
      projectInfo.description = description;
    }
    if (defaultAgent !== undefined) {
      const agent = isValidObjectId(defaultAgent)
        ? await User.findOne({ _id: defaultAgent, role: "agent" })
        : null;
      if (!agent) {
        return Response.json(
          { success: false, message: "پشتیبان انتخاب‌شده معتبر نیست" },
          { status: 400 },
        );
      }
      projectInfo.defaultAgent = agent._id;
    }
    if (Array.isArray(subcategories)) projectInfo.subcategories = subcategories;
    if (Array.isArray(keywords)) projectInfo.keywords = keywords;
    if (priority && priority !== null) {
      if (priority == "low" || priority == "high" || priority == "medium") {
        projectInfo.priority = priority;
      } else {
        return Response.json(
          { success: false, message: "invalid project priorty" },
          { status: 400 },
        );
      }
    }
    await projectInfo.save();

    return Response.json(
      { success: true, message: "project updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}
