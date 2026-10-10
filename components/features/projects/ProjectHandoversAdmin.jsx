"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ProjectPrintDocument from "./ProjectPrintDocument";

const value = (data, key) => data?.[key];
const fieldList = (data, pairs) => pairs.map(([label, key]) => ({ label, value: value(data, key) }));

function HandoverDocument({ item, printable }) {
  const data = item.data || {};
  const projectName = item.project?.name || "پروژه نصب و راه‌اندازی";
  return <ProjectPrintDocument printable={printable} title="صورتجلسه تحویل و تأیید پروژه" code="IT-RASAM-NET-FRM-001" projectName={projectName}
    details={fieldList(data, [["شماره صورتجلسه", "meetingNumber"], ["شماره پروژه / قرارداد", "contractNumber"], ["تاریخ صدور", "issueDate"], ["وضعیت سند", "documentStatus"], ["نام کارفرما", "customerName"], ["محل اجرا", "location"], ["نماینده کارفرما", "customerRepresentative"], ["سمت نماینده", "customerRepresentativeRole"], ["شماره تماس", "customerPhone"], ["مجری پروژه", "executorName"], ["مسئول پروژه", "projectManager"], ["شروع عملیات", "startDate"], ["پایان عملیات", "endDate"], ["تاریخ تحویل", "handoverDate"]])}
    sections={[
      { title: "شرح عملیات و نتیجه تحویل", fields: fieldList(data, [["شرح عملیات پسیو", "passiveDescription"], ["نتیجه تست نهایی", "finalTestResult"], ["روش تحویل دسترسی‌ها", "accessMethods"], ["شرح فعالیت‌ها", "activities"], ["تجهیزات نصب‌شده", "installedItems"], ["تنظیمات انجام‌شده", "configurations"], ["مشکلات و موانع", "obstacles"], ["اقدامات اصلاحی", "correctiveActions"], ["توضیحات مشتری", "customerNotes"], ["وضعیت نهایی تحویل", "finalDeliveryStatus"]]) },
      { title: "چک‌لیست‌های خدمات و مستندات", fields: fieldList(data, [["خدمات پسیو", "passiveServices"], ["خدمات اکتیو", "activeServices"], ["تست‌های شبکه", "networkTests"], ["مستندات تحویلی", "documentation"], ["تحویل دسترسی‌ها", "accesses"], ["روش‌های تحویل اطلاعات دسترسی", "accessMethods"], ["آموزش و تحویل عملیاتی", "training"], ["تأییدهای مشتری", "customerConfirmations"], ["کنترل‌های نهایی", "finalChecks"]]) },
      { title: "پیوست‌های اعلام‌شده", fields: fieldList(data, [["پیوست‌ها", "attachments"], ["تعداد صفحات پیوست", "attachmentPages"], ["توضیحات پیوست", "attachmentNotes"]]) },
    ]}
    tables={[
      { title: "نودها و نقاط شبکه", rows: data.nodes, columns: [{ key: "node", label: "نود" }, { key: "location", label: "محل نصب" }, { key: "patchPanel", label: "Patch Panel" }, { key: "switchPort", label: "Switch Port" }, { key: "status", label: "وضعیت" }] },
      { title: "تجهیزات پسیو", rows: data.passiveEquipment, columns: [{ key: "type", label: "نوع" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "count", label: "تعداد" }, { key: "status", label: "وضعیت" }] },
      { title: "تجهیزات اکتیو", rows: data.activeEquipment, columns: [{ key: "type", label: "نوع" }, { key: "brand", label: "برند" }, { key: "model", label: "مدل" }, { key: "serial", label: "سریال" }, { key: "managementIp", label: "IP مدیریتی" }, { key: "status", label: "وضعیت" }] },
      { title: "موارد باقی‌مانده پروژه", rows: data.punchList, columns: [{ key: "issue", label: "شرح مورد" }, { key: "owner", label: "مسئول" }, { key: "deadline", label: "مهلت" }, { key: "status", label: "وضعیت" }] },
    ]}
    parties={[{ title: "نماینده کارفرما", name: data.customerConfirmationName, role: data.customerRepresentativeRole }, { title: "کارشناس / مجری پروژه", name: data.executorConfirmationName || data.executorName }, { title: "مسئول پروژه ای‌تی رسام", name: data.managerConfirmationName || data.projectManager }]} />;
}

export default function ProjectHandoversAdmin({ projectId }) {
  const [items, setItems] = useState([]);
  const [printId, setPrintId] = useState(null);
  const load = async () => {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}/handovers`);
      setItems(data.handovers || []);
    } catch { toast.error("دریافت صورتجلسه‌ها ناموفق بود"); }
  };
  useEffect(() => {
    let active = true;
    axios.get(`/api/projects/${projectId}/handovers`).then(({ data }) => {
      if (active) setItems(data.handovers || []);
    }).catch(() => { if (active) toast.error("دریافت صورتجلسه‌ها ناموفق بود"); });
    return () => { active = false; };
  }, [projectId]);
  useEffect(() => {
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  const approve = async (item, status) => {
    try {
      await axios.patch(`/api/projects/${projectId}/handovers`, { handoverId: item._id, status });
      toast.success(status === "approved" ? "صورتجلسه تأیید شد" : "صورتجلسه برای اصلاح برگشت داده شد");
      await load();
    } catch { toast.error("عملیات ناموفق بود"); }
  };
  const print = (id) => { setPrintId(id); window.setTimeout(() => window.print(), 150); };

  return <section dir="rtl" className="glass-panel space-y-4 p-5">
    <div><h2 className="text-xl font-black">صورتجلسه‌های تحویل پروژه</h2><p className="mt-1 text-sm text-slate-500">پس از تأیید همه صورتجلسه‌ها، پروژه به‌صورت خودکار آرشیو می‌شود.</p></div>
    {items.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">صورتجلسه‌ای ثبت نشده است.</p>}
    {items.map((item) => <div key={item._id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{item.assignee?.name} — {item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</strong><p className="mt-1 text-sm text-slate-500">وضعیت: {item.status}</p></div><button type="button" onClick={() => print(item._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">چاپ صورتجلسه</button></div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">{Object.entries(item.data || {}).slice(0, 8).map(([key, entry]) => <p key={key}><b>{key}:</b> {typeof entry === "object" ? JSON.stringify(entry) : String(entry || "—")}</p>)}</div>
      {item.status === "submitted" && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => approve(item, "rejected")} className="rounded-xl border px-4 py-2">نیازمند اصلاح</button><button type="button" onClick={() => approve(item, "approved")} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">تأیید صورتجلسه</button></div>}
    </div>)}
    {items.map((item) => <HandoverDocument key={`handover-print-${item._id}`} item={item} printable={printId === item._id} />)}
  </section>;
}
