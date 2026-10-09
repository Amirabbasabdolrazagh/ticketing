import { NextResponse } from "next/server";
import Project from "@/models/installationProjects";
import ProjectAssessment from "@/models/projectAssessments";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { isValidObjectId } from "mongoose";

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
  const update = {};
  if (body.data !== undefined) {
    update.data = body.data || {};
    update.status = body.status === "submitted" ? "submitted" : "in_progress";
  }
  if (body.jobBrief !== undefined && authorization(user, ["admin"])) {
    update.jobBrief = body.jobBrief || {};
    update.jobBriefStatus = body.jobBriefStatus === "issued" ? "issued" : "draft";
    if (update.jobBriefStatus === "issued") {
      update.jobBriefIssuedAt = new Date();
      update.jobBriefIssuedBy = user._id;
    }
  }
  if (body.jobBriefStatus === "acknowledged" && !authorization(user, ["admin"])) {
    update.jobBriefStatus = "acknowledged";
  }
  if (update.status === "submitted") update.submittedAt = new Date();
  if (authorization(user, ["admin"]) && body.status === "reviewed") { update.status = "reviewed"; update.reviewedAt = new Date(); update.reviewedBy = user._id; }
  if (!Object.keys(update).length) return NextResponse.json({ success: false, message: "تغییری برای ذخیره وجود ندارد" }, { status: 400 });
  const assessment = await ProjectAssessment.findOneAndUpdate(filter, update, { new: true, runValidators: true });
  if (!assessment) return NextResponse.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
  return NextResponse.json({ success: true, assessment });
}
