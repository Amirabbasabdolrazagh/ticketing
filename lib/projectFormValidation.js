const present = (value) => typeof value === "string" ? Boolean(value.trim()) : value !== null && value !== undefined && value !== "";

const selected = (value = {}) => Object.entries(value).some(([key, checked]) => key !== "other" && key !== "otherEnabled" && checked)
  || (value.otherEnabled && present(value.other));

const everyStatus = (rows, count) => Array.from({ length: count }, (_, index) => present(rows?.[index]?.status)).every(Boolean);

const completeRow = (rows, fields) => Object.values(rows || {}).some((row) => fields.every((key) => present(row?.[key])));

const firstMissing = (data, fields) => fields.find(([key]) => !present(data[key]));

export function validateAssessment(data, { standalone = false } = {}) {
  if (standalone) {
    const missing = firstMissing(data, [["projectTitle", "عنوان پروژه"], ["customerCompany", "نام مشتری / شرکت"], ["customerAddress", "محل اجرای پروژه"]]);
    if (missing) return `${missing[1]} الزامی است.`;
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
  for (const group of requiredGroups) {
    const missing = firstMissing(data, group);
    if (missing) return `${missing[1]} الزامی است.`;
  }
  if (!selected(data.requestMethods)) return "حداقل یک روش دریافت درخواست را انتخاب کنید.";
  if (!selected(data.infrastructureTypes)) return "حداقل یک نوع زیرساخت را انتخاب کنید.";
  if (!selected(data.scopeItems)) return "حداقل یک مورد از محدوده احتمالی کار را انتخاب کنید.";
  if (!selected(data.prerequisites)) return "حداقل یک پیش‌نیاز شروع کار را انتخاب کنید.";
  if (data.hasRisk === "بله" && !completeRow(data.risks, ["risk", "probability", "impact", "solution"])) {
    return "با انتخاب «بله» برای ریسک، حداقل یک ریسک کامل شامل احتمال، اثر و راهکار وارد کنید.";
  }
  return null;
}

const passiveNames = ["کابل‌کشی شبکه", "نصب پریز و Keystone", "نصب Patch Panel", "نصب و تجهیز رک", "نصب Cable Management", "نصب Patch Cord", "لیبل‌گذاری کابل‌ها", "لیبل‌گذاری Patch Panel", "لیبل‌گذاری پریزها و نودها", "مرتب‌سازی کابل‌های داخل رک", "اتصال و ساماندهی تجهیزات داخل رک", "سایر خدمات Passive"];
const activeNames = ["نصب Switch", "نصب Router", "نصب Access Point", "نصب Firewall", "تنظیم IP Address", "تنظیم Gateway", "تنظیم VLAN", "تنظیم Access و Trunk Port", "تنظیم DHCP", "تنظیم DNS", "تنظیم Wi-Fi و SSID", "تنظیمات امنیتی تجهیزات", "تهیه Backup Configuration", "سایر تنظیمات"];
const testNames = ["بررسی اتصال فیزیکی تجهیزات", "بررسی وضعیت لینک پورت‌ها", "بررسی ارتباط نودها", "بررسی ارتباط با Switch", "بررسی ارتباط با Gateway", "بررسی IP Addressing", "بررسی DHCP", "بررسی DNS", "بررسی اینترنت", "بررسی VLAN", "بررسی Access Pointها", "بررسی اتصال Clientها", "تست نهایی شبکه"];
const attachmentNames = ["لیست تجهیزات", "لیست سریال تجهیزات", "لیست IP Addressها", "نقشه / دیاگرام شبکه", "مستند پورت‌ها", "فایل Backup تنظیمات", "تصاویر رک و تجهیزات", "گزارش تست شبکه", "سایر مستندات"];

export function handoverNumber(projectCode, role) {
  return `${projectCode || "ITR"}-HND-${role === "active_agent" ? "ACT" : "PAS"}`;
}

export function validateHandover(data, role) {
  const projectFields = [["issueDate", "تاریخ صدور"], ["documentStatus", "وضعیت سند"], ["customerName", "نام کارفرما / مشتری"], ["location", "محل اجرای پروژه"], ["customerRepresentative", "نام نماینده کارفرما"], ["customerPhone", "شماره تماس نماینده"], ["executorName", "کارشناس / مجری پروژه"], ["projectManager", "مدیر / مسئول پروژه"], ["startDate", "تاریخ شروع عملیات"], ["endDate", "تاریخ پایان عملیات"], ["handoverDate", "تاریخ تحویل"]];
  const missing = firstMissing(data, projectFields);
  if (missing) return `${missing[1]} الزامی است.`;
  if (!everyStatus(data.passiveServices, passiveNames.length)) return "وضعیت همه خدمات پسیو را مشخص کنید.";
  const passive = data.passiveServices || {};
  const done = (name) => passive[passiveNames.indexOf(name)]?.status === "انجام شد";
  for (const name of ["کابل‌کشی شبکه", "نصب پریز و Keystone", "نصب Patch Panel", "نصب Cable Management", "نصب Patch Cord", "لیبل‌گذاری کابل‌ها", "لیبل‌گذاری Patch Panel", "لیبل‌گذاری پریزها و نودها"]) {
    if (done(name) && !present(passive[passiveNames.indexOf(name)]?.quantity)) return `تعداد / مقدار «${name}» را وارد کنید.`;
  }
  if (done("نصب و تجهیز رک") && !present(passive[passiveNames.indexOf("نصب و تجهیز رک")]?.note)) return "توضیحات «نصب و تجهیز رک» الزامی است.";
  if (done("سایر خدمات Passive") && !present(passive[passiveNames.indexOf("سایر خدمات Passive")]?.note)) return "برای سایر خدمات پسیو، توضیحات را وارد کنید.";
  const labelsDone = done("لیبل‌گذاری پریزها و نودها") || done("لیبل‌گذاری کابل‌ها");
  if (labelsDone && !completeRow(data.nodes, ["node", "location", "patchPanel", "switchPort", "status"])) return "با انجام لیبل‌گذاری، حداقل یک ردیف کامل در جدول نودها و نقاط شبکه وارد کنید.";
  if (labelsDone && !present(data.totalNodes)) return "تعداد کل نودهای تحویل‌شده الزامی است.";
  if (role === "active_agent") {
    if (!everyStatus(data.activeServices, activeNames.length)) return "وضعیت همه خدمات اکتیو را مشخص کنید.";
    const hasActiveWork = Object.values(data.activeServices || {}).some((entry) => entry?.status === "انجام شد");
    if (hasActiveWork && !completeRow(data.activeEquipment, ["brand", "model", "serial", "managementIp", "status"])) return "برای خدمات اکتیو انجام‌شده، حداقل یک ردیف کامل در جدول تجهیزات اکتیو وارد کنید.";
  }
  if (!everyStatus(data.networkTests, testNames.length) || !Array.from({ length: testNames.length }, (_, index) => present(data.networkTests?.[index]?.note)).every(Boolean)) return "وضعیت و توضیحات همه تست‌های شبکه الزامی است.";
  if (!present(data.finalTestResult)) return "نتیجه تست نهایی را مشخص کنید.";
  if (!present(data.activities)) return "شرح فعالیت‌های انجام‌شده الزامی است.";
  if (!everyStatus(data.attachmentsChecklist, attachmentNames.length)) return "وضعیت همه موارد پیوست‌های صورتجلسه را مشخص کنید.";
  return null;
}
