"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import ProjectAssessmentForm from "@/components/features/projects/ProjectAssessmentForm";
import ProjectHandoverForm from "@/components/features/projects/ProjectHandoverForm";
import ProjectFormRecord from "@/components/features/projects/ProjectFormRecord";

export default function AgentProjectWorkList({ type }) {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const isAssessment = type === "assessment";
  const endpoint = isAssessment ? "/api/assessments" : "/api/handovers";
  const fetchItems = useCallback(async () => {
    const { data } = await axios.get(endpoint, { headers: { "Cache-Control": "no-cache" }, params: { _fresh: Date.now() } });
    return isAssessment ? data.assessments || [] : data.handovers || [];
  }, [endpoint, isAssessment]);
  const load = useCallback(async () => { setItems(await fetchItems()); }, [fetchItems]);
  const createAssessment = async () => {
    try {
      const { data } = await axios.post("/api/assessments");
      if (!data.success || !data.assessment) throw new Error(data.message || "ساخت فرم ناموفق بود");
      setSelected(data.assessment);
      await load();
    } catch (error) { toast.error(error.response?.data?.message || error.message || "ساخت فرم ارزیابی ناموفق بود"); }
  };
  const open = async (item) => {
    if (openingId) return;
    setOpeningId(item._id);
    try {
      const freshItems = await fetchItems();
      setItems(freshItems);
      const freshItem = freshItems.find((entry) => entry._id === item._id);
      if (!freshItem) throw new Error("فرم دیگر به این حساب اختصاص ندارد");
      setSelected(freshItem);
    } catch (error) {
      toast.error(error.message || "دریافت آخرین نسخه فرم ناموفق بود");
    } finally {
      setOpeningId(null);
    }
  };
  useEffect(() => {
    // This initializes the remote form list; later refreshes happen on window focus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
    const refresh = () => load().catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);
  if (selected) return <><Toaster position="top-center" /><div dir="rtl" className="app-page mb-3"><button type="button" onClick={() => { setSelected(null); load().catch(() => toast.error("دریافت فرم‌ها ناموفق بود")); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">بازگشت به فهرست فرم‌ها</button></div>{isAssessment && (selected.status === "reviewed" || (!selected.project && selected.status === "submitted")) ? <section dir="rtl" className="app-page"><div className="glass-panel p-6"><h1 className="page-heading">ارزیابی ارسال‌شده</h1><p className="mt-2 text-sm text-slate-500">این نسخه برای بررسی مدیر ثبت شده و دیگر قابل ویرایش نیست.</p><div className="mt-6"><ProjectFormRecord data={selected.data} attachments={selected.attachments} attachmentBaseUrl={`/api/assessments/${selected._id}/attachment?file=`} /></div></div></section> : isAssessment ? <ProjectAssessmentForm assessment={selected} onSubmitted={() => { setSelected(null); load().catch(() => {}); }} /> : <ProjectHandoverForm handover={selected} onDone={load} />}</>;
  const title = isAssessment ? "فرم‌های ارزیابی پروژه" : "صورتجلسه‌های تحویل پروژه";
  const description = isAssessment ? "بدون نیاز به ساخت پروژه، ارزیابی تازه‌ای ثبت کنید و برای تأیید مدیر بفرستید." : "پس از پایان اجرا، صورتجلسه تحویل را تکمیل و ارسال کنید.";
  const statusLabel = { assigned: "در انتظار تکمیل", in_progress: "پیش‌نویس", submitted: "در انتظار تأیید ادمین", reviewed: "تأیید و تبدیل به پروژه", approved: "تأییدشده", rejected: "نیازمند اصلاح" };
  return <section dir="rtl" className="app-page space-y-5"><Toaster position="top-center" /><div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-6"><div><h1 className="page-heading">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div>{isAssessment && <button type="button" onClick={createAssessment} className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white">ارزیابی جدید</button>}</div><div className="space-y-3">{items.length === 0 ? <div className="glass-panel p-8 text-center text-slate-500">فرمی برای شما ثبت نشده است.</div> : items.map((item) => <button key={item._id} type="button" disabled={Boolean(openingId)} onClick={() => open(item)} className="glass-panel block w-full p-5 text-right transition hover:-translate-y-0.5 disabled:opacity-60"><div className="flex items-center justify-between gap-3"><strong>{item.project?.name || item.data?.projectTitle || "ارزیابی جدید"}</strong><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{openingId === item._id ? "در حال دریافت..." : statusLabel[item.status] || "در حال بررسی"}</span></div><p className="mt-2 text-sm text-slate-500">{item.project?.code ? `کد پروژه: ${item.project.code}` : "پروژه پس از تأیید ادمین ساخته می‌شود"}</p></button>)}</div></section>;
}
