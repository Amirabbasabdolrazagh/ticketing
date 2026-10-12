"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { flushSync } from "react-dom";
import ProjectHandoverPrintDocument from "./ProjectHandoverPrintDocument";
import VoiceTextarea from "./VoiceTextarea";
import { handoverNumber, validateHandover } from "@/lib/projectFormValidation";

const passiveServices = ["کابل‌کشی شبکه", "نصب پریز و Keystone", "نصب Patch Panel", "نصب و تجهیز رک", "نصب Cable Management", "نصب Patch Cord", "لیبل‌گذاری کابل‌ها", "لیبل‌گذاری Patch Panel", "لیبل‌گذاری پریزها و نودها", "مرتب‌سازی کابل‌های داخل رک", "اتصال و ساماندهی تجهیزات داخل رک", "سایر خدمات Passive"];
const activeServices = ["نصب Switch", "نصب Router", "نصب Access Point", "نصب Firewall", "تنظیم IP Address", "تنظیم Gateway", "تنظیم VLAN", "تنظیم Access و Trunk Port", "تنظیم DHCP", "تنظیم DNS", "تنظیم Wi-Fi و SSID", "تنظیمات امنیتی تجهیزات", "تهیه Backup Configuration", "سایر تنظیمات"];
const networkTests = ["بررسی اتصال فیزیکی تجهیزات", "بررسی وضعیت لینک پورت‌ها", "بررسی ارتباط نودها", "بررسی ارتباط با Switch", "بررسی ارتباط با Gateway", "بررسی IP Addressing", "بررسی DHCP", "بررسی DNS", "بررسی اینترنت", "بررسی VLAN", "بررسی Access Pointها", "بررسی اتصال Clientها", "تست نهایی شبکه"];
const documentation = ["لیست تجهیزات", "لیست Serial Number تجهیزات", "لیست IP Addressها", "اطلاعات VLAN", "نقشه و دیاگرام شبکه", "مستند ارتباط پورت‌ها", "Configuration Backup", "تصاویر Rack و تجهیزات", "سایر مستندات"];
const training = ["نحوه ورود به تجهیزات", "مشاهده وضعیت تجهیزات", "مشاهده وضعیت پورت‌ها", "مدیریت Access Point", "مدیریت Switch و Router", "مشاهده و استفاده از مستندات", "سایر موارد"];
const passiveEquipment = ["Rack", "Patch Panel", "PDU", "Cable Manager", "Patch Cord", "Keystone / Faceplate", "سایر"];
const activeEquipment = ["Switch", "Switch", "Router", "Firewall", "Access Point", "Access Point", "Controller", "سایر"];
const accessEquipment = ["Router", "Switch", "Firewall", "Access Point", "Controller", "سایر"];
const customerConfirmations = ["عملیات اجراشده مطابق شرح خدمات پروژه است", "تجهیزات و اقلام تحویلی مورد بررسی قرار گرفته است", "تست‌های عملکردی شبکه انجام شده است", "مستندات و اطلاعات مورد نیاز تحویل شده است", "دسترسی‌های توافق‌شده تحویل شده است", "موارد باقی‌مانده در Punch List ثبت شده است", "پروژه با وضعیت درج‌شده در این صورتجلسه تحویل گردید"];
const attachments = ["لیست تجهیزات", "لیست سریال تجهیزات", "لیست IP Addressها", "نقشه / دیاگرام شبکه", "مستند پورت‌ها", "فایل Backup تنظیمات", "تصاویر رک و تجهیزات", "گزارش تست شبکه", "سایر مستندات"];
const mandatoryHandoverLabels = new Set(["نام کارفرما / مشتری", "محل اجرای پروژه", "نام نماینده کارفرما", "شماره تماس نماینده", "کارشناس / مجری پروژه", "مدیر / مسئول پروژه ای‌تی رسام", "تعداد کل نودهای تحویل‌شده", "شرح فعالیت‌های انجام‌شده"]);
const mandatoryChecklistTitles = new Set(["شرح خدمات پسیو انجام‌شده", "تست و بررسی عملکرد شبکه", "پیوست‌های صورتجلسه"]);

function PersianDateInput({ value, onChange }) {
  return <input value={value || ""} onChange={(e) => onChange(e.target.value)} inputMode="numeric" placeholder="۱۴۰۵/۰۷/۱۸" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-500" />;
}
function TextInput({ label, value, onChange, multiline = false, readOnly = false }) {
  const required = mandatoryHandoverLabels.has(label);
  return <label className="block text-sm font-bold text-slate-700">{label}{required && " (الزامی)"}{multiline ? <VoiceTextarea value={value} onChange={onChange} readOnly={readOnly} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-blue-500 read-only:bg-slate-100" /> : <input value={value || ""} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} dir={label.includes("تماس") ? "ltr" : undefined} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 read-only:bg-slate-100" />}</label>;
}
function Checklist({ title, items, data, setData, options = ["انجام شد", "انجام نشد", "مشمول پروژه نیست"], detailConfig = {}, optionsByItem = {}, notePlaceholders = {}, statusLabels = {} }) {
  const required = mandatoryChecklistTitles.has(title);
  return <section className="glass-panel overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black">{title}{required && " (الزامی)"}</h2><p className="mt-1 text-xs text-slate-500">وضعیت همه ردیف‌ها باید مشخص شود{required ? " (الزامی)" : ""}.</p></div><div className="divide-y divide-slate-100">{items.map((item, index) => { const detail = detailConfig[item]; const itemOptions = optionsByItem[item] || options; return <div key={item} className={`grid gap-3 p-4 md:items-center ${detail ? "md:grid-cols-[2rem_1fr_12rem_10rem_1fr]" : "md:grid-cols-[2rem_1fr_14rem_1fr]"}`}><span className="text-center text-sm text-slate-400">{(index + 1).toLocaleString("fa-IR")}</span><strong className="text-sm">{item}</strong><label className="text-xs font-bold text-slate-500">{statusLabels[item] || "وضعیت"}{required && " (الزامی)"}<select value={data?.[index]?.status || ""} onChange={(e) => setData(index, { ...(data?.[index] || {}), status: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">انتخاب وضعیت</option>{itemOptions.map((option) => <option key={option}>{option}</option>)}</select></label>{detail && <label className="text-xs font-bold text-slate-500">{detail.label}{required && " (الزامی در صورت انجام)"}<div className="mt-1 flex"><input value={data?.[index]?.quantity || ""} onChange={(e) => setData(index, { ...(data?.[index] || {}), quantity: e.target.value })} inputMode="decimal" className={`h-10 min-w-0 w-full border border-slate-200 bg-white px-3 text-sm ${detail.unit ? "rounded-r-xl" : "rounded-xl"}`} />{detail.unit && <span className="grid w-12 place-items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50">{detail.unit}</span>}</div></label>}<input value={data?.[index]?.note || ""} onChange={(e) => setData(index, { ...(data?.[index] || {}), note: e.target.value })} placeholder={notePlaceholders[item] || "توضیحات"} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" /></div>; })}</div></section>;
}
function DataTable({ title, columns, rows, data, setData }) {
  return <section className="glass-panel overflow-x-auto"><div className="border-b border-slate-100 p-5"><h2 className="text-lg font-black">{title}</h2></div><table className="min-w-[760px] w-full text-right text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">ردیف</th>{columns.map((column) => <th key={column.key} className="p-3">{column.label}</th>)}</tr></thead><tbody>{rows.map((label, index) => <tr key={index} className="border-t border-slate-100"><td className="p-3 text-center text-slate-400">{(index + 1).toLocaleString("fa-IR")}</td>{columns.map((column) => <td key={column.key} className="p-2">{column.type === "fixed" ? <span className="font-semibold">{label}</span> : column.type === "select" ? <select value={data?.[index]?.[column.key] || ""} onChange={(e) => setData(index, { ...(data?.[index] || {}), [column.key]: e.target.value })} className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-2"><option value="">انتخاب</option>{column.options.map((option) => <option key={option}>{option}</option>)}</select> : <input value={data?.[index]?.[column.key] || ""} onChange={(e) => setData(index, { ...(data?.[index] || {}), [column.key]: e.target.value })} inputMode={column.type === "persianDate" ? "numeric" : undefined} placeholder={column.type === "persianDate" ? "۱۴۰۵/۰۷/۱۸" : column.placeholder || ""} className="h-10 w-full min-w-28 rounded-lg border border-slate-200 bg-white px-2" />}</td>)}</tr>)}</tbody></table></section>;
}

export default function ProjectHandoverForm({ handover, onDone }) {
  const [data, setData] = useState(handover.data || {});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const dataRef = useRef(handover.data || {});
  const lastSavedDataRef = useRef(JSON.stringify(handover.data || {}));
  const [autoSaveState, setAutoSaveState] = useState("ready");
  const [saveError, setSaveError] = useState("");
  const [savedAt, setSavedAt] = useState(handover.updatedAt || null);
  const [printAudience, setPrintAudience] = useState(null);
  useEffect(() => {
    const clear = () => setPrintAudience(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
  const print = (audience) => {
    flushSync(() => setPrintAudience(audience));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };
  const update = (key, value) => { setSaveError(""); setData((old) => { const next = { ...old, [key]: value }; dataRef.current = next; setAutoSaveState("pending"); return next; }); };
  const updateList = (key, index, value) => update(key, { ...(data[key] || {}), [index]: value });
  const save = useCallback(async (status = "assigned", { silent = false } = {}) => {
    if (savingRef.current) return;
    const formData = dataRef.current;
    if (status === "submitted") {
      const validationError = validateHandover(formData, handover.assigneeRole);
      if (validationError) {
        setSaveError(validationError);
        toast.error(validationError);
        return;
      }
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const projectId = typeof handover.project === "string" ? handover.project : handover.project?._id;
      if (!projectId) throw new Error("شناسه پروژه در صورتجلسه پیدا نشد؛ فرم را دوباره باز کنید.");
      const url = `/api/projects/${projectId}/handovers`;
      const payload = { handoverId: handover._id, data: formData, status };
      let result;
      try {
        result = await axios.patch(url, payload);
      } catch (error) {
        if (error.response?.status !== 401) throw error;
        try {
          await axios.post("/api/auth/refreshToken");
        } catch {
          throw new Error("نشست شما منقضی شده است. دوباره وارد شوید؛ تا زمانی که صفحه باز است اطلاعات فرم پاک نمی‌شود.");
        }
        result = await axios.patch(url, payload);
      }
      const response = result.data;
      if (!response?.success || !response.handover) throw new Error(response?.message || "تأیید ذخیره از سرور دریافت نشد.");
      lastSavedDataRef.current = JSON.stringify(formData);
      setAutoSaveState("saved");
      setSavedAt(response.handover?.updatedAt || new Date().toISOString());
      if (!silent) toast.success(status === "submitted" ? "صورتجلسه برای ادمین ارسال شد" : "صورتجلسه در دیتابیس ذخیره شد");
      const refreshed = onDone?.();
      if (refreshed?.catch) refreshed.catch(() => {});
    } catch (error) {
      const message = error.response?.data?.message || error.message || "ذخیره صورتجلسه ناموفق بود";
      setAutoSaveState("error");
      setSaveError(message);
      if (!silent) toast.error(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [handover._id, handover.assigneeRole, handover.project, onDone]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (savingRef.current || JSON.stringify(dataRef.current) === lastSavedDataRef.current) return;
      save("assigned", { silent: true });
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [save]);
  return <><section dir="rtl" className="app-page project-form-editor space-y-5">
    <div className="glass-panel print-header p-6"><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">IT-RASAM-NET-FRM-001</span><h1 className="mt-3 page-heading">صورتجلسه تحویل و تأیید پروژه</h1><p className="mt-2 text-sm text-slate-500">{handover.project?.name} — کارشناس {handover.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</p>{savedAt && <p className="mt-2 text-xs font-semibold text-emerald-700">آخرین ذخیره: {new Date(savedAt).toLocaleString("fa-IR")}</p>}<p className={`mt-2 text-xs font-bold ${autoSaveState === "error" ? "text-amber-700" : "text-emerald-700"}`}>{autoSaveState === "error" ? "ذخیره خودکار ناموفق بود؛ پس از ورود مجدد آخرین نسخهٔ ذخیره‌شده در دسترس است." : autoSaveState === "pending" ? "تغییرات شما حداکثر تا ۱۰ ثانیه دیگر خودکار ذخیره می‌شود." : autoSaveState === "saved" ? "تغییرات به‌صورت خودکار ذخیره شد." : "ذخیره خودکار هر ۱۰ ثانیه فعال است."}</p></div>
    <section className="glass-panel p-5"><h2 className="text-lg font-black">مشخصات سند و پروژه</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><TextInput label="شماره صورتجلسه" value={handoverNumber(handover.project?.code, handover.assigneeRole)} onChange={() => {}} readOnly /><label className="text-sm font-bold">تاریخ صدور (شمسی) (الزامی)<div className="mt-2"><PersianDateInput value={data.issueDate} onChange={(v) => update("issueDate", v)} /></div></label><label className="text-sm font-bold">وضعیت سند (الزامی)<select value={data.documentStatus || ""} onChange={(e) => update("documentStatus", e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="">انتخاب وضعیت</option><option>اولیه</option><option>اصلاحیه</option><option>نهایی</option></select></label></div></section>
    <section className="glass-panel p-5"><h2 className="text-lg font-black">مشخصات پروژه و طرفین</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><TextInput label="نام کارفرما / مشتری" value={data.customerName} onChange={(v) => update("customerName", v)} /><TextInput label="محل اجرای پروژه" value={data.location} onChange={(v) => update("location", v)} /><TextInput label="نام نماینده کارفرما" value={data.customerRepresentative} onChange={(v) => update("customerRepresentative", v)} /><TextInput label="سمت نماینده کارفرما" value={data.customerRepresentativeRole} onChange={(v) => update("customerRepresentativeRole", v)} /><TextInput label="شماره تماس نماینده" value={data.customerPhone} onChange={(v) => update("customerPhone", v)} /><TextInput label="کارشناس / مجری پروژه" value={data.executorName} onChange={(v) => update("executorName", v)} /><TextInput label="مدیر / مسئول پروژه ای‌تی رسام" value={data.projectManager} onChange={(v) => update("projectManager", v)} /><label className="text-sm font-bold">تاریخ شروع عملیات (شمسی) (الزامی)<div className="mt-2"><PersianDateInput value={data.startDate} onChange={(v) => update("startDate", v)} /></div></label><label className="text-sm font-bold">تاریخ پایان عملیات (شمسی) (الزامی)<div className="mt-2"><PersianDateInput value={data.endDate} onChange={(v) => update("endDate", v)} /></div></label><label className="text-sm font-bold">تاریخ تحویل (شمسی) (الزامی)<div className="mt-2"><PersianDateInput value={data.handoverDate} onChange={(v) => update("handoverDate", v)} /></div></label></div></section>
    <Checklist title="شرح خدمات پسیو انجام‌شده" items={passiveServices} data={data.passiveServices} setData={(i, v) => updateList("passiveServices", i, v)} detailConfig={{ "کابل‌کشی شبکه": { label: "مقدار", unit: "متر" }, "نصب پریز و Keystone": { label: "تعداد", unit: "عدد" }, "نصب Patch Panel": { label: "تعداد" }, "نصب Cable Management": { label: "تعداد", unit: "عدد" }, "نصب Patch Cord": { label: "تعداد", unit: "عدد" }, "لیبل‌گذاری کابل‌ها": { label: "تعداد", unit: "عدد" }, "لیبل‌گذاری Patch Panel": { label: "تعداد", unit: "عدد" }, "لیبل‌گذاری پریزها و نودها": { label: "تعداد", unit: "عدد" } }} />
    <TextInput label="توضیحات عملیات پسیو" value={data.passiveDescription} onChange={(v) => update("passiveDescription", v)} multiline />
    <DataTable title="جدول نودها و نقاط شبکه" rows={Array.from({ length: 10 }, () => "")} data={data.nodes} setData={(i, v) => updateList("nodes", i, v)} columns={[{ key: "node", label: "نام / شماره نود" }, { key: "location", label: "محل نصب" }, { key: "patchPanel", label: "Patch Panel Port" }, { key: "switchPort", label: "Switch Port" }, { key: "status", label: "وضعیت", type: "select", options: ["سالم", "نیازمند بررسی"] }]} />
    <TextInput label="تعداد کل نودهای تحویل‌شده" value={data.totalNodes} onChange={(v) => update("totalNodes", v)} />
    <DataTable title="تجهیزات Rack و Passive تحویلی" rows={passiveEquipment} data={data.passiveEquipment} setData={(i, v) => updateList("passiveEquipment", i, v)} columns={[{ key: "type", label: "نوع تجهیز", type: "fixed" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "count", label: "تعداد" }, { key: "status", label: "وضعیت", type: "select", options: ["تحویل شد", "تحویل نشد"] }]} />
    <Checklist title="شرح خدمات اکتیو انجام‌شده" items={activeServices} data={data.activeServices} setData={(i, v) => updateList("activeServices", i, v)} />
    <DataTable title="جدول تجهیزات اکتیو" rows={activeEquipment} data={data.activeEquipment} setData={(i, v) => updateList("activeEquipment", i, v)} columns={[{ key: "type", label: "نوع تجهیز", type: "fixed" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "serial", label: "Serial Number" }, { key: "managementIp", label: "IP مدیریتی" }, { key: "status", label: "وضعیت", type: "select", options: ["تحویل شد", "تحویل نشد"] }]} />
    <Checklist title="تست و بررسی عملکرد شبکه" items={networkTests} data={data.networkTests} setData={(i, v) => updateList("networkTests", i, v)} options={["تأیید", "نیازمند اصلاح", "مشمول پروژه نیست"]} optionsByItem={{ "بررسی DNS": ["دستی", "اتوماتیک"], "بررسی اینترنت": ["متصل است", "متصل نیست"], "بررسی VLAN": ["دارد", "ندارد"] }} statusLabels={{ "بررسی DNS": "آیا DNS اتوماتیک است؟" }} notePlaceholders={{ "بررسی ارتباط با Switch": "آدرس Switch باید وارد شود", "بررسی ارتباط با Gateway": "آدرس Gateway باید وارد شود", "بررسی IP Addressing": "رنج آدرس باید وارد شود", "بررسی DHCP": "آیا آدرس از DHCP گرفته می‌شود؟", "بررسی DNS": "آدرس DNS وارد شود" }} />
    <section className="glass-panel p-5"><h2 className="text-lg font-black">نتیجه تست نهایی</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{["شبکه و تجهیزات مطابق شرح خدمات تست و تأیید گردید", "پروژه با موارد اصلاحی تحویل گردید", "پروژه به‌صورت موقت تحویل گردید"].map((option) => <label key={option} className="flex gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="radio" checked={data.finalTestResult === option} onChange={() => update("finalTestResult", option)} />{option}</label>)}</div></section>
    <Checklist title="مستندسازی و مدارک تحویلی" items={documentation} data={data.documentation} setData={(i, v) => updateList("documentation", i, v)} options={["تحویل شد", "مشمول پروژه نیست"]} />
    <DataTable title="تحویل دسترسی‌ها" rows={accessEquipment} data={data.accesses} setData={(i, v) => updateList("accesses", i, v)} columns={[{ key: "equipment", label: "تجهیز / سرویس", type: "fixed" }, { key: "address", label: "IP / آدرس" }, { key: "accessType", label: "نوع دسترسی" }, { key: "status", label: "وضعیت تحویل", type: "select", options: ["تحویل شد", "تحویل نشد"] }]} />
    <section className="glass-panel p-5"><h2 className="text-lg font-black">روش تحویل اطلاعات دسترسی</h2><div className="mt-4 flex flex-wrap gap-3">{["حضوری", "فایل رمزگذاری‌شده", "Password Manager", "کانال ارتباطی مورد توافق", "سایر"].map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={Boolean(data.accessMethods?.[item])} onChange={(e) => update("accessMethods", { ...(data.accessMethods || {}), [item]: e.target.checked })} />{item}</label>)}</div></section>
    <Checklist title="آموزش و تحویل عملیاتی" items={training} data={data.training} setData={(i, v) => updateList("training", i, v)} options={["انجام شد", "مشمول پروژه نیست"]} />
    <DataTable title="موارد باقی‌مانده / Punch List" rows={Array.from({ length: 4 }, () => "")} data={data.punchList} setData={(i, v) => updateList("punchList", i, v)} columns={[{ key: "issue", label: "شرح مورد" }, { key: "owner", label: "مسئول انجام" }, { key: "deadline", label: "مهلت انجام (شمسی)", type: "persianDate" }, { key: "status", label: "وضعیت", type: "select", options: ["باز", "انجام شد"] }]} />
    <section className="glass-panel p-5"><h2 className="text-lg font-black">شرح فعالیت و تأییدها</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><TextInput label="شرح فعالیت‌های انجام‌شده" value={data.activities} onChange={(v) => update("activities", v)} multiline /><TextInput label="تجهیزات / اقلام نصب و راه‌اندازی‌شده" value={data.installedItems} onChange={(v) => update("installedItems", v)} multiline /><TextInput label="تنظیمات انجام‌شده" value={data.configurations} onChange={(v) => update("configurations", v)} multiline /><TextInput label="مشکلات یا موانع حین اجرا" value={data.obstacles} onChange={(v) => update("obstacles", v)} multiline /><TextInput label="اقدامات اصلاحی انجام‌شده" value={data.correctiveActions} onChange={(v) => update("correctiveActions", v)} multiline /><TextInput label="توضیحات نماینده کارفرما" value={data.customerNotes} onChange={(v) => update("customerNotes", v)} multiline /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{customerConfirmations.map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={Boolean(data.customerConfirmations?.[item])} onChange={(e) => update("customerConfirmations", { ...(data.customerConfirmations || {}), [item]: e.target.checked })} />{item}</label>)}</div><div className="mt-5 grid gap-4 md:grid-cols-3"><TextInput label="نام و نام‌خانوادگی نماینده کارفرما" value={data.customerConfirmationName} onChange={(v) => update("customerConfirmationName", v)} /><label className="text-sm font-bold">تاریخ تأیید کارفرما (شمسی)<div className="mt-2"><PersianDateInput value={data.customerConfirmationDate} onChange={(v) => update("customerConfirmationDate", v)} /></div></label><TextInput label="نام کارشناس اجرا" value={data.executorConfirmationName} onChange={(v) => update("executorConfirmationName", v)} /><label className="text-sm font-bold">تاریخ تأیید کارشناس (شمسی)<div className="mt-2"><PersianDateInput value={data.executorConfirmationDate} onChange={(v) => update("executorConfirmationDate", v)} /></div></label><TextInput label="نام مسئول پروژه ای‌تی رسام" value={data.managerConfirmationName} onChange={(v) => update("managerConfirmationName", v)} /><label className="text-sm font-bold">تاریخ تأیید مسئول پروژه (شمسی)<div className="mt-2"><PersianDateInput value={data.managerConfirmationDate} onChange={(v) => update("managerConfirmationDate", v)} /></div></label></div><div className="mt-5 grid gap-3 md:grid-cols-2">{["عملیات Passive بررسی شد", "عملیات Active بررسی شد", "تجهیزات تحویل شد", "تست‌های لازم انجام شد", "مستندات تحویل شد", "دسترسی‌ها تحویل شد", "موارد باقی‌مانده ثبت شد", "تأیید کارفرما اخذ شد", "تأیید کارشناس اجرا اخذ شد", "تأیید مسئول پروژه اخذ شد"].map((item) => <label key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={Boolean(data.finalChecks?.[item])} onChange={(e) => update("finalChecks", { ...(data.finalChecks || {}), [item]: e.target.checked })} />{item}</label>)}</div><label className="mt-5 block text-sm font-bold">وضعیت نهایی تحویل<select value={data.finalDeliveryStatus || ""} onChange={(e) => update("finalDeliveryStatus", e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"><option value="">انتخاب وضعیت</option><option>تحویل کامل و مورد تأیید کارفرما</option><option>تحویل با موارد جزئی باقی‌مانده</option><option>تحویل موقت تا زمان رفع موارد</option><option>تحویل مورد تأیید نمی‌باشد</option></select></label></section>
    <Checklist title="پیوست‌های صورتجلسه" items={attachments} data={data.attachmentsChecklist} setData={(i, v) => updateList("attachmentsChecklist", i, v)} options={["تحویل شد", "مشمول پروژه نیست"]} />
    {saveError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{saveError}</p>}
    <div className="project-form-actions glass-panel sticky bottom-4 flex flex-wrap justify-end gap-3 p-4 print:hidden"><button type="button" onClick={() => print("company")} className="rounded-xl border px-5 py-3 font-bold">چاپ برای شرکت</button><button type="button" onClick={() => print("customer")} className="rounded-xl border px-5 py-3 font-bold">چاپ برای مشتری</button><button type="button" disabled={saving} onClick={() => save("submitted")} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">{saving ? "در حال ارسال..." : "ثبت و ارسال برای ادمین"}</button></div>
  </section>{printAudience && <ProjectHandoverPrintDocument item={handover} data={data} audience={printAudience} />}</>;
}
