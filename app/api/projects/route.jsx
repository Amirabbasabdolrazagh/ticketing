import Project from "@/models/projects";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
import { ensureDefaultServices } from "@/utils/serviceCatalog";
import { isValidObjectId } from "mongoose";
import ProjectHandover from "@/models/projectHandovers";

export async function POST(req) {
  try {
    await ConnectDb();
    const { name, description, priority, code, defaultAgent, passiveAgent, activeAgent, subcategories, keywords } = await req.json();
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
    if (
      !name ||
      !priority ||
      !description ||
      (!defaultAgent && !passiveAgent && !activeAgent) ||
      typeof code !== "string" ||
      !code.trim()
    ) {
      return Response.json(
        { success: false, message: "پر کردن تمامی فیلد ها الزامی است" },
        { status: 400 },
      );
    }

    const codeRegex = /^[A-Za-z0-9]+$/;
    const normalizedCode = code.trim().toUpperCase();
    if (normalizedCode.length > 10) {
      return Response.json(
        {
          success: false,
          message: "project code cannot be more than 10 characters",
        },
        { status: 400 },
      );
    }
    if (!codeRegex.test(normalizedCode)) {
      return Response.json(
        {
          success: false,
          message: "project code can only contain English letters and numbers",
        },
        { status: 400 },
      );
    }

    const existingProject = await Project.findOne({
      code: normalizedCode,
    });

    if (existingProject) {
      return Response.json(
        {
          success: false,
          message: "project code already exists",
        },
        { status: 409 },
      );
    }

    const agent = defaultAgent && isValidObjectId(defaultAgent)
      ? await User.findOne({ _id: defaultAgent, role: "agent" })
      : null;
    if (defaultAgent && !agent) {
      return Response.json(
        { success: false, message: "پشتیبان انتخاب‌شده معتبر نیست" },
        { status: 400 },
      );
    }

    const [passive, active] = await Promise.all([
      passiveAgent ? User.findOne({ _id: passiveAgent, role: "passive_agent" }) : null,
      activeAgent ? User.findOne({ _id: activeAgent, role: "active_agent" }) : null,
    ]);
    if (passiveAgent && !passive) return Response.json({ success: false, message: "پشتیبان پسیو معتبر نیست" }, { status: 400 });
    if (activeAgent && !active) return Response.json({ success: false, message: "پشتیبان اکتیو معتبر نیست" }, { status: 400 });

    const project = await Project.create({
      name,
      description,
      priority,
      code: normalizedCode,
      owner: user._id,
      defaultAgent: agent?._id || null,
      passiveAgent: passive?._id || null,
      activeAgent: active?._id || null,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      keywords: Array.isArray(keywords) ? keywords : [],
    });
    if (passive?._id) await ProjectHandover.updateOne({ project: project._id, assignee: passive._id, assigneeRole: "passive_agent" }, { $setOnInsert: { project: project._id, assignee: passive._id, assigneeRole: "passive_agent" } }, { upsert: true });
    if (active?._id) await ProjectHandover.updateOne({ project: project._id, assignee: active._id, assigneeRole: "active_agent" }, { $setOnInsert: { project: project._id, assignee: active._id, assigneeRole: "active_agent" } }, { upsert: true });
    return Response.json(
      { success: true, message: "project create successfully", project },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      { success: false, message: "server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
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
    await ConnectDb();
    await ensureDefaultServices(user._id);
    const projects = await Project.find({})
      .sort({ createdAt: 1 })
      .populate("defaultAgent", "name phone");
    return Response.json(
      {
        success: true,
        message: "The request was successful",
        projects,
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
