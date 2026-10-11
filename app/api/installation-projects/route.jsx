import InstallationProject from "@/models/installationProjects";
import ProjectAssessment from "@/models/projectAssessments";
import ProjectHandover from "@/models/projectHandovers";
import User from "@/models/users";
import ConnectDb from "@/utils/connectDB";
import getCurrentUser from "@/utils/auth";
import authorization from "@/utils/authorization";
import { messengerUserSelect, sendMessengerNotification } from "@/utils/messenger";
import { isValidObjectId } from "mongoose";

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function createProjectCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase();
  return `ITR-NET-${date}-${suffix}`;
}

export async function GET() {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const projects = await InstallationProject.find({}).populate("passiveAgent", "name phone").populate("activeAgent", "name phone").sort({ createdAt: -1 }).lean();
  return Response.json({ success: true, projects });
}

export async function POST(req) {
  await ConnectDb();
  const user = await getCurrentUser();
  if (!user || !authorization(user, ["admin"])) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
  const { name, customerName, location, description, passiveAgent, activeAgent, assessmentId } = await req.json();
  if (typeof name !== "string" || !name.trim() || name.trim().length > 100 || (!passiveAgent && !activeAgent)) return Response.json({ success: false, message: "نام پروژه و انتخاب حداقل یک پشتیبان الزامی است" }, { status: 400 });
  if ([passiveAgent, activeAgent].some((id) => id && !isValidObjectId(id))) return Response.json({ success: false, message: "شناسه پشتیبان معتبر نیست" }, { status: 400 });
  let sourceAssessment = null;
  if (assessmentId) {
    if (!isValidObjectId(assessmentId)) return Response.json({ success: false, message: "شناسه ارزیابی معتبر نیست" }, { status: 400 });
    sourceAssessment = await ProjectAssessment.findOne({ _id: assessmentId, project: null, status: "submitted" });
    if (!sourceAssessment) return Response.json({ success: false, message: "ارزیابی ارسالی پیدا نشد یا قبلاً تأیید شده است" }, { status: 409 });
  }
  let normalizedCode;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = createProjectCode();
    // A random suffix makes collisions extremely unlikely; this query makes it deterministic too.
    if (!(await InstallationProject.exists({ code: candidate }))) {
      normalizedCode = candidate;
      break;
    }
  }
  if (!normalizedCode) return Response.json({ success: false, message: "ساخت کد یکتای پروژه ناموفق بود؛ دوباره تلاش کنید" }, { status: 503 });
  const eligibleRoles = ["passive_agent", "active_agent"];
  const [passive, active] = await Promise.all([passiveAgent ? User.findOne({ _id: passiveAgent, role: { $in: eligibleRoles } }).select(`name ${messengerUserSelect}`) : null, activeAgent ? User.findOne({ _id: activeAgent, role: { $in: eligibleRoles } }).select(`name ${messengerUserSelect}`) : null]);
  if ((passiveAgent && !passive) || (activeAgent && !active)) return Response.json({ success: false, message: "کارشناس انتخاب‌شده معتبر نیست" }, { status: 400 });
  let project;
  try {
    project = await InstallationProject.create({ name: String(name).trim(), customerName: String(customerName || "").trim(), location: String(location || "").trim(), description: String(description || "").trim(), code: normalizedCode, owner: user._id, passiveAgent: passive?._id || null, activeAgent: active?._id || null, ...(sourceAssessment ? { originAssessment: sourceAssessment._id } : {}) });
  } catch (error) {
    if (error.code === 11000 && sourceAssessment) return Response.json({ success: false, message: "این ارزیابی قبلاً به پروژه تبدیل شده است" }, { status: 409 });
    throw error;
  }
  if (sourceAssessment) await ProjectAssessment.updateOne({ _id: sourceAssessment._id, project: null }, { $set: { project: project._id, status: "reviewed", reviewedAt: new Date(), reviewedBy: user._id } });
  for (const [agent, role] of [[passive, "passive_agent"], [active, "active_agent"]]) if (agent) {
    await ProjectAssessment.findOneAndUpdate({ project: project._id, assignee: agent._id, assigneeRole: role }, { $setOnInsert: { project: project._id, assignee: agent._id, assigneeRole: role } }, { upsert: true, returnDocument: "after" });
    await ProjectHandover.findOneAndUpdate({ project: project._id, assignee: agent._id, assigneeRole: role }, { $setOnInsert: { project: project._id, assignee: agent._id, assigneeRole: role } }, { upsert: true, returnDocument: "after" });
  }
  await Promise.allSettled([[passive, "پسیو"], [active, "اکتیو"]].filter(([agent]) => agent).map(([agent, label]) => sendMessengerNotification(agent, ["📁 <b>ارجاع پروژه جدید</b>", "", `پروژه: <b>${escapeHtml(project.name)}</b>`, `کد پروژه: <b>${escapeHtml(project.code)}</b>`, `نقش شما: کارشناس ${label}`, "اطلاعات پروژه و ابلاغ‌های احتمالی را در سامانه پشتیبانی ای‌تی رسام بررسی کنید."].join("\n"))));
  return Response.json({ success: true, project }, { status: 201 });
}
