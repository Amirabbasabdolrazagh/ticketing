"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ProjectAssessmentForm from "@/components/features/projects/ProjectAssessmentForm";
import ProjectHandoverForm from "@/components/features/projects/ProjectHandoverForm";

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
  if (selected) return <><div dir="rtl" className="app-page mb-3"><button type="button" onClick={() => { setSelected(null); load().catch(() => toast.error("دریافت فرم‌ها ناموفق بود")); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">بازگشت به فهرست فرم‌ها</button></div>{isAssessment ? <ProjectAssessmentForm assessment={selected} /> : <ProjectHandoverForm handover={selected} onDone={load} />}</>;
  const title = isAssessment ? "فرم‌های ارزیابی پروژه" : "صورتجلسه‌های تحویل پروژه";
  const description = isAssessment ? "اطلاعات اولیه پروژه‌های ارجاع‌شده را تکمیل و برای مدیر ارسال کنید." : "پس از پایان اجرا، صورتجلسه تحویل را تکمیل و ارسال کنید.";
  return <section dir="rtl" className="app-page space-y-5"><div className="glass-panel p-6"><h1 className="page-heading">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div><div className="space-y-3">{items.length === 0 ? <div className="glass-panel p-8 text-center text-slate-500">فرمی برای شما ثبت نشده است.</div> : items.map((item) => <button key={item._id} type="button" disabled={Boolean(openingId)} onClick={() => open(item)} className="glass-panel block w-full p-5 text-right transition hover:-translate-y-0.5 disabled:opacity-60"><div className="flex items-center justify-between gap-3"><strong>{item.project?.name || "پروژه"}</strong><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{openingId === item._id ? "در حال دریافت..." : item.status}</span></div><p className="mt-2 text-sm text-slate-500">کد پروژه: {item.project?.code || "—"}</p></button>)}</div></section>;
}
