"use client";
import ProjectFormStatus from "./ProjectFormStatus";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowRight, ChevronLeft } from "lucide-react";

const CONFIG = {
  assessment: { title: "فرم‌های ارزیابی پروژه", description: "مشاهده نسخه تکمیل‌شده پشتیبان و چاپ فرم رسمی", color: "cyan" },
  brief: { title: "فرم ابلاغ شرح وظایف و برنامه اجرا", description: "تکمیل، ابلاغ و پیگیری مشاهده و تأیید پشتیبان", color: "violet" },
  handover: { title: "صورت‌جلسه‌های تحویل پروژه", description: "بررسی پیشرفت، مشاهده، چاپ و تأیید صورت‌جلسه", color: "emerald" },
};


const accents = {
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function dateTime(value) {
  return value ? new Date(value).toLocaleString("fa-IR") : "ثبت نشده";
}

export default function AdminProjectFormsHub({ projectId, formType }) {
  const config = CONFIG[formType];
  const [project, setProject] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = formType === "handover"
      ? `/api/projects/${projectId}/handovers`
      : `/api/projects/${projectId}/assessments`;
    Promise.all([
      axios.get(`/api/installation-projects/${projectId}`),
      axios.get(endpoint),
    ]).then(([projectResponse, formsResponse]) => {
      const loadedProject = projectResponse.data.project;
      const loadedItems = formType === "handover" ? formsResponse.data.handovers || [] : formsResponse.data.assessments || [];
      setProject(loadedProject);
      setItems(formType === "brief" ? loadedItems.filter((item) => {
        const assignedAgent = item.assigneeRole === "passive_agent" ? loadedProject?.passiveAgent : loadedProject?.activeAgent;
        return assignedAgent && String(item.assignee?._id || item.assignee) === String(assignedAgent?._id || assignedAgent);
      }) : loadedItems);
    }).finally(() => setLoading(false));
  }, [formType, projectId]);

  if (!config) return null;

  return <section dir="rtl" className="app-page space-y-5">
    <div className={`rounded-3xl border p-6 ${accents[config.color]}`}>
      <Link href={`/admin/installation-projects/${projectId}`} className="inline-flex items-center gap-2 text-xs font-black"><ArrowRight className="size-4" />بازگشت به پروژه</Link>
      <h1 className="mt-5 text-2xl font-black">{config.title}</h1>
      <p className="mt-2 text-sm leading-7 opacity-80">{config.description}</p>
      {project && <p className="mt-4 rounded-xl bg-white/60 px-4 py-3 text-sm font-bold">پروژه: {project.name} — کد {project.code}</p>}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      {loading && <div className="glass-panel p-8 text-center text-slate-500 lg:col-span-2">در حال دریافت فرم‌ها...</div>}
      {!loading && items.length === 0 && <div className="glass-panel p-8 text-center text-slate-500 lg:col-span-2">فرمی برای این بخش ثبت نشده است.</div>}
      {items.map((item) => {
        const status = formType === "brief" ? item.jobBriefStatus : item.status;
        const progress = formType === "brief"
          ? item.jobBriefProgressPercent || (["issued", "acknowledged"].includes(status) ? 100 : 0)
          : item.progressPercent || (["submitted", "reviewed", "approved"].includes(status) ? 100 : 0);
        const lastActivity = formType === "brief" ? item.jobBriefIssuedAt || item.updatedAt : item.lastSavedAt || item.updatedAt;
        return <article key={item._id} className="glass-panel overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-black text-slate-900">{item.assignee?.name || "پشتیبان"}</h2><p className="mt-1 text-xs text-slate-500">{item.assigneeRole === "passive_agent" ? "پشتیبان پسیو" : "پشتیبان اکتیو"}</p></div>
            <ProjectFormStatus status={status} progress={progress} viewedAt={formType === "brief" ? item.jobBriefViewedAt : item.openedAt} />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>میزان تکمیل</span><span>{progress.toLocaleString("fa-IR")}٪</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div>
          </div>
          <p className="mt-4 text-xs text-slate-500">آخرین فعالیت: {dateTime(lastActivity)}</p>
          <Link href={`/admin/installation-projects/${projectId}/forms/${formType}/${item._id}`} className="mt-5 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">مشاهده صفحه کامل فرم <ChevronLeft className="size-4" /></Link>
        </article>;
      })}
    </div>
  </section>;
}
