import { NextResponse } from "next/server";
import Project from "@/models/installationProjects";
import ProjectAssessment from "@/models/projectAssessments";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { isValidObjectId } from "mongoose";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export const runtime = "nodejs";

export async function GET(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: "ابتدا وارد حساب شوید" }, { status: 401 });
  const { projectId } = await params;
  if (!isValidObjectId(projectId)) return NextResponse.json({ success: false, message: "شناسه پروژه معتبر نیست" }, { status: 400 });
  const query = authorization(user, ["admin"])
    ? { project: projectId }
    : { project: projectId, assignee: user._id };
  const assessments = await ProjectAssessment.find(query)
    .populate("project", "name code")
    .populate("assignee", "name phone role")
    .sort({ createdAt: -1 }).lean();
  return NextResponse.json({ success: true, assessments });
}

export async function POST(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return NextResponse.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { projectId } = await params;
  const { assignee, assigneeRole = "passive_agent" } = await req.json();
  if (!isValidObjectId(projectId) || !isValidObjectId(assignee) || !["passive_agent", "active_agent"].includes(assigneeRole)) {
    return NextResponse.json({ success: false, message: "اطلاعات ارجاع فرم معتبر نیست" }, { status: 400 });
  }
  const [project, agent] = await Promise.all([
    Project.findById(projectId), User.findOne({ _id: assignee, role: assigneeRole }),
  ]);
  if (!project || !agent) return NextResponse.json({ success: false, message: "پروژه یا پشتیبان پیدا نشد" }, { status: 404 });
  const assessment = await ProjectAssessment.create({ project: projectId, assignee, assigneeRole });
  return NextResponse.json({ success: true, assessment }, { status: 201 });
}

export async function PATCH(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !["admin", "passive_agent", "active_agent"].includes(user.role)) return NextResponse.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { projectId } = await params;
  const body = await req.json();
  const filter = authorization(user, ["admin"]) ? { _id: body.assessmentId, project: projectId } : { _id: body.assessmentId, project: projectId, assignee: user._id };
  if (!isValidObjectId(projectId) || !isValidObjectId(body.assessmentId)) return NextResponse.json({ success: false, message: "شناسه فرم یا پروژه معتبر نیست" }, { status: 400 });
  const previous = await ProjectAssessment.findOne(filter).select("jobBriefStatus assignee status").lean();
  if (!previous) return NextResponse.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
  if (body.jobBrief !== undefined || body.jobBriefStatus !== undefined) {
    const project = await Project.findById(projectId).select("passiveAgent activeAgent").lean();
    const assessmentRole = await ProjectAssessment.findById(body.assessmentId).select("assigneeRole").lean();
    const assignedId = assessmentRole?.assigneeRole === "passive_agent" ? project?.passiveAgent : project?.activeAgent;
    if (!assignedId || String(assignedId) !== String(previous.assignee)) {
      return NextResponse.json({ success: false, message: "این ابلاغ به پشتیبان اجرایی پروژه اختصاص ندارد" }, { status: 403 });
    }
  }
  const update = {};
  if (body.data !== undefined) {
    update.data = body.data || {};
    update.status = body.status === "submitted" ? "submitted" : "in_progress";
  }
  if (body.jobBrief !== undefined && authorization(user, ["admin"])) {
    update.jobBrief = body.jobBrief || {};
    update.jobBriefStatus = body.jobBriefStatus === "issued" ? "issued" : (["issued", "acknowledged"].includes(previous.jobBriefStatus) ? previous.jobBriefStatus : "draft");
    if (update.jobBriefStatus === "issued") {
      update.jobBriefIssuedAt = new Date();
      update.jobBriefIssuedBy = user._id;
    }
  }
  if (body.jobBriefStatus === "acknowledged" && !authorization(user, ["admin"]) && previous.jobBriefStatus === "issued") {
    update.jobBriefStatus = "acknowledged";
  }
  if (update.status === "submitted") update.submittedAt = new Date();
  if (authorization(user, ["admin"]) && body.status === "reviewed") { update.status = "reviewed"; update.reviewedAt = new Date(); update.reviewedBy = user._id; }
  if (!Object.keys(update).length) return NextResponse.json({ success: false, message: "تغییری برای ذخیره وجود ندارد" }, { status: 400 });
  const assessment = await ProjectAssessment.findOneAndUpdate(filter, update, { returnDocument: "after", runValidators: true });
  if (!assessment) return NextResponse.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
  if (update.jobBriefStatus === "issued" && previous.jobBriefStatus !== "issued") {
    const agent = await User.findById(assessment.assignee).select(messengerUserSelect);
    const project = await Project.findById(projectId).select("name code").lean();
    if (agent) await Promise.allSettled([sendMessengerNotification(agent, `📋 <b>ابلاغ شرح وظایف پروژه</b>\nپروژه: <b>${escapeHtml(project?.name || "پروژه")}</b>\nکد پروژه: ${escapeHtml(project?.code || "—")}\nابلاغ جدید شما در منوی «ابلاغ‌ها»ی سایت آماده مشاهده است.`)]);
  }
  return NextResponse.json({ success: true, assessment });
}
