import Project from "@/models/projects";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import ConnectDb from "@/utils/connectDB";
import User from "@/models/users";
import { DEFAULT_SERVICE_CODES, ensureDefaultServices } from "@/utils/serviceCatalog";
import { isValidObjectId } from "mongoose";

export async function POST(req) {
  try {
    await ConnectDb();
    const { name, description, priority, code, defaultAgent, subcategories, keywords } = await req.json();
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
      !defaultAgent ||
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

    const agent = isValidObjectId(defaultAgent)
      ? await User.findOne({ _id: defaultAgent, role: "agent" })
      : null;
    if (!agent) {
      return Response.json(
        { success: false, message: "پشتیبان انتخاب‌شده معتبر نیست" },
        { status: 400 },
      );
    }

    const project = await Project.create({
      name,
      description,
      priority,
      code: normalizedCode,
      owner: user._id,
      defaultAgent: agent._id,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      keywords: Array.isArray(keywords) ? keywords : [],
    });
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
    const projects = await Project.find({ code: { $in: DEFAULT_SERVICE_CODES } })
      .sort({ code: 1 })
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
