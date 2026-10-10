import ProjectPrintDocument from "./ProjectPrintDocument";

const passiveServices = ["کابل‌کشی شبکه", "نصب پریز و Keystone", "نصب Patch Panel", "نصب و تجهیز رک", "نصب Cable Management", "نصب Patch Cord", "لیبل‌گذاری کابل‌ها", "لیبل‌گذاری Patch Panel", "لیبل‌گذاری پریزها و نودها", "مرتب‌سازی کابل‌های داخل رک", "اتصال و ساماندهی تجهیزات داخل رک", "سایر خدمات Passive"];
const activeServices = ["نصب Switch", "نصب Router", "نصب Access Point", "نصب Firewall", "تنظیم IP Address", "تنظیم Gateway", "تنظیم VLAN", "تنظیم Access و Trunk Port", "تنظیم DHCP", "تنظیم DNS", "تنظیم Wi-Fi و SSID", "تنظیمات امنیتی تجهیزات", "تهیه Backup Configuration", "سایر تنظیمات"];
const networkTests = ["بررسی اتصال فیزیکی تجهیزات", "بررسی وضعیت لینک پورت‌ها", "بررسی ارتباط نودها", "بررسی ارتباط با Switch", "بررسی ارتباط با Gateway", "بررسی IP Addressing", "بررسی DHCP", "بررسی DNS", "بررسی اینترنت", "بررسی VLAN", "بررسی Access Pointها", "بررسی اتصال Clientها", "تست نهایی شبکه"];
const documentation = ["لیست تجهیزات", "لیست Serial Number تجهیزات", "لیست IP Addressها", "اطلاعات VLAN", "نقشه و دیاگرام شبکه", "مستند ارتباط پورت‌ها", "Configuration Backup", "تصاویر Rack و تجهیزات", "سایر مستندات"];
const training = ["نحوه ورود به تجهیزات", "مشاهده وضعیت تجهیزات", "مشاهده وضعیت پورت‌ها", "مدیریت Access Point", "مدیریت Switch و Router", "مشاهده و استفاده از مستندات", "سایر موارد"];

const fields = (data, pairs) => pairs.map(([label, key]) => ({ label, value: data[key] }));
const checklistFields = (data, names) => Object.entries(data || {}).filter(([, entry]) => entry?.status || entry?.note).map(([index, entry]) => ({
  label: names[Number(index)] || index,
  value: [entry.status, entry.note].filter(Boolean).join(" — "),
}));
const checkedFields = (data) => Object.entries(data || {}).filter(([, checked]) => checked).map(([label]) => ({ label, value: "تأیید شد" }));

export default function ProjectHandoverPrintDocument({ item, data = item.data || {}, audience, printable = true }) {
  const customer = audience === "customer";
  const active = item.assigneeRole === "active_agent";
  const project = item.project || {};
  const details = [
    { label: "شماره صورتجلسه", value: data.meetingNumber },
    { label: "شماره پروژه / قرارداد", value: data.contractNumber || project.code },
    { label: "تاریخ صدور", value: data.issueDate },
    { label: "وضعیت سند", value: data.documentStatus },
  ];
  const parties = [
    { title: "نماینده کارفرما", name: data.customerConfirmationName || data.customerRepresentative, role: data.customerRepresentativeRole },
    { title: "کارشناس / مجری پروژه", name: data.executorConfirmationName || data.executorName },
    { title: "مسئول پروژه ای‌تی رسام", name: data.managerConfirmationName || data.projectManager },
  ];
  const punchList = { title: "موارد باقی‌مانده / Punch List", rows: data.punchList, columns: [
    { key: "issue", label: "شرح مورد" }, { key: "owner", label: "مسئول انجام" },
    { key: "deadline", label: "مهلت" }, { key: "status", label: "وضعیت" },
  ] };
  const sections = [
    { title: "مشخصات پروژه و طرفین", fields: [
      { label: "عنوان پروژه", value: project.name },
      ...fields(data, [["نام کارفرما / مشتری", "customerName"], ["محل اجرای پروژه", "location"], ["نماینده کارفرما", "customerRepresentative"], ["سمت نماینده", "customerRepresentativeRole"], ["شماره تماس نماینده", "customerPhone"], ["مجری پروژه", "executorName"], ["مسئول پروژه ای‌تی رسام", "projectManager"], ["تاریخ شروع عملیات", "startDate"], ["تاریخ پایان عملیات", "endDate"], ["تاریخ تحویل", "handoverDate"]]),
    ] },
    { title: "شرح خدمات پسیو انجام‌شده", fields: [
      ...checklistFields(data.passiveServices, passiveServices),
      { label: "توضیحات عملیات پسیو", value: data.passiveDescription },
      { label: "تعداد نودهای تحویل‌شده", value: data.totalNodes },
    ] },
    ...(active ? [{ title: "شرح خدمات اکتیو انجام‌شده", fields: checklistFields(data.activeServices, activeServices) }] : []),
    { title: "تست و بررسی عملکرد شبکه", fields: checklistFields(data.networkTests, networkTests) },
    { title: "نتیجه تست نهایی", fields: [{ label: "نتیجه", value: data.finalTestResult }] },
    { table: punchList },
    { title: "شرح فعالیت و تأییدها", fields: [
      ...fields(data, [["شرح فعالیت‌های انجام‌شده", "activities"], ["تجهیزات / اقلام نصب و راه‌اندازی‌شده", "installedItems"], ["تنظیمات انجام‌شده", "configurations"], ["مشکلات یا موانع حین اجرا", "obstacles"], ["اقدامات اصلاحی انجام‌شده", "correctiveActions"], ["توضیحات نماینده کارفرما", "customerNotes"], ["وضعیت نهایی تحویل", "finalDeliveryStatus"], ["تاریخ تأیید کارفرما", "customerConfirmationDate"], ["تاریخ تأیید کارشناس", "executorConfirmationDate"], ["تاریخ تأیید مسئول پروژه", "managerConfirmationDate"]]),
      ...checkedFields(data.customerConfirmations),
      ...(!customer ? checkedFields(data.finalChecks) : []),
    ] },
    { title: "پیوست‌های صورتجلسه", fields: [
      ...checkedFields(data.attachments),
      ...fields(data, [["تعداد برگه‌های پیوست", "attachmentPages"], ["توضیحات پیوست‌ها", "attachmentNotes"]]),
    ] },
  ];
  const companySections = [
    { title: "مستندسازی و تحویل داخلی", fields: [
      ...checklistFields(data.documentation, documentation), ...checklistFields(data.training, training),
      ...fields(data, [["روش تحویل اطلاعات دسترسی", "accessMethods"]]),
    ] },
  ];
  const companyTables = [
    { title: "نودها و نقاط شبکه", rows: data.nodes, columns: [{ key: "node", label: "نود" }, { key: "location", label: "محل نصب" }, { key: "patchPanel", label: "Patch Panel" }, { key: "switchPort", label: "Switch Port" }, { key: "status", label: "وضعیت" }] },
    { title: "تجهیزات پسیو", rows: data.passiveEquipment, columns: [{ key: "type", label: "نوع" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "count", label: "تعداد" }, { key: "status", label: "وضعیت" }] },
    { title: "تجهیزات اکتیو", rows: data.activeEquipment, columns: [{ key: "type", label: "نوع" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "serial", label: "سریال" }, { key: "managementIp", label: "IP مدیریتی" }, { key: "status", label: "وضعیت" }] },
    { title: "تحویل دسترسی‌ها", rows: data.accesses, columns: [{ key: "equipment", label: "تجهیز / سرویس" }, { key: "address", label: "IP / آدرس" }, { key: "accessType", label: "نوع دسترسی" }, { key: "status", label: "وضعیت تحویل" }] },
  ];

  return <ProjectPrintDocument
    printable={printable}
    title={`صورتجلسه تحویل و تأیید پروژه${customer ? " | نسخه مشتری" : " | نسخه شرکت"}`}
    code="IT-RASAM-NET-FRM-001"
    projectName={project.name}
    detailTitle="مشخصات سند و پروژه"
    details={details}
    sections={customer ? sections : [...sections, ...companySections]}
    tables={customer ? [] : companyTables}
    parties={parties}
  />;
}
