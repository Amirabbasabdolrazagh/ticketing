"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ProjectHandoverPrintDocument from "./ProjectHandoverPrintDocument";

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
  const print = (id, audience) => { setPrintSelection({ id, audience }); window.setTimeout(() => window.print(), 150); };

  return <section dir="rtl" className="glass-panel space-y-4 p-5">
    <div><h2 className="text-xl font-black">صورتجلسه‌های تحویل پروژه</h2><p className="mt-1 text-sm text-slate-500">پس از تأیید همه صورتجلسه‌ها، پروژه به‌صورت خودکار آرشیو می‌شود.</p></div>
    {items.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">صورتجلسه‌ای ثبت نشده است.</p>}
    {items.map((item) => <div key={item._id} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{item.assignee?.name} — {item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"}</strong><p className="mt-1 text-sm text-slate-500">وضعیت: {item.status}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => print(item._id, "company")} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">چاپ برای شرکت</button><button type="button" onClick={() => print(item._id, "customer")} className="rounded-xl border border-blue-300 px-4 py-2 text-sm font-bold text-blue-800">چاپ برای مشتری</button></div></div>
      <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">{Object.entries(item.data || {}).slice(0, 8).map(([key, entry]) => <p key={key}><b>{key}:</b> {typeof entry === "object" ? JSON.stringify(entry) : String(entry || "—")}</p>)}</div>
      {item.status === "submitted" && <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => approve(item, "rejected")} className="rounded-xl border px-4 py-2">نیازمند اصلاح</button><button type="button" onClick={() => approve(item, "approved")} className="rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">تأیید صورتجلسه</button></div>}
    </div>)}
    {items.map((item) => <ProjectHandoverPrintDocument key={`handover-company-${item._id}`} item={item} audience="company" printable={printSelection?.id === item._id && printSelection.audience === "company"} />)}
    {items.map((item) => <ProjectHandoverPrintDocument key={`handover-customer-${item._id}`} item={item} audience="customer" printable={printSelection?.id === item._id && printSelection.audience === "customer"} />)}
  </section>;
}
