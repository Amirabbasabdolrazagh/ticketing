const present = (value) => typeof value === "string" ? Boolean(value.trim()) : value !== null && value !== undefined && value !== "";

const selected = (value = {}) => Object.entries(value).some(([key, checked]) => key !== "other" && key !== "otherEnabled" && checked)
  || (value.otherEnabled && present(value.other));

const completeRow = (rows, fields) => Object.values(rows || {}).some((row) => fields.every((key) => present(row?.[key])));

const missingFields = (data, fields) => fields.filter(([key]) => !present(data[key])).map(([path, label]) => ({ path, message: `${label} الزامی است.` }));

export function assessmentErrors(data = {}, { standalone = false } = {}) {
  const errors = [];
  if (standalone) {
    errors.push(...missingFields(data, [["projectTitle", "عنوان پروژه"]]));
  }
  const requiredGroups = [
    [["customerCompany", "نام شرکت / مجموعه"], ["customerManager", "نام مدیر / مسئول"], ["customerRole", "سمت مسئول"], ["customerPhone", "شماره تماس"], ["customerAddress", "آدرس"], ["requestDate", "تاریخ ثبت درخواست"]],
    [["userCount", "تعداد کاربران"], ["computerCount", "تعداد سیستم‌ها"], ["serverCount", "تعداد سرورها"], ["branchCount", "تعداد شعب"]],
    [["requestDescription", "شرح درخواست مشتری"], ["issueSince", "زمان ایجاد مشکل"], ["issuePriority", "میزان اهمیت"], ["businessStopped", "وضعیت توقف فعالیت"]],
    [["statedNeeds", "نیازهای اعلام‌شده"], ["identifiedNeeds", "نیازهای شناسایی‌شده"], ["onSiteNeeds", "موارد نیازمند بازدید"]],
    [["networkStatus", "وضعیت شبکه"], ["networkNotes", "توضیحات شبکه"], ["currentServerCount", "تعداد سرورهای فعلی"], ["serverOs", "سیستم‌عامل سرورها"], ["serverStatus", "وضعیت سرورها"], ["networkEquipment", "تجهیزات شبکه"], ["internetType", "نوع اینترنت"], ["internetLines", "تعداد خطوط اینترنت"], ["internetStatus", "وضعیت اینترنت"], ["backupStatus", "وضعیت پشتیبان‌گیری"], ["securityStatus", "وضعیت امنیت"]],
    [["technicalOpinion", "نظر اولیه کارشناس"], ["onSiteRequired", "نیاز به بازدید حضوری"], ["onSiteReason", "علت نیاز به بازدید"], ["remoteRequired", "نیاز به دسترسی از راه دور"], ["remoteType", "نوع دسترسی موردنیاز"]],
    [["scopeDescription", "شرح محدوده کار"]],
    [["estimatedTime", "زمان تقریبی موردنیاز"], ["requiredPeople", "تعداد نفر موردنیاز"], ["skillLevel", "سطح تخصص"], ["presenceNeed", "نیاز به حضور در محل"]],
    [["customerStart", "زمان موردنظر مشتری برای شروع"], ["customerDeadline", "مهلت اعلام‌شده مشتری"], ["projectPriority", "اولویت پروژه"], ["operationalLimits", "محدودیت زمانی / عملیاتی"]],
    [["hasRisk", "وضعیت ریسک مهم"], ["prerequisiteNotes", "توضیحات پیش‌نیازها"]],
    [["evaluationResult", "نتیجه ارزیابی اولیه"], ["evaluationNotes", "توضیحات ارزیابی"]],
  ];
  errors.push(...missingFields(data, requiredGroups.flat()));
  if (!selected(data.requestMethods)) errors.push({ path: "requestMethods", message: "حداقل یک روش دریافت درخواست را انتخاب کنید." });
  if (!selected(data.infrastructureTypes)) errors.push({ path: "infrastructureTypes", message: "حداقل یک نوع زیرساخت را انتخاب کنید." });
  if (!selected(data.scopeItems)) errors.push({ path: "scopeItems", message: "حداقل یک مورد از محدوده احتمالی کار را انتخاب کنید." });
  if (!selected(data.prerequisites)) errors.push({ path: "prerequisites", message: "حداقل یک پیش‌نیاز شروع کار را انتخاب کنید." });
  if (data.hasRisk === "بله" && !completeRow(data.risks, ["risk", "probability", "impact", "solution"])) {
    errors.push({ path: "risks", message: "با انتخاب «بله» برای ریسک، حداقل یک ریسک کامل شامل احتمال، اثر و راهکار وارد کنید." });
  }
  return errors;
}

export function validateAssessment(data, options) { return assessmentErrors(data, options)[0]?.message || null; }

const passiveNames = ["کابل‌کشی شبکه", "نصب پریز و Keystone", "نصب Patch Panel", "نصب و تجهیز رک", "نصب Cable Management", "نصب Patch Cord", "لیبل‌گذاری کابل‌ها", "لیبل‌گذاری Patch Panel", "لیبل‌گذاری پریزها و نودها", "مرتب‌سازی کابل‌های داخل رک", "اتصال و ساماندهی تجهیزات داخل رک", "سایر خدمات Passive"];
const activeNames = ["نصب Switch", "نصب Router", "نصب Access Point", "نصب Firewall", "تنظیم IP Address", "تنظیم Gateway", "تنظیم VLAN", "تنظیم Access و Trunk Port", "تنظیم DHCP", "تنظیم DNS", "تنظیم Wi-Fi و SSID", "تنظیمات امنیتی تجهیزات", "تهیه Backup Configuration", "سایر تنظیمات"];
const testNames = ["بررسی اتصال فیزیکی تجهیزات", "بررسی وضعیت لینک پورت‌ها", "بررسی ارتباط نودها", "بررسی ارتباط با Switch", "بررسی ارتباط با Gateway", "بررسی IP Addressing", "بررسی DHCP", "بررسی DNS", "بررسی اینترنت", "بررسی VLAN", "بررسی Access Pointها", "بررسی اتصال Clientها", "تست نهایی شبکه"];
const attachmentNames = ["لیست تجهیزات", "لیست سریال تجهیزات", "لیست IP Addressها", "نقشه / دیاگرام شبکه", "مستند پورت‌ها", "فایل Backup تنظیمات", "تصاویر رک و تجهیزات", "گزارش تست شبکه", "سایر مستندات"];

export function handoverNumber(projectCode, role) {
  return `${projectCode || "ITR"}-HND-${role === "active_agent" ? "ACT" : "PAS"}`;
}

export function handoverErrors(data = {}, role) {
  const projectFields = [["issueDate", "تاریخ صدور"], ["documentStatus", "وضعیت سند"], ["customerName", "نام کارفرما / مشتری"], ["location", "محل اجرای پروژه"], ["customerRepresentative", "نام نماینده کارفرما"], ["customerPhone", "شماره تماس نماینده"], ["executorName", "کارشناس / مجری پروژه"], ["projectManager", "مدیر / مسئول پروژه"], ["startDate", "تاریخ شروع عملیات"], ["endDate", "تاریخ پایان عملیات"], ["handoverDate", "تاریخ تحویل"]];
  const errors = missingFields(data, projectFields);
  const requireValue = (path, value, label) => {
    if (!present(value)) errors.push({ path, message: `${label} الزامی است.` });
  };
  const statuses = (key, names, notes = false) => names.forEach((name, index) => {
    requireValue(`${key}.${index}.status`, data[key]?.[index]?.status, `وضعیت ${name}`);
    if (notes) requireValue(`${key}.${index}.note`, data[key]?.[index]?.note, `توضیحات ${name}`);
  });
  statuses("passiveServices", passiveNames);
  const passive = data.passiveServices || {};
  const done = (index) => passive[index]?.status === "انجام شد";
  for (const index of [0, 1, 2, 4, 5, 6, 7, 8]) {
    if (done(index)) requireValue(`passiveServices.${index}.quantity`, passive[index]?.quantity, `تعداد / مقدار ${passiveNames[index]}`);
  }
  for (const index of [3, 11]) {
    if (done(index)) requireValue(`passiveServices.${index}.note`, passive[index]?.note, `توضیحات ${passiveNames[index]}`);
  }
  if (done(6) || done(8)) {
    if (!completeRow(data.nodes, ["node", "location", "patchPanel", "switchPort", "status"])) errors.push({ path: "nodes", message: "با انجام لیبل‌گذاری، حداقل یک ردیف کامل در جدول نودها و نقاط شبکه وارد کنید." });
    requireValue("totalNodes", data.totalNodes, "تعداد کل نودهای تحویل‌شده");
  }
  if (role === "active_agent") {
    statuses("activeServices", activeNames);
    if (Object.values(data.activeServices || {}).some((row) => row?.status === "انجام شد") && !completeRow(data.activeEquipment, ["brand", "model", "serial", "managementIp", "status"])) errors.push({ path: "activeEquipment", message: "برای خدمات اکتیو انجام‌شده، حداقل یک ردیف کامل در جدول تجهیزات اکتیو وارد کنید." });
  }
  statuses("networkTests", testNames, true);
  requireValue("finalTestResult", data.finalTestResult, "نتیجه تست نهایی");
  requireValue("activities", data.activities, "شرح فعالیت‌های انجام‌شده");
  statuses("attachmentsChecklist", attachmentNames);
  return errors;
}

export function validateHandover(data, role) { return handoverErrors(data, role)[0]?.message || null; }
