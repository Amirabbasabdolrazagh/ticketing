import Organization from "@/models/organizations";
import User from "@/models/users";
import Ticket from "@/models/tickets";
import getCurrentUser from "@/utils/auth";
import ConnectDb from "@/utils/connectDB";
import { isValidObjectId } from "mongoose";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { parseJalaliDate } from "@/utils/jalaliDate";

const phonePattern = /^09\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function organizationNameToken(name) {
  const latinToken = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  if (latinToken.length >= 2) return latinToken.padEnd(4, "X");

  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)) % 1679616;
  return hash.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

async function generateOrganizationCode(name) {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(-2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  const nameToken = organizationNameToken(name);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(2).toString("hex").toUpperCase();
    const code = `ORG-${nameToken}-${date}-${suffix}`;
    if (!(await Organization.exists({ code }))) return code;
  }
  throw new Error("ORGANIZATION_CODE_GENERATION_FAILED");
}

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
  const parseContractDate = (value) => {
    if (!value) return null;
    const jalaliDate = parseJalaliDate(value);
    if (jalaliDate) return jalaliDate;
    const legacyDate = new Date(value);
    return Number.isNaN(legacyDate.getTime()) ? null : legacyDate;
  };
  return {
    title: String(contract.title || "قرارداد پشتیبانی").trim(),
    level: ["basic", "standard", "premium"].includes(contract.level) ? contract.level : "standard",
    status: ["active", "expiring", "expired", "draft"].includes(contract.status) ? contract.status : "active",
    startAt: parseContractDate(contract.startAt),
    endAt: parseContractDate(contract.endAt),
    notes: String(contract.notes || "").trim(),
    features: {
      onsiteService: Boolean(contract.features?.onsiteService),
      secureCall: Boolean(contract.features?.secureCall),
      remoteSupport: Boolean(contract.features?.remoteSupport),
      prioritySupport: Boolean(contract.features?.prioritySupport),
    },
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
        .populate("manager", "name phone email lastLoginAt")
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
    const managerName = String(body.managerName || "").trim();
    const managerPhone = String(body.managerPhone || "").trim();
    const managerEmail = String(body.managerEmail || "").trim().toLowerCase();
    const managerPassword = String(body.managerPassword || "");
    const memberIds = [...new Set(Array.isArray(body.memberIds) ? body.memberIds.filter(isValidObjectId) : [])];
    const supportContract = cleanContract(body.supportContract);
    if (!name || !managerName || !phonePattern.test(managerPhone)) {
      return Response.json({ success: false, message: "نام سازمان، نام مدیر و شماره موبایل معتبر الزامی است" }, { status: 400 });
    }
    if (managerEmail && !emailPattern.test(managerEmail)) {
      return Response.json({ success: false, message: "ایمیل مدیر سازمان معتبر نیست" }, { status: 400 });
    }
    if (!passwordPattern.test(managerPassword)) {
      return Response.json({ success: false, message: "رمز باید حداقل ۸ کاراکتر و شامل حرف بزرگ، حرف کوچک، عدد و نماد باشد" }, { status: 400 });
    }
    if ((body.supportContract?.startAt && !supportContract.startAt) || (body.supportContract?.endAt && !supportContract.endAt)) {
      return Response.json({ success: false, message: "تاریخ قرارداد را به‌صورت شمسی و با الگوی ۱۴۰۵/۰۷/۲۴ وارد کنید" }, { status: 400 });
    }
    if (supportContract.startAt && supportContract.endAt && supportContract.endAt < supportContract.startAt) {
      return Response.json({ success: false, message: "تاریخ پایان قرارداد نمی‌تواند قبل از تاریخ شروع باشد" }, { status: 400 });
    }
    if (managerEmail && await User.exists({ email: managerEmail, phone: { $ne: managerPhone } })) {
      return Response.json({ success: false, message: "این ایمیل قبلاً برای کاربر دیگری ثبت شده است" }, { status: 409 });
    }

    let manager = await User.findOne({ phone: managerPhone }).select("+password");
    if (manager && !["customer", "organization_manager"].includes(manager.role)) {
      return Response.json({ success: false, message: "این شماره متعلق به کاربری با نقش غیرمجاز است" }, { status: 409 });
    }
    if (manager?.organization) return Response.json({ success: false, message: "این مدیر قبلاً به سازمان دیگری متصل شده است" }, { status: 409 });
    if (manager && memberIds.includes(manager._id.toString())) {
      return Response.json({ success: false, message: "مدیر سازمان را نمی‌توان هم‌زمان به‌عنوان کارمند انتخاب کرد" }, { status: 400 });
    }

    const members = await User.find({ _id: { $in: memberIds }, role: "customer", organization: null }).select("_id");
    if (members.length !== memberIds.length) return Response.json({ success: false, message: "یک یا چند کارمند قبلاً عضو سازمان دیگری هستند" }, { status: 409 });

    const code = await generateOrganizationCode(name);
    const hashedPassword = await bcrypt.hash(managerPassword, 12);
    if (!manager) {
      manager = await User.create({
        name: managerName,
        phone: managerPhone,
        ...(managerEmail ? { email: managerEmail } : {}),
        password: hashedPassword,
        role: "organization_manager",
        isVerify: true,
      });
    } else {
      manager.name = managerName;
      manager.role = "organization_manager";
      manager.isVerify = true;
      manager.password = hashedPassword;
      if (managerEmail) manager.email = managerEmail;
      await manager.save();
    }

    const organization = await Organization.create({
      name,
      code,
      manager: manager._id,
      members: members.map((member) => member._id),
      supportContract,
      equipment: cleanEquipment(body.equipment),
    });
    manager.organization = organization._id;
    await manager.save();
    await User.updateMany({ _id: { $in: organization.members } }, { $set: { organization: organization._id } });

    return Response.json({ success: true, message: "پرتال سازمان با موفقیت ساخته شد", organization }, { status: 201 });
  } catch (error) {
    console.error("ORGANIZATIONS POST ERROR", error);
    return Response.json({ success: false, message: error?.code === 11000 ? "شماره، ایمیل مدیر یا کد سازمان تکراری است" : "ساخت سازمان ناموفق بود" }, { status: 500 });
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
    const supportContract = cleanContract(body.supportContract);
    if ((body.supportContract?.startAt && !supportContract.startAt) || (body.supportContract?.endAt && !supportContract.endAt)) {
      return Response.json({ success: false, message: "تاریخ قرارداد را به‌صورت شمسی و با الگوی ۱۴۰۵/۰۷/۲۴ وارد کنید" }, { status: 400 });
    }
    if (supportContract.startAt && supportContract.endAt && supportContract.endAt < supportContract.startAt) {
      return Response.json({ success: false, message: "تاریخ پایان قرارداد نمی‌تواند قبل از تاریخ شروع باشد" }, { status: 400 });
    }

    const memberIds = [...new Set(Array.isArray(body.memberIds) ? body.memberIds.filter(isValidObjectId) : [])];
    const members = await User.find({ _id: { $in: memberIds }, role: "customer", $or: [{ organization: null }, { organization: organization._id }] }).select("_id");
    if (members.length !== memberIds.length) return Response.json({ success: false, message: "یک یا چند کارمند عضو سازمان دیگری هستند" }, { status: 409 });
    const previousMembers = organization.members;
    organization.name = String(body.name || organization.name).trim();
    organization.members = members.map((member) => member._id);
    // Preserve independently configured SLA rules when updating basic contract details.
    const existingSlaPolicy = organization.supportContract?.slaPolicy?.toObject?.() || organization.supportContract?.slaPolicy;
    organization.supportContract = { ...supportContract, ...(existingSlaPolicy ? { slaPolicy: existingSlaPolicy } : {}) };
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
