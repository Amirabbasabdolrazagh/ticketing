import { isValidObjectId } from "mongoose";
import Project from "@/models/installationProjects";
import ProjectHandover from "@/models/projectHandovers";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { handoverNumber, validateHandover } from "@/lib/projectFormValidation";

export async function GET(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user) return Response.json({ success: false, message: "ابتدا وارد شوید" }, { status: 401 });
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) return Response.json({ success: false, message: "شناسه پروژه معتبر نیست" }, { status: 400 });
  const query = authorization(user, ["admin"]) ? { project: projectId } : { project: projectId, assignee: user._id };
  const handovers = await ProjectHandover.find(query).populate("project", "name code status").populate("assignee", "name role").sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, handovers });
}

export async function POST(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { projectId } = await params;
  const { assignee, assigneeRole } = await req.json();
  if (!isValidObjectId(projectId) || !isValidObjectId(assignee) || !["passive_agent", "active_agent"].includes(assigneeRole)) return Response.json({ success: false, message: "اطلاعات صورتجلسه معتبر نیست" }, { status: 400 });
  const item = await ProjectHandover.findOneAndUpdate({ project: projectId, assignee, assigneeRole }, { $setOnInsert: { project: projectId, assignee, assigneeRole } }, { upsert: true, returnDocument: "after" });
  return Response.json({ success: true, handover: item }, { status: 201 });
}

export async function PATCH(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !["admin", "passive_agent", "active_agent"].includes(user.role)) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { projectId } = await params;
  const body = await req.json();
  if (!isValidObjectId(projectId) || !isValidObjectId(body.handoverId)) return Response.json({ success: false, message: "شناسه صورتجلسه یا پروژه معتبر نیست" }, { status: 400 });
  const filter = authorization(user, ["admin"]) ? { _id: body.handoverId, project: projectId } : { _id: body.handoverId, project: projectId, assignee: user._id };
  const existing = await ProjectHandover.findOne(filter).select("assigneeRole").lean();
  if (!existing) return Response.json({ success: false, message: "صورتجلسه پیدا نشد" }, { status: 404 });
  const project = await Project.findById(projectId).select("code passiveAgent activeAgent").lean();
  if (!project) return Response.json({ success: false, message: "پروژه پیدا نشد" }, { status: 404 });
  const update = {};
  if (body.data !== undefined) {
    if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) return Response.json({ success: false, message: "اطلاعات صورتجلسه معتبر نیست" }, { status: 400 });
    if (body.status === "submitted") {
      const validationError = validateHandover(body.data, existing.assigneeRole);
      if (validationError) return Response.json({ success: false, message: validationError }, { status: 400 });
    }
    update.data = { ...body.data, meetingNumber: handoverNumber(project.code, existing.assigneeRole) };
    update.status = body.status === "submitted" ? "submitted" : "assigned";
    if (update.status === "submitted") update.submittedAt = new Date();
  }
  if (authorization(user, ["admin"]) && ["approved", "rejected"].includes(body.status)) {
    update.status = body.status;
    update.approvedAt = body.status === "approved" ? new Date() : null;
    update.approvedBy = body.status === "approved" ? user._id : null;
  }
  if (!Object.keys(update).length) return Response.json({ success: false, message: "تغییری برای ذخیره وجود ندارد" }, { status: 400 });
  const handover = await ProjectHandover.findOneAndUpdate(filter, update, { returnDocument: "after", runValidators: true });
  if (authorization(user, ["admin"]) && body.status === "approved") {
    const required = [project.passiveAgent, project.activeAgent].filter(Boolean).length;
    const approved = await ProjectHandover.countDocuments({ project: projectId, status: "approved" });
    if (required > 0 && approved >= required) await Project.findByIdAndUpdate(projectId, { status: "archived" });
  }
  return Response.json({ success: true, handover });
}
