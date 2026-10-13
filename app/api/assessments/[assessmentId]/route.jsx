import { isValidObjectId } from "mongoose";
import path from "path";
import { unlink } from "fs/promises";
import ProjectAssessment from "@/models/projectAssessments";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";
import { validateAssessment } from "@/lib/projectFormValidation";
import { projectFormProgress } from "@/lib/projectFormProgress";

export const runtime = "nodejs";
const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function PATCH(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  const { assessmentId } = await params;
  if (!user) {
    return Response.json({ success: false, message: "نشست شما منقضی شده است؛ دوباره وارد شوید." }, { status: 401 });
  }
  if (!["passive_agent", "active_agent"].includes(user.role)) {
    return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  }
  if (!isValidObjectId(assessmentId)) {
    return Response.json({ success: false, message: "شناسه فرم معتبر نیست" }, { status: 400 });
  }
  const raw = await req.text();
  if (raw.length > 250_000) return Response.json({ success: false, message: "حجم اطلاعات فرم بیش از حد مجاز است" }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ success: false, message: "اطلاعات فرم معتبر نیست" }, { status: 400 }); }
  if (body.trackingEvent === "opened") {
    const assessment = await ProjectAssessment.findOneAndUpdate(
      { _id: assessmentId, assignee: user._id, project: null },
      { $set: { openedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!assessment) return Response.json({ success: false, message: "فرم پیدا نشد" }, { status: 404 });
    return Response.json({ success: true, assessment });
  }
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return Response.json({ success: false, message: "اطلاعات فرم معتبر نیست" }, { status: 400 });
  }
  const submitting = body.status === "submitted";
  if (submitting) {
    const validationError = validateAssessment(data, { standalone: true });
    if (validationError) return Response.json({ success: false, message: validationError }, { status: 400 });
  }
  if (submitting && (![data.projectTitle, data.customerCompany, data.customerAddress].every((value) => typeof value === "string" && value.trim()))) {
    return Response.json({ success: false, message: "عنوان پروژه، نام مشتری و محل اجرا برای ارسال ارزیابی الزامی است" }, { status: 400 });
  }
  if (submitting && (data.projectTitle.trim().length > 100 || data.customerCompany.trim().length > 150 || data.customerAddress.trim().length > 500)) {
    return Response.json({ success: false, message: "عنوان پروژه، نام مشتری یا محل اجرا بیش از حد طولانی است" }, { status: 400 });
  }
  const assessment = await ProjectAssessment.findOneAndUpdate(
    { _id: assessmentId, assignee: user._id, project: null, status: { $in: ["assigned", "in_progress"] } },
    { $set: { data, status: submitting ? "submitted" : "in_progress", lastSavedAt: new Date(), progressPercent: projectFormProgress(data, "assessment", submitting), ...(submitting ? { submittedAt: new Date() } : {}) } },
    { returnDocument: "after", runValidators: true },
  );
  if (!assessment) return Response.json({ success: false, message: "فرم پیدا نشد یا قبلاً برای بررسی ارسال شده است" }, { status: 409 });
  if (submitting) {
    const admins = await User.find({ role: "admin" }).select(messengerUserSelect);
    await Promise.allSettled(admins.map((admin) => sendMessengerNotification(admin,
      `📋 <b>ارزیابی جدید پروژه</b>\nعنوان: <b>${escapeHtml(String(data.projectTitle).slice(0, 100))}</b>\nمشتری: ${escapeHtml(String(data.customerCompany).slice(0, 100))}\nفرم برای بررسی و تأیید در پنل مدیریت آماده است.`)));
  }
  return Response.json({ success: true, assessment });
}

export async function DELETE(req, { params }) {
  await ConnectDb();
  const user = await getCurrentUser();
  const { assessmentId } = await params;
  if (!user) return Response.json({ success: false, message: "نشست شما منقضی شده است؛ دوباره وارد شوید." }, { status: 401 });
  if (!isValidObjectId(assessmentId)) return Response.json({ success: false, message: "شناسه فرم معتبر نیست" }, { status: 400 });

  const isAdmin = user.role === "admin";
  const isAgent = ["passive_agent", "active_agent"].includes(user.role);
  if (!isAdmin && !isAgent) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });

  const filter = isAdmin
    ? { _id: assessmentId, project: null }
    : { _id: assessmentId, assignee: user._id, project: null, status: { $in: ["assigned", "in_progress"] } };
  const assessment = await ProjectAssessment.findOneAndDelete(filter);
  if (!assessment) {
    return Response.json({ success: false, message: "فرم پیدا نشد یا امکان حذف آن وجود ندارد" }, { status: 404 });
  }

  const attachmentDirectory = path.join(process.cwd(), "storage", "project-assessments");
  await Promise.allSettled((assessment.attachments || [])
    .map((attachment) => attachment?.path && path.join(attachmentDirectory, path.basename(attachment.path)))
    .filter(Boolean)
    .map((filePath) => unlink(filePath)));
  return Response.json({ success: true, message: "ارزیابی حذف شد" });
}
