"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Eye, Printer, X } from "lucide-react";
import ProjectFormRecord, { projectFormLabel } from "./ProjectFormRecord";
import ProjectPrintDocument from "./ProjectPrintDocument";

export default function AgentProjectBriefs() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [printId, setPrintId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const load = useCallback(async () => {
    const { data } = await axios.get("/api/assessments", { params: { _fresh: Date.now() } });
    setItems((data.assessments || []).filter((item) => ["issued", "acknowledged"].includes(item.jobBriefStatus)));
  }, []);
  useEffect(() => {
    // The first fetch initializes the remote list; focus refreshes it later.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => toast.error("دریافت ابلاغ‌ها ناموفق بود"));
    const refresh = () => load().catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);
  useEffect(() => {
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);
  const selected = items.find((item) => item._id === selectedId);
  const printable = items.find((item) => item._id === printId);

  const acknowledge = async (item) => {
    setBusyId(item._id);
    try {
      const { data } = await axios.patch(`/api/projects/${item.project._id}/assessments`, { assessmentId: item._id, jobBriefStatus: "acknowledged" });
      if (!data.success) throw new Error(data.message || "تأیید ثبت نشد");
      toast.success("دریافت و مطالعه ابلاغ ثبت شد");
      await load();
    } catch (error) { toast.error(error.response?.data?.message || error.message || "ثبت تأیید ناموفق بود"); }
    finally { setBusyId(null); }
  };
  const print = (id) => {
    flushSync(() => setPrintId(id));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };

  return <section dir="rtl" className="app-page space-y-5"><Toaster position="top-center" /><header className="glass-panel p-6"><h1 className="page-heading">ابلاغ‌های پروژه</h1><p className="mt-2 text-sm text-slate-500">شرح وظایف و برنامه اجرایی که مدیر برای شما ابلاغ کرده است.</p></header>
    {items.length === 0 ? <div className="glass-panel p-8 text-center text-slate-500">هنوز ابلاغی برای شما صادر نشده است.</div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item._id} className="glass-panel p-5"><span className="text-xs font-bold text-blue-600">{item.assigneeRole === "passive_agent" ? "ابلاغ پسیو" : "ابلاغ اکتیو"}</span><h2 className="mt-2 text-lg font-black">{item.project?.name || item.jobBrief?.projectTitle || "پروژه"}</h2><p className="mt-2 text-sm text-slate-500">کد پروژه: {item.project?.code || "—"} · شماره ابلاغ: {item.jobBrief?.issueNumber || "—"}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedId(item._id)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Eye className="size-4" />مشاهده</button><button type="button" onClick={() => print(item._id)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold"><Printer className="size-4" />چاپ</button><span className="self-center text-xs font-bold text-slate-500">{item.jobBriefStatus === "acknowledged" ? "دریافت تأیید شده" : "در انتظار تأیید دریافت"}</span></div></article>)}</div>}
    {selected && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto max-w-5xl rounded-3xl bg-white p-5 shadow-2xl sm:p-8"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black">ابلاغ پروژه {selected.project?.name}</h2><p className="mt-1 text-sm text-slate-500">شرح وظایف و برنامه اجرای ثبت‌شده توسط ادمین</p></div><button type="button" onClick={() => setSelectedId(null)} aria-label="بستن" className="rounded-xl p-2 hover:bg-slate-100"><X /></button></div><ProjectFormRecord data={selected.jobBrief} /><div className="mt-6 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => print(selected._id)} className="rounded-xl border px-4 py-2 font-bold">چاپ ابلاغ</button>{selected.jobBriefStatus === "issued" && <button type="button" disabled={busyId === selected._id} onClick={() => acknowledge(selected)} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">تأیید دریافت و مطالعه</button>}</div></div></div>}
    {printable && <ProjectPrintDocument title="فرم ابلاغ شرح وظایف و برنامه اجرای پروژه" code="IT-RASAM-NET-FRM-002" projectName={printable.project?.name} details={[{ label: "شماره پروژه", value: printable.project?.code }, { label: "شماره ابلاغ", value: printable.jobBrief?.issueNumber }, { label: "تاریخ ابلاغ", value: printable.jobBrief?.issueDateToAgent }, { label: "نام مشتری", value: printable.jobBrief?.customerName }, { label: "محل اجرا", value: printable.jobBrief?.location }]} sections={[{ title: "شرح وظایف و برنامه اجرا", fields: Object.entries(printable.jobBrief || {}).filter(([key]) => !["deliverables", "schedule", "equipment", "changes", "dailyReports", "delays"].includes(key)).map(([key, value]) => ({ label: projectFormLabel(key), value })) }]} tables={[{ title: "خروجی‌های مورد انتظار", rows: printable.jobBrief?.deliverables, columns: [{ key: "output", label: "خروجی" }, { key: "deadline", label: "مهلت" }, { key: "status", label: "وضعیت" }] }, { title: "برنامه اجرا", rows: printable.jobBrief?.schedule, columns: [{ key: "activity", label: "فعالیت" }, { key: "start", label: "شروع" }, { key: "end", label: "پایان" }] }]} parties={[{ title: "کارشناس اجرا", name: printable.assignee?.name }, { title: "مسئول پروژه", name: printable.jobBrief?.managerName }, { title: "نماینده شرکت", name: printable.jobBrief?.signatureTechnicalManager }]} />}
  </section>;
}
