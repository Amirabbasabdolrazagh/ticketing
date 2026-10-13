"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { ClipboardCheck, FileCheck2, Trash2 } from "lucide-react";
import ProjectAssessmentForm from "@/components/features/projects/ProjectAssessmentForm";
import ProjectHandoverForm from "@/components/features/projects/ProjectHandoverForm";
import ProjectFormRecord from "@/components/features/projects/ProjectFormRecord";

const statusLabels = {
  assigned: "شروع نشده",
  in_progress: "پیش‌نویس در حال تکمیل",
  submitted: "ارسال‌شده برای ادمین",
  reviewed: "تأیید و تبدیل به پروژه",
  approved: "تأییدشده",
  rejected: "نیازمند اصلاح",
};

export default function AgentProjectWorkList({ type }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [openingId, setOpeningId] = useState(null);
  const openingRef = useRef(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const isAssessment = type === "assessment";
  const endpoint = isAssessment ? "/api/assessments" : "/api/handovers";
  const Icon = isAssessment ? ClipboardCheck : FileCheck2;

  const fetchItems = useCallback(async () => {
    const { data } = await axios.get(endpoint, {
      headers: { "Cache-Control": "no-cache" },
      params: { _fresh: Date.now() },
    });
    return isAssessment ? data.assessments || [] : data.handovers || [];
  }, [endpoint, isAssessment]);

  const load = useCallback(async () => setItems(await fetchItems()), [fetchItems]);

  const createAssessment = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data } = await axios.post("/api/assessments");
      if (!data.success || !data.assessment) throw new Error(data.message || "ساخت فرم ناموفق بود");
      setSelected(data.assessment);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "ساخت فرم ارزیابی ناموفق بود");
    } finally { setCreating(false); }
  };

  const removeAssessment = async (item) => {
    if (!window.confirm("این پیش‌نویس ارزیابی و پیوست‌های آن حذف شود؟ این عمل قابل بازگشت نیست.")) return;
    setDeletingId(item._id);
    try {
      const { data } = await axios.delete(`/api/assessments/${item._id}`);
      if (!data.success) throw new Error(data.message || "حذف فرم ناموفق بود");
      setItems((old) => old.filter((entry) => entry._id !== item._id));
      toast.success("پیش‌نویس ارزیابی حذف شد");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "حذف فرم ناموفق بود");
    } finally { setDeletingId(null); }
  };

  const open = async (item) => {
    if (openingRef.current) return;
    openingRef.current = item._id;
    setOpeningId(item._id);
    try {
      const freshItems = await fetchItems();
      setItems(freshItems);
      const freshItem = freshItems.find((entry) => entry._id === item._id);
      if (!freshItem) throw new Error("فرم دیگر به این حساب اختصاص ندارد");
      const projectId = freshItem.project?._id || freshItem.project;
      if (projectId) {
        const trackingUrl = isAssessment ? `/api/projects/${projectId}/assessments` : `/api/projects/${projectId}/handovers`;
        await axios.patch(trackingUrl, {
          [isAssessment ? "assessmentId" : "handoverId"]: freshItem._id,
          trackingEvent: "opened",
        });
      } else if (isAssessment) {
        await axios.patch(`/api/assessments/${freshItem._id}`, { trackingEvent: "opened" });
      }
      setSelected(freshItem);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "دریافت آخرین نسخه فرم ناموفق بود");
    } finally {
      openingRef.current = null;
      setOpeningId(null);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
    const refresh = () => load().catch(() => {});
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [load]);

  if (selected) {
    const lockedAssessment = isAssessment && (selected.status === "reviewed" || (!selected.project && selected.status === "submitted"));
    return <>
      <Toaster position="top-center" />
      <div dir="rtl" className="app-page mb-3"><button type="button" onClick={() => { setSelected(null); load().catch(() => toast.error("دریافت فرم‌ها ناموفق بود")); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">بازگشت به فهرست فرم‌ها</button></div>
      {lockedAssessment ? <section dir="rtl" className="app-page"><div className="glass-panel p-6"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h1 className="page-heading">پیش‌نمایش ارزیابی ارسال‌شده</h1><p className="mt-2 text-sm text-emerald-800">نسخه نهایی برای بررسی مدیر ثبت شده و دیگر قابل ویرایش نیست.</p></div><div className="mt-6"><ProjectFormRecord data={selected.data} attachments={selected.attachments} attachmentBaseUrl={`/api/assessments/${selected._id}/attachment?file=`} /></div></div></section> : isAssessment ? <ProjectAssessmentForm assessment={selected} onSubmitted={() => { setSelected(null); load().catch(() => {}); }} /> : <ProjectHandoverForm handover={selected} onDone={load} />}
    </>;
  }

  const title = isAssessment ? "فرم‌های ارزیابی پروژه" : "صورت‌جلسه‌های تحویل پروژه";
  const description = isAssessment ? "ارزیابی را مرحله‌به‌مرحله تکمیل کنید؛ پیش‌نویس شما خودکار ذخیره می‌شود." : "وضعیت پیشرفت صورت‌جلسه، آخرین ذخیره و نسخه نهایی را یکجا ببینید.";

  return <section dir="rtl" className="app-page space-y-5">
    <Toaster position="top-center" />
    <div className={`overflow-hidden rounded-3xl border p-6 ${isAssessment ? "border-cyan-200 bg-gradient-to-br from-cyan-50 to-white" : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className={`grid size-12 place-items-center rounded-2xl text-white shadow-lg ${isAssessment ? "bg-cyan-600" : "bg-emerald-600"}`}><Icon className="size-6" /></div><div><h1 className="page-heading">{title}</h1><p className="mt-2 text-sm text-slate-600">{description}</p></div></div>{isAssessment && <button type="button" disabled={creating} onClick={createAssessment} className="rounded-2xl bg-cyan-600 px-5 py-3 font-bold text-white disabled:opacity-60">{creating ? "در حال ایجاد..." : "ارزیابی جدید"}</button>}</div>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {items.length === 0 ? <div className="glass-panel p-8 text-center text-slate-500 lg:col-span-2">فرمی برای شما ثبت نشده است.</div> : items.map((item) => {
        const canDelete = isAssessment && !item.project && ["assigned", "in_progress"].includes(item.status);
        const progress = item.progressPercent || (["submitted", "reviewed", "approved"].includes(item.status) ? 100 : 0);
        return <article key={item._id} className="glass-panel overflow-hidden p-5">
          <div className="w-full text-right">
            <div className="flex items-start justify-between gap-3"><div><strong className="text-base">{item.project?.name || item.data?.projectTitle || "ارزیابی جدید"}</strong><p className="mt-1 text-xs text-slate-500">{item.project?.code ? `کد پروژه: ${item.project.code}` : "پروژه پس از تأیید مدیر ساخته می‌شود"}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{openingId === item._id ? "در حال بازکردن..." : statusLabels[item.status] || "در حال بررسی"}</span></div>
            <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>میزان تکمیل فرم</span><span>{progress.toLocaleString("fa-IR")}٪</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${isAssessment ? "bg-cyan-600" : "bg-emerald-600"}`} style={{ width: `${progress}%` }} /></div></div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">آخرین فعالیت: {new Date(item.lastSavedAt || item.updatedAt).toLocaleString("fa-IR")}</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={Boolean(openingId)} onClick={() => open(item)} className="min-h-11 flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800 transition hover:bg-blue-100 disabled:opacity-60 sm:flex-none">{openingId === item._id ? "در حال بازکردن..." : "مشاهده و تکمیل فرم"}</button>{canDelete && <button type="button" disabled={deletingId === item._id} onClick={() => removeAssessment(item)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-60"><Trash2 className="size-4" />{deletingId === item._id ? "در حال حذف..." : "حذف پیش‌نویس"}</button>}</div>
        </article>;
      })}
    </div>
  </section>;
}
