import Organization from "@/models/organizations";
import User from "@/models/users";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";

const phonePattern = /^09\d{9}$/;

function cleanEquipment(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.name?.trim())
    .slice(0, 200)
    .map((item) => ({
      name: item.name.trim(),
      type: String(item.type || "").trim(),
      serial: String(item.serial || "").trim(),
      status: ["active", "repair", "retired"].includes(item.status) ? item.status : "active",
    }));
}

function cleanContract(contract = {}) {
  return {
    title: String(contract.title || "قرارداد پشتیبانی").trim(),
    level: ["basic", "standard", "premium"].includes(contract.level) ? contract.level : "standard",
    status: ["active", "expiring", "expired", "draft"].includes(contract.status) ? contract.status : "active",
    startAt: contract.startAt || null,
    endAt: contract.endAt || null,
    monthlyHours: Math.max(0, Number(contract.monthlyHours) || 0),
    notes: String(contract.notes || "").trim(),
  };
}

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export async function GET() {
  try {
    await ConnectDb();
    if (!(await requireAdmin())) return Response.json({ success: false, message: "Forbidden" }, { status: 403 });

    const [organizations, customers] = await Promise.all([
      Organization.find()
        .populate("manager", "name phone lastLoginAt")
        .populate("members", "name phone lastLoginAt")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "customer" }).select("name phone organization lastLoginAt").sort({ name: 1 }).lean(),
    ]);
    const memberIds = organizations.flatMap((organization) => organization.members.map((member) => member._id));
    const ticketCounts = memberIds.length
      ? await Ticket.aggregate([{ $match: { creator: { $in: memberIds } } }, { $group: { _id: "$creator", count: { $sum: 1 } } }])
      : [];
    const countMap = new Map(ticketCounts.map((row) => [row._id.toString(), row.count]));

    return Response.json({
      success: true,
      organizations: organizations.map((organization) => ({
        ...organization,
        ticketCount: organization.members.reduce((sum, member) => sum + (countMap.get(member._id.toString()) || 0), 0),
      })),
      customers,
    });
  } catch (error) {
    console.error("ORGANIZATIONS GET ERROR", error);
    return Response.json({ success: false, message: "دریافت سازمان‌ها ناموفق بود" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ConnectDb();
    if (!(await requireAdmin())) return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase();
    const managerName = String(body.managerName || "").trim();
    const managerPhone = String(body.managerPhone || "").trim();
    const memberIds = [...new Set(Array.isArray(body.memberIds) ? body.memberIds.filter(isValidObjectId) : [])];
    if (!name || !code || !managerName || !phonePattern.test(managerPhone)) {
      return Response.json({ success: false, message: "نام، کد، نام مدیر و شماره موبایل معتبر الزامی است" }, { status: 400 });
    }
    if (await Organization.exists({ code })) return Response.json({ success: false, message: "کد سازمان تکراری است" }, { status: 409 });

    let manager = await User.findOne({ phone: managerPhone });
    if (manager && !["customer", "organization_manager"].includes(manager.role)) {
      return Response.json({ success: false, message: "این شماره متعلق به کاربری با نقش غیرمجاز است" }, { status: 409 });
    }
    if (manager?.organization) return Response.json({ success: false, message: "این مدیر قبلاً به سازمان دیگری متصل شده است" }, { status: 409 });
    if (!manager) manager = await User.create({ name: managerName, phone: managerPhone, role: "organization_manager", isVerify: true });
    else { manager.name = managerName; manager.role = "organization_manager"; manager.isVerify = true; await manager.save(); }

    const members = await User.find({ _id: { $in: memberIds }, role: "customer", organization: null }).select("_id");
    if (members.length !== memberIds.length) return Response.json({ success: false, message: "یک یا چند کارمند قبلاً عضو سازمان دیگری هستند" }, { status: 409 });
    const organization = await Organization.create({
      name,
      code,
      manager: manager._id,
      members: members.map((member) => member._id),
      supportContract: cleanContract(body.supportContract),
      equipment: cleanEquipment(body.equipment),
    });
    manager.organization = organization._id;
    await manager.save();
    await User.updateMany({ _id: { $in: organization.members } }, { $set: { organization: organization._id } });

    return Response.json({ success: true, message: "پرتال سازمان با موفقیت ساخته شد", organization }, { status: 201 });
  } catch (error) {
    console.error("ORGANIZATIONS POST ERROR", error);
    return Response.json({ success: false, message: error?.code === 11000 ? "مدیر یا کد سازمان تکراری است" : "ساخت سازمان ناموفق بود" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    await ConnectDb();
    if (!(await requireAdmin())) return Response.json({ success: false, message: "Forbidden" }, { status: 403 });
    const body = await req.json();
    if (!isValidObjectId(body.organizationId)) return Response.json({ success: false, message: "شناسه سازمان نامعتبر است" }, { status: 400 });
    const organization = await Organization.findById(body.organizationId);
    if (!organization) return Response.json({ success: false, message: "سازمان پیدا نشد" }, { status: 404 });

    const memberIds = [...new Set(Array.isArray(body.memberIds) ? body.memberIds.filter(isValidObjectId) : [])];
    const members = await User.find({ _id: { $in: memberIds }, role: "customer", $or: [{ organization: null }, { organization: organization._id }] }).select("_id");
    if (members.length !== memberIds.length) return Response.json({ success: false, message: "یک یا چند کارمند عضو سازمان دیگری هستند" }, { status: 409 });
    const previousMembers = organization.members;
    organization.name = String(body.name || organization.name).trim();
    organization.members = members.map((member) => member._id);
    organization.supportContract = cleanContract(body.supportContract);
    organization.equipment = cleanEquipment(body.equipment);
    organization.isActive = body.isActive !== false;
    await organization.save();
    await User.updateMany({ _id: { $in: previousMembers }, organization: organization._id }, { $set: { organization: null } });
    await User.updateMany({ _id: { $in: organization.members } }, { $set: { organization: organization._id } });
    return Response.json({ success: true, message: "اطلاعات سازمان به‌روزرسانی شد", organization });
  } catch (error) {
    console.error("ORGANIZATIONS PATCH ERROR", error);
    return Response.json({ success: false, message: "ویرایش سازمان ناموفق بود" }, { status: 500 });
  }
}
