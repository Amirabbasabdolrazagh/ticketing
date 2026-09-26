import Project from "@/models/projects";
import ProjectCounter from "@/models/projectCounter";
import Ticket from "@/models/tickets";
import User from "@/models/users";

export const DEFAULT_SERVICES = [
  {
    name: "سرور و شبکه",
    code: "NET",
    priority: "high",
    description: "سرورها، شبکه، اینترنت، مجازی‌سازی، ذخیره‌سازی و سرویس‌های زیرساختی",
    subcategories: ["اینترنت، ارتباطات و قطعی شبکه", "شبکه کابلی، بی‌سیم و تجهیزات پسیو", "روتر، سوئیچ و تجهیزات اکتیو", "VPN، فایروال و دسترسی راه دور", "DNS، DHCP، IP و سرویس‌های شبکه", "سرورهای ویندوزی و لینوکسی", "مجازی‌سازی، ماشین مجازی و کلاستر", "ذخیره‌سازی، بکاپ و بازیابی", "مانیتورینگ، دیتاسنتر و سرویس‌های ابری"],
    keywords: ["سرور", "server", "شبکه", "network", "اینترنت", "internet", "اینترانت", "وای فای", "وای‌فای", "wifi", "wireless", "lan", "wan", "vpn", "dns", "dhcp", "ip", "gateway", "گیت وی", "پینگ", "ping", "پکت", "packet", "latency", "کندی شبکه", "قطعی", "قطع ارتباط", "روتر", "router", "مودم", "modem", "سوئیچ", "سوییچ", "switch", "اکسس پوینت", "access point", "رک", "کابل", "کابل کشی", "پچ پنل", "فیبر", "fiber", "فایروال", "firewall", "پورت شبکه", "nat", "vlan", "mikrotik", "میکروتیک", "مجازی", "ماشین مجازی", "virtual machine", "vm", "vmware", "esxi", "vcenter", "hyper-v", "hypervisor", "هایپروایزر", "کلاستر", "cluster", "دیتاسنتر", "data center", "هاست", "host", "دامین", "domain", "active directory", "اکتیو دایرکتوری", "windows server", "لینوکس", "linux", "storage", "ذخیره سازی", "ذخیره‌سازی", "san", "nas", "raid", "بکاپ", "backup", "restore", "بازیابی", "ریکاوری", "disaster recovery", "مانیتورینگ", "monitoring", "zabbix", "cloud", "ابر"],
  },
  {
    name: "کلاینت و تجهیزات کاربران",
    code: "CLT",
    priority: "medium",
    description: "رایانه‌ها، لپ‌تاپ‌ها، سیستم‌عامل و تجهیزات جانبی کاربران",
    subcategories: ["رایانه رومیزی، لپ‌تاپ و تین‌کلاینت", "قطعات سخت‌افزاری و ارتقا", "مانیتور، کیبورد، ماوس و تجهیزات جانبی", "پرینتر، اسکنر و تجهیزات اداری", "سیستم‌عامل، درایور و راه‌اندازی دستگاه", "کندی، روشن‌نشدن و خطاهای سخت‌افزاری", "موبایل، تبلت، وب‌کم و تجهیزات صوتی", "نصب و جابه‌جایی ایستگاه کاری"],
    keywords: ["کلاینت", "client", "کامپیوتر", "رایانه", "pc", "کیس", "case", "لپ تاپ", "لپ‌تاپ", "laptop", "نوت بوک", "notebook", "تین کلاینت", "thin client", "سخت افزار", "سخت‌افزار", "hardware", "مادربرد", "motherboard", "پردازنده", "رم", "هارد", "ssd", "پاور", "فن", "گرم شدن", "مانیتور", "monitor", "نمایشگر", "کیبورد", "keyboard", "موس", "ماوس", "mouse", "وب کم", "webcam", "هدست", "headset", "میکروفن", "اسپیکر", "پرینتر", "چاپگر", "printer", "اسکنر", "scanner", "کپی", "تونر", "کارتریج", "چاپ", "پرینت", "صف چاپ", "spooler", "فلش", "usb", "بلوتوث", "bluetooth", "hdmi", "vga", "displayport", "داک", "dock", "ویندوز", "windows", "سیستم عامل", "operating system", "درایور", "driver", "device manager", "بوت", "boot", "روشن نمی", "خاموش می", "هنگ", "کندی سیستم", "موبایل", "mobile", "تبلت", "tablet", "تجهیزات کاربر", "ایستگاه کاری", "workstation"],
  },
  {
    name: "نرم‌افزارها",
    code: "SWR",
    priority: "medium",
    description: "نصب، دسترسی، مجوز و رفع اشکال نرم‌افزارها و سامانه‌های سازمانی",
    subcategories: ["نصب، حذف و به‌روزرسانی نرم‌افزار", "فعال‌سازی، مجوز و لایسنس", "نرم‌افزارهای اداری و Microsoft Office", "ایمیل، مرورگر و ابزارهای ارتباطی", "سامانه‌ها و اتوماسیون سازمانی", "حساب کاربری، رمز عبور و دسترسی برنامه", "خطا، کندی، توقف و ناسازگاری برنامه", "پایگاه داده و گزارش‌های نرم‌افزاری", "آنتی‌ویروس و ابزارهای امنیتی کاربر"],
    keywords: ["نرم افزار", "نرم‌افزار", "software", "برنامه", "اپلیکیشن", "application", "اپ", "نصب", "install", "حذف برنامه", "uninstall", "آپدیت", "به روز رسانی", "به‌روزرسانی", "update", "لایسنس", "license", "مجوز", "فعال سازی", "فعال‌سازی", "activation", "نسخه", "ورژن", "version", "آفیس", "office", "ورد", "word", "اکسل", "excel", "پاورپوینت", "powerpoint", "اکسس", "access", "pdf", "adobe", "فتوشاپ", "ایمیل", "email", "اوتلوک", "outlook", "مرورگر", "browser", "کروم", "chrome", "فایرفاکس", "firefox", "تیمز", "teams", "اتوماسیون", "سامانه", "پرتال", "پورتال", "نرم افزار سازمانی", "erp", "crm", "حسابداری", "حقوق", "حضور و غیاب", "نام کاربری", "حساب کاربری", "رمز عبور", "پسورد", "password", "ورود به برنامه", "لاگین", "login", "سطح دسترسی", "خطای برنامه", "ارور", "error", "باز نمی شود", "باز نمیشه", "اجرا نمی شود", "اجرا نمیشه", "کرش", "crash", "ناسازگار", "compatibility", "دیتابیس", "database", "sql", "گزارش", "report", "آنتی ویروس", "آنتی‌ویروس", "antivirus", "فیشینگ", "phishing", "ویروس", "بدافزار"],
  },
];

export const DEFAULT_SERVICE_CODES = DEFAULT_SERVICES.map(({ code }) => code);
const LEGACY_SERVICE_CODES = ["SEC", "SRV", "SUP"];

function normalize(value = "") {
  return value.toLowerCase().replaceAll("ي", "ی").replaceAll("ك", "ک").replace(/[\u200c\s_-]+/g, " ").trim();
}

function pickService(title, services) {
  const normalizedTitle = normalize(title);
  let bestService = null;
  let bestScore = 0;
  for (const service of services) {
    const terms = [service.name, ...(service.subcategories || []), ...(service.keywords || [])];
    const score = terms.reduce((total, term) => {
      const normalizedTerm = normalize(term);
      return total + (normalizedTerm && normalizedTitle.includes(normalizedTerm) ? normalizedTerm.length : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestService = service;
    }
  }
  return bestService || services.find((service) => service.code === "CLT") || services[0] || null;
}

export async function ensureDefaultServices(ownerId) {
  const hamid = await User.findOne({ role: "agent", name: { $regex: /حمید|hamid/i } }).select("_id");

  for (const service of DEFAULT_SERVICES) {
    await Project.findOneAndUpdate(
      { code: service.code },
      { $set: { ...service, status: "active" }, $setOnInsert: { owner: ownerId, defaultAgent: hamid?._id || null } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (hamid) {
      await Project.updateOne({ code: service.code, defaultAgent: null }, { $set: { defaultAgent: hamid._id } });
    }
  }

  const coreServices = await Project.find({ code: { $in: DEFAULT_SERVICE_CODES } }).lean();
  const obsoleteServices = await Project.find({ code: { $in: LEGACY_SERVICE_CODES } }).select("_id").lean();
  const obsoleteIds = obsoleteServices.map((item) => item._id);
  const tickets = await Ticket.find({
    $or: [
      { project: { $in: obsoleteIds } },
      { project: null },
      { project: { $exists: false } },
    ],
  }).select("title").lean();
  await Promise.all(tickets.map((ticket) => {
    const target = pickService(ticket.title, coreServices);
    return target ? Ticket.updateOne({ _id: ticket._id }, { $set: { project: target._id } }) : null;
  }));
  if (obsoleteServices.length) {
    await ProjectCounter.deleteMany({ project: { $in: obsoleteIds } });
    await Project.deleteMany({ _id: { $in: obsoleteIds } });
  }
}

export async function classifyService(title) {
  const services = await Project.find({ code: { $in: DEFAULT_SERVICE_CODES }, status: "active" }).lean();
  return pickService(title, services);
}
