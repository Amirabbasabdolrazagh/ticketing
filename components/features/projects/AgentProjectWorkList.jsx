"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ProjectAssessmentForm from "@/components/features/projects/ProjectAssessmentForm";
import ProjectHandoverForm from "@/components/features/projects/ProjectHandoverForm";

export default function AgentProjectWorkList({ type }) {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null);
  const isAssessment = type === "assessment";
  const load = async () => { const { data } = await axios.get(isAssessment ? "/api/assessments" : "/api/handovers"); setItems(isAssessment ? data.assessments || [] : data.handovers || []); };
  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {}); 
    // The list is intentionally loaded once when its dedicated page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (selected) return isAssessment ? <ProjectAssessmentForm assessment={selected} /> : <ProjectHandoverForm handover={selected} onDone={load} />;
  const title = isAssessment ? "فرم‌های ارزیابی پروژه" : "صورتجلسه‌های تحویل پروژه";
  const description = isAssessment ? "اطلاعات اولیه پروژه‌های ارجاع‌شده را تکمیل و برای مدیر ارسال کنید." : "پس از پایان اجرا، صورتجلسه تحویل را تکمیل و ارسال کنید.";
  return <section dir="rtl" className="app-page space-y-5"><div className="glass-panel p-6"><h1 className="page-heading">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></div><div className="space-y-3">{items.length === 0 ? <div className="glass-panel p-8 text-center text-slate-500">فرمی برای شما ثبت نشده است.</div> : items.map((item) => <button key={item._id} onClick={() => setSelected(item)} className="glass-panel block w-full p-5 text-right transition hover:-translate-y-0.5"><div className="flex items-center justify-between gap-3"><strong>{item.project?.name || "پروژه"}</strong><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{item.status}</span></div><p className="mt-2 text-sm text-slate-500">کد پروژه: {item.project?.code || "—"}</p></button>)}</div></section>;
}
