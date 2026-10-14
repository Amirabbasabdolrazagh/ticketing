"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProjectFormStatus from "./ProjectFormStatus";
import "./project-workflow.css";
import axios from "axios";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ClipboardCheck,
  FileCheck2,
  ScrollText,
} from "lucide-react";

const FORM_CONFIG = {
  assessment: {
    title: "فرم ارزیابی",
    description: "ارزیابی اولیه و نیازسنجی ثبت‌شده توسط پشتیبان",
    icon: ClipboardCheck,
    cardClass: "border-cyan-200 bg-gradient-to-br from-cyan-50 to-white",
    iconClass: "bg-cyan-600 text-white",
    linkClass: "bg-cyan-600 text-white",
  },
  brief: {
    title: "فرم ابلاغ",
    description: "تنظیم، ارسال و پیگیری مشاهده شرح وظایف",
    icon: ScrollText,
    cardClass: "border-violet-200 bg-gradient-to-br from-violet-50 to-white",
    iconClass: "bg-violet-600 text-white",
    linkClass: "bg-violet-600 text-white",
  },
  handover: {
    title: "فرم صورت‌جلسه",
    description: "صورت‌جلسه تحویل، تأیید نهایی و نسخه چاپی",
    icon: FileCheck2,
    cardClass: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
    iconClass: "bg-emerald-600 text-white",
    linkClass: "bg-emerald-600 text-white",
  },
};


function dateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function Progress({ value = 0 }) {
  return <div className="min-w-0 w-full">
    <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-600">
      <span>پیشرفت</span><span>{Number(value).toLocaleString("fa-IR")}٪</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-gradient-to-l from-blue-500 to-cyan-400 transition-all" style={{ width: `${value || 0}%` }} />
    </div>
  </div>;
}

export default function ProjectWorkflowDashboard({ projectId, project }) {
  const [assessments, setAssessments] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      axios.get(`/api/projects/${projectId}/assessments`),
      axios.get(`/api/projects/${projectId}/handovers`),
    ]).then(([assessmentResponse, handoverResponse]) => {
      if (!active) return;
      setAssessments(assessmentResponse.data.assessments || []);
      setHandovers(handoverResponse.data.handovers || []);
    }).catch(() => toast.error("دریافت گردش‌کار فرم‌های پروژه ناموفق بود"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [projectId]);

  const rows = useMemo(() => [
    ...assessments.filter((item) => {
      const assignedAgent = item.assigneeRole === "passive_agent" ? project?.passiveAgent : project?.activeAgent;
      return assignedAgent && String(item.assignee?._id || item.assignee) === String(assignedAgent?._id || assignedAgent);
    }).map((item) => ({
      id: item._id,
      type: "assessment",
      title: "ارزیابی",
      agent: item.assignee?.name || "پشتیبان",
      role: item.assigneeRole,
      status: item.status,
      progress: item.progressPercent || (item.status === "reviewed" || item.status === "submitted" ? 100 : 0),
      openedAt: item.openedAt,
      lastSavedAt: item.lastSavedAt || item.updatedAt,
      submittedAt: item.submittedAt,
      confirmedAt: item.reviewedAt,
    })),
    ...assessments.map((item) => ({
      id: item._id,
      type: "brief",
      title: "ابلاغ",
      agent: item.assignee?.name || "پشتیبان",
      role: item.assigneeRole,
      status: item.jobBriefStatus,
      progress: item.jobBriefProgressPercent || (["issued", "acknowledged"].includes(item.jobBriefStatus) ? 100 : 0),
      openedAt: item.jobBriefViewedAt,
      lastSavedAt: item.jobBriefIssuedAt || item.updatedAt,
      submittedAt: item.jobBriefIssuedAt,
      confirmedAt: item.jobBriefAcknowledgedAt,
    })),
    ...handovers.map((item) => ({
      id: item._id,
      type: "handover",
      title: "صورت‌جلسه",
      agent: item.assignee?.name || "پشتیبان",
      role: item.assigneeRole,
      status: item.status,
      progress: item.progressPercent || (["submitted", "approved"].includes(item.status) ? 100 : 0),
      openedAt: item.openedAt,
      lastSavedAt: item.lastSavedAt || item.updatedAt,
      submittedAt: item.submittedAt,
      confirmedAt: item.approvedAt,
    })),
  ], [assessments, handovers, project]);

  return <div className="space-y-5" dir="rtl">
    <section className="grid gap-4 md:grid-cols-3">
      {Object.entries(FORM_CONFIG).map(([type, config]) => {
        const Icon = config.icon;
        const count = type === "handover" ? handovers.length : type === "brief"
          ? assessments.filter((item) => {
            const assignedAgent = item.assigneeRole === "passive_agent" ? project?.passiveAgent : project?.activeAgent;
            return assignedAgent && String(item.assignee?._id || item.assignee) === String(assignedAgent?._id || assignedAgent);
          }).length
          : assessments.length;
        return <article key={type} className={`workflow-form-card group flex min-h-[13rem] flex-col rounded-3xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${config.cardClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div className={`grid size-12 place-items-center rounded-2xl shadow-lg ${config.iconClass}`}><Icon className="size-6" /></div>
            <span className="workflow-form-count rounded-full border border-white bg-white/80 px-3 py-1 text-xs font-black text-slate-600">{count.toLocaleString("fa-IR")} فرم</span>
          </div>
          <h2 className="mt-5 text-xl font-black text-slate-900">{config.title}</h2>
          <p className="mt-2 flex-1 text-sm leading-7 text-slate-600">{config.description}</p>
          <Link href={`/admin/installation-projects/${projectId}/forms/${type}`} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition group-hover:gap-3 ${config.linkClass}`}>
            مشاهده و مدیریت <ArrowLeft className="size-4" />
          </Link>
        </article>;
      })}
    </section>

    <section className="project-workflow-panel glass-panel overflow-hidden">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-900">جدول پیگیری زیرکارها</h2>
        <p className="mt-2 text-sm text-slate-500">وضعیت واقعی شروع، ذخیره، ارسال، مشاهده و تأیید هر فرم</p>
      </div>
      <div className="project-workflow-container">
        <table className="project-workflow-table text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>
            <th className="p-4">فرم</th><th className="p-4">پشتیبان</th><th className="p-4">وضعیت</th><th className="p-4">میزان تکمیل</th><th className="p-4">اولین مشاهده</th><th className="p-4">آخرین فعالیت</th><th className="p-4">ارسال / ابلاغ</th><th className="p-4">تأیید</th><th className="p-4">عملیات</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan="9" className="p-8 text-center text-slate-500">در حال دریافت اطلاعات...</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan="9" className="p-8 text-center text-slate-500">هنوز فرمی برای این پروژه ثبت نشده است.</td></tr>}
            {rows.map((row) => <tr key={`${row.type}-${row.id}`} className="project-workflow-row bg-white/50 transition hover:bg-blue-50/40">
              <td data-label="فرم" className="p-4 font-black text-slate-800">{row.title}</td>
              <td data-label="پشتیبان" className="p-4"><strong>{row.agent}</strong><span className="mt-1 block text-xs text-slate-500">{row.role === "passive_agent" ? "پشتیبان پسیو" : "پشتیبان اکتیو"}</span></td>
              <td data-label="وضعیت" className="p-4"><ProjectFormStatus status={row.status} progress={row.progress} viewedAt={row.openedAt} /></td>
              <td data-label="میزان تکمیل" className="p-4"><Progress value={row.progress} /></td>
              <td data-label="اولین مشاهده" className="p-4 text-xs text-slate-600">{dateTime(row.openedAt)}</td>
              <td data-label="آخرین فعالیت" className="p-4 text-xs text-slate-600">{dateTime(row.lastSavedAt)}</td>
              <td data-label="ارسال / ابلاغ" className="p-4 text-xs text-slate-600">{dateTime(row.submittedAt)}</td>
              <td data-label="تأیید" className="p-4 text-xs text-slate-600">{dateTime(row.confirmedAt)}</td>
              <td data-label="عملیات" className="p-4"><Link href={`/admin/installation-projects/${projectId}/forms/${row.type}/${row.id}`} className="inline-flex rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">مشاهده فرم</Link></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
