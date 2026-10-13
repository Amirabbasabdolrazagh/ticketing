"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import { flushSync } from "react-dom";
import { ArrowRight, CheckCircle2, Printer, RotateCcw } from "lucide-react";
import ProjectFormRecord from "./ProjectFormRecord";
import ProjectJobBriefAdmin from "./ProjectJobBriefAdmin";
import ProjectHandoverPrintDocument from "./ProjectHandoverPrintDocument";
import { assessmentDocument } from "./ProjectAssessmentsAdmin";

const titles = {
  assessment: "فرم ارزیابی و ثبت اولیه پروژه",
  brief: "فرم ابلاغ شرح وظایف و برنامه اجرای پروژه",
  handover: "صورت‌جلسه تحویل و تأیید پروژه",
};

const statusLabels = {
  assigned: "شروع نشده",
  in_progress: "در حال تکمیل",
  submitted: "ارسال‌شده برای بررسی",
  reviewed: "تأییدشده",
  draft: "پیش‌نویس",
  issued: "ابلاغ‌شده",
  acknowledged: "مشاهده و تأییدشده",
  approved: "تأیید نهایی",
  rejected: "نیازمند اصلاح",
};

function dateTime(value) {
  return value ? new Date(value).toLocaleString("fa-IR") : "ثبت نشده";
}

export default function AdminProjectFormDetail({ projectId, formType, formId }) {
  const [project, setProject] = useState(null);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printAudience, setPrintAudience] = useState(null);

  const load = useCallback(async () => {
    const endpoint = formType === "handover"
      ? `/api/projects/${projectId}/handovers`
      : `/api/projects/${projectId}/assessments`;
    const [projectResponse, formResponse] = await Promise.all([
      axios.get(`/api/installation-projects/${projectId}`),
      axios.get(endpoint),
    ]);
    const collection = formType === "handover" ? formResponse.data.handovers : formResponse.data.assessments;
    setProject(projectResponse.data.project);
    setItem((collection || []).find((entry) => entry._id === formId) || null);
  }, [formId, formType, projectId]);

  useEffect(() => {
    // Initial form data is loaded from the authenticated project APIs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => toast.error("دریافت فرم ناموفق بود")).finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const clear = () => setPrintAudience(null);
    window.addEventListener("afterprint", clear);
    return () => window.removeEventListener("afterprint", clear);
  }, []);

  const print = (audience = "company") => {
    flushSync(() => setPrintAudience(audience));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  };

  const review = async (status) => {
    try {
      if (formType === "assessment") {
        await axios.patch(`/api/projects/${projectId}/assessments`, { assessmentId: formId, status: "reviewed" });
        toast.success("فرم ارزیابی تأیید شد");
      } else {
        await axios.patch(`/api/projects/${projectId}/handovers`, { handoverId: formId, status });
        toast.success(status === "approved" ? "صورت‌جلسه تأیید شد" : "صورت‌جلسه برای اصلاح برگشت داده شد");
      }
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "ثبت نتیجه بررسی ناموفق بود");
    }
  };

  if (loading) return <section className="app-page"><div className="glass-panel p-6">در حال دریافت فرم...</div></section>;
  if (!item || !project || !titles[formType]) return <section className="app-page"><div className="glass-panel p-6">فرم موردنظر پیدا نشد.</div></section>;

  if (formType === "brief") {
    return <section dir="rtl" className="app-page space-y-5">
      <Link href={`/admin/installation-projects/${projectId}/forms/brief`} className="print:hidden inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-700"><ArrowRight className="size-4" />بازگشت به ابلاغ‌ها</Link>
      <ProjectJobBriefAdmin projectId={projectId} project={project} selectedAssessmentId={formId} />
    </section>;
  }

  const status = item.status;
  const progress = item.progressPercent || (["submitted", "reviewed", "approved"].includes(status) ? 100 : 0);
  return <section dir="rtl" className="app-page space-y-5">
    <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
      <Link href={`/admin/installation-projects/${projectId}/forms/${formType}`} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-black text-slate-700"><ArrowRight className="size-4" />بازگشت به فهرست</Link>
      <button type="button" onClick={() => print("company")} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white"><Printer className="size-4" />چاپ فرم</button>
    </div>

    <header className="glass-panel overflow-hidden p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{formType === "assessment" ? "IT-RASAM-NET-FRM-003" : "IT-RASAM-NET-FRM-001"}</span><h1 className="mt-3 text-2xl font-black">{titles[formType]}</h1><p className="mt-2 text-sm text-slate-500">{project.name} — {item.assignee?.name || "پشتیبان"} ({item.assigneeRole === "passive_agent" ? "پسیو" : "اکتیو"})</p></div>
        <span className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white">{statusLabels[status] || status}</span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">میزان تکمیل</p><strong className="mt-1 block text-lg">{progress.toLocaleString("fa-IR")}٪</strong></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">اولین مشاهده</p><strong className="mt-1 block text-xs">{dateTime(item.openedAt)}</strong></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">آخرین ذخیره</p><strong className="mt-1 block text-xs">{dateTime(item.lastSavedAt || item.updatedAt)}</strong></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">زمان ارسال</p><strong className="mt-1 block text-xs">{dateTime(item.submittedAt)}</strong></div>
      </div>
    </header>

    <div className="glass-panel p-5 sm:p-7"><ProjectFormRecord data={item.data} attachments={item.attachments} attachmentBaseUrl={formType === "assessment" ? `/api/projects/${projectId}/assessments/attachment?assessmentId=${item._id}&file=` : undefined} /></div>

    {formType === "assessment" && status === "submitted" && <div className="print:hidden flex justify-end"><button type="button" onClick={() => review("reviewed")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white"><CheckCircle2 className="size-5" />تأیید فرم ارزیابی</button></div>}
    {formType === "handover" && status === "submitted" && <div className="print:hidden flex flex-wrap justify-end gap-3"><button type="button" onClick={() => review("rejected")} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 font-black text-amber-800"><RotateCcw className="size-5" />برگشت برای اصلاح</button><button type="button" onClick={() => review("approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white"><CheckCircle2 className="size-5" />تأیید صورت‌جلسه</button></div>}

    {formType === "assessment" && assessmentDocument(item, Boolean(printAudience))}
    {formType === "handover" && printAudience && <ProjectHandoverPrintDocument item={item} audience={printAudience} />}
  </section>;
}
