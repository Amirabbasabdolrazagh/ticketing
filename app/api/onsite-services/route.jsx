import OnsiteServiceRequest from "@/models/onsiteServiceRequests";
import Organization from "@/models/organizations";
import User from "@/models/users";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { parseJalaliDate } from "@/utils/jalaliDate";
import { isValidObjectId } from "mongoose";

const supportRoles = ["agent", "passive_agent", "active_agent"];
const phonePattern = /^09\d{9}$/;
const agentTransitions = {
  scheduled: ["accepted"],
  accepted: ["en_route"],
  en_route: ["arrived"],
  arrived: ["in_progress"],
  in_progress: ["paused", "awaiting_customer_confirmation", "revisit_required"],
  paused: ["in_progress"],
  revisit_required: ["awaiting_schedule"],
};

async function organizationForManager(user) {
  return Organization.findOne({
    isActive: true,
    $or: [{ manager: user._id }, { _id: user.organization }],
  });
}

function activeFeature(organization, feature) {
  const contract = organization?.supportContract;
  const now = new Date();
  return Boolean(
    contract?.status === "active"
    && contract?.features?.[feature]
    && (!contract.startAt || contract.startAt <= now)
    && (!contract.endAt || contract.endAt >= now),
  );
}

function requestCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `OS-${date}-${crypto.randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase()}`;
}

function scheduledDate(date, time = "09:00") {
  const parsed = parseJalaliDate(date);
  if (!parsed || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(":").map(Number);
  parsed.setUTCHours(hours - 3, minutes - 30, 0, 0);
  return parsed;
}

function populated(query) {
  return query
    .populate("organization", "name code supportContract")
    .populate("requester", "name phone")
    .populate("assignedAgent", "name phone role pbxExtension");
}

export async function GET() {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user) return Response.json({ success: false, message: "ابتدا وارد حساب شوید" }, { status: 401 });

    let filter;
    if (user.role === "admin") filter = {};
    else if (user.role === "organization_manager") {
      const organization = await organizationForManager(user);
      if (!organization || !activeFeature(organization, "onsiteService")) return Response.json({ success: false, message: "خدمات حضوری در قرارداد فعال سازمان شما وجود ندارد" }, { status: 403 });
      filter = { organization: organization._id };
    } else if (supportRoles.includes(user.role)) filter = { assignedAgent: user._id };
    else return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });

    const [requests, agents] = await Promise.all([
      populated(OnsiteServiceRequest.find(filter).sort({ createdAt: -1 })).lean(),
      user.role === "admin" ? User.find({ role: { $in: supportRoles } }).select("name phone role").sort({ name: 1 }).lean() : [],
    ]);
    return Response.json({ success: true, requests, agents });
  } catch (error) {
    console.error("ONSITE SERVICES GET ERROR", error);
    return Response.json({ success: false, message: "دریافت درخواست‌های حضوری ناموفق بود" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    if (!user || user.role !== "organization_manager") return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
    const organization = await organizationForManager(user);
    if (!organization || !activeFeature(organization, "onsiteService")) return Response.json({ success: false, message: "خدمات حضوری در قرارداد فعال سازمان شما وجود ندارد" }, { status: 403 });

    const body = await req.json();
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const address = String(body.address || "").trim();
    const contactName = String(body.contactName || "").trim();
    const contactPhone = String(body.contactPhone || "").trim();
    if (!title || !description || !address || !contactName || !phonePattern.test(contactPhone)) {
      return Response.json({ success: false, message: "عنوان، شرح، آدرس و اطلاعات معتبر شخص حاضر در محل الزامی است" }, { status: 400 });
    }
    const preferredDate = body.preferredDate ? parseJalaliDate(body.preferredDate) : null;
    if (body.preferredDate && !preferredDate) return Response.json({ success: false, message: "تاریخ پیشنهادی را به‌صورت شمسی وارد کنید" }, { status: 400 });
    const equipment = isValidObjectId(body.equipmentId) ? organization.equipment.id(body.equipmentId) : null;

    let code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = requestCode();
      if (!(await OnsiteServiceRequest.exists({ requestNumber: candidate }))) { code = candidate; break; }
    }
    if (!code) return Response.json({ success: false, message: "ساخت شماره درخواست ناموفق بود" }, { status: 503 });

    const created = await OnsiteServiceRequest.create({
      requestNumber: code,
      organization: organization._id,
      requester: user._id,
      title,
      description,
      address,
      serviceType: String(body.serviceType || "پشتیبانی فنی حضوری").trim(),
      priority: ["low", "medium", "high", "urgent"].includes(body.priority) ? body.priority : "medium",
      onsiteContact: { name: contactName, phone: contactPhone },
      equipment: equipment ? { id: equipment._id, name: equipment.name, serial: equipment.serial } : undefined,
      preferredDate,
      preferredPeriod: ["morning", "afternoon", "evening", "flexible"].includes(body.preferredPeriod) ? body.preferredPeriod : "flexible",
    });
    const result = await populated(OnsiteServiceRequest.findById(created._id)).lean();
    return Response.json({ success: true, message: "درخواست خدمات حضوری ثبت شد", request: result }, { status: 201 });
  } catch (error) {
    console.error("ONSITE SERVICES POST ERROR", error);
    return Response.json({ success: false, message: "ثبت درخواست خدمات حضوری ناموفق بود" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await ConnectDb();
    const user = await getCurrentUser();
    const body = await req.json();
    if (!user || !isValidObjectId(body.requestId)) return Response.json({ success: false, message: "درخواست معتبر نیست" }, { status: 400 });
    const onsite = await OnsiteServiceRequest.findById(body.requestId);
    if (!onsite) return Response.json({ success: false, message: "درخواست پیدا نشد" }, { status: 404 });

    if (user.role === "admin") {
      if (body.assignedAgent) {
        const agent = await User.findOne({ _id: body.assignedAgent, role: { $in: supportRoles } });
        if (!agent) return Response.json({ success: false, message: "کارشناس انتخاب‌شده معتبر نیست" }, { status: 400 });
        onsite.assignedAgent = agent._id;
      }
      if (body.scheduleDate) {
        const date = scheduledDate(body.scheduleDate, body.scheduleTime);
        if (!date) return Response.json({ success: false, message: "تاریخ یا ساعت مراجعه معتبر نیست" }, { status: 400 });
        onsite.scheduledAt = date;
      }
      if (body.estimatedDurationMinutes !== undefined) onsite.estimatedDurationMinutes = Math.max(0, Math.min(1440, Number(body.estimatedDurationMinutes) || 0));
      if (body.status && ["awaiting_schedule", "scheduled", "cancelled"].includes(body.status)) onsite.status = body.status;
      if (onsite.assignedAgent && onsite.scheduledAt && !["cancelled", "completed"].includes(onsite.status)) onsite.status = "scheduled";
      if (body.cancellationReason !== undefined) onsite.cancellationReason = String(body.cancellationReason || "").trim();
    } else if (supportRoles.includes(user.role) && onsite.assignedAgent?.toString() === user._id.toString()) {
      const nextStatus = String(body.status || "");
      if (!agentTransitions[onsite.status]?.includes(nextStatus)) return Response.json({ success: false, message: "تغییر وضعیت مجاز نیست" }, { status: 409 });
      const now = new Date();
      const timeKey = { accepted: "acceptedAt", en_route: "enRouteAt", arrived: "arrivedAt", in_progress: "startedAt", paused: "pausedAt", awaiting_customer_confirmation: "completedAt" }[nextStatus];
      if (timeKey && !onsite.activityTimes[timeKey]) onsite.activityTimes[timeKey] = now;
      if (nextStatus === "awaiting_customer_confirmation") {
        const report = body.workReport || {};
        if (!String(report.actions || "").trim() || !String(report.result || "").trim()) return Response.json({ success: false, message: "اقدامات انجام‌شده و نتیجه نهایی الزامی است" }, { status: 400 });
        onsite.workReport = {
          diagnosis: String(report.diagnosis || "").trim(), actions: String(report.actions || "").trim(), result: String(report.result || "").trim(),
          parts: String(report.parts || "").trim(), notes: String(report.notes || "").trim(), followUpRequired: Boolean(report.followUpRequired),
          durationMinutes: Math.max(0, Number(report.durationMinutes) || (onsite.activityTimes.startedAt ? Math.round((now - onsite.activityTimes.startedAt) / 60000) : 0)),
        };
        onsite.customerApproval.status = "pending";
      }
      onsite.status = nextStatus;
    } else if (user.role === "organization_manager") {
      const organization = await organizationForManager(user);
      if (!organization || onsite.organization.toString() !== organization._id.toString() || !activeFeature(organization, "onsiteService")) return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });
      if (onsite.status !== "awaiting_customer_confirmation" || !["approved", "rejected"].includes(body.approval)) return Response.json({ success: false, message: "این گزارش آماده تأیید نیست" }, { status: 409 });
      onsite.customerApproval = { status: body.approval, note: String(body.note || "").trim(), approvedAt: new Date(), approvedBy: user._id };
      onsite.status = body.approval === "approved" ? "completed" : "revisit_required";
    } else return Response.json({ success: false, message: "دسترسی غیرمجاز" }, { status: 403 });

    await onsite.save();
    const result = await populated(OnsiteServiceRequest.findById(onsite._id)).lean();
    return Response.json({ success: true, message: "درخواست خدمات حضوری به‌روزرسانی شد", request: result });
  } catch (error) {
    console.error("ONSITE SERVICES PATCH ERROR", error);
    return Response.json({ success: false, message: "به‌روزرسانی درخواست ناموفق بود" }, { status: 500 });
  }
}
