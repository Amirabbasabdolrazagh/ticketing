"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { flushSync } from "react-dom";
import ProjectHandoverPrintDocument from "./ProjectHandoverPrintDocument";

const statusLabels = {
  assigned: "در حال تکمیل",
  submitted: "ارسال‌شده برای بررسی",
  approved: "تأییدشده",
  rejected: "نیازمند اصلاح",
};

export default function ProjectHandoversAdmin({ projectId }) {
  const [items, setItems] = useState([]);
  const [printSelection, setPrintSelection] = useState(null);
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
    const clear = () => setPrintSelection(null);
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
  const print = (id, audience) => {
    flushSync(() => setPrintSelection({ id, audience }));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };

  return <section dir="rtl" className="glass-panel space-y-4 p-5">
    <div><h2 className="text-xl font-black">صورتجلسه‌های تحویل پروژه</h2><p className="mt-1 text-sm text-slate-500">پس از تأیید همه صورتجلسه‌ها، پروژه به‌صورت خودکار آرشیو می‌شود.</p></div>
    {items.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">صورتجلسه‌ای ثبت نشده است.</p>}
    {items.map((item) => <div key={item._id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{item.assignee?.name} — {item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</strong><p className="mt-1 text-sm text-slate-500">وضعیت: {statusLabels[item.status] || "در انتظار بررسی"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => print(item._id, "company")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">چاپ برای شرکت</button><button type="button" onClick={() => print(item._id, "customer")} className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-800">چاپ برای مشتری</button></div></div>
      <dl className="mt-4 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
        {[["شماره صورتجلسه", item.data?.meetingNumber], ["نام کارفرما", item.data?.customerName], ["محل اجرای پروژه", item.data?.location], ["تاریخ تحویل", item.data?.handoverDate]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 px-4 py-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value || "ثبت نشده"}</dd></div>)}
      </dl>
      {item.status === "submitted" && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => approve(item, "rejected")} className="rounded-xl border px-4 py-2">نیازمند اصلاح</button><button type="button" onClick={() => approve(item, "approved")} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">تأیید صورتجلسه</button></div>}
    </div>)}
    {printSelection && items.filter((item) => item._id === printSelection.id).map((item) => <ProjectHandoverPrintDocument key={`handover-${item._id}-${printSelection.audience}`} item={item} audience={printSelection.audience} />)}
  </section>;
}
