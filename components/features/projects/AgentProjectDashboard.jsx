"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ClipboardList, FolderKanban, FileCheck2, Hourglass, RefreshCw } from "lucide-react";

export default function AgentProjectDashboard({ role }) {
  const [assessments, setAssessments] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const config = { headers: { "Cache-Control": "no-cache" }, params: { _fresh: Date.now() } };
      const [assessmentResponse, handoverResponse] = await Promise.all([
        axios.get("/api/assessments", config),
        axios.get("/api/handovers", config),
      ]);
      setAssessments(assessmentResponse.data.assessments || []);
      setHandovers(handoverResponse.data.handovers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
    const refresh = () => load().catch(() => {});
    const interval = window.setInterval(refresh, 20_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  const projects = useMemo(
    () => new Set([...assessments, ...handovers].map((item) => String(item.project?._id || item.project))).size,
    [assessments, handovers],
  );
  const finished = handovers.filter((item) => item.status === "approved").length;
  const pendingAssessments = assessments.filter((item) => !["submitted", "reviewed"].includes(item.status)).length;
  const pendingHandovers = handovers.filter((item) => !["submitted", "approved"].includes(item.status)).length;
  const cards = [
    [FolderKanban, "پروژه‌های ارجاع‌شده", projects, "bg-blue-100 text-blue-700"],
    [ClipboardList, "ارزیابی‌های در انتظار", pendingAssessments, "bg-amber-100 text-amber-700"],
    [Hourglass, "صورتجلسه‌های در انتظار", pendingHandovers, "bg-violet-100 text-violet-700"],
    [FileCheck2, "پروژه‌های تأییدشده", finished, "bg-emerald-100 text-emerald-700"],
  ];

  return <section dir="rtl" className="app-page space-y-5"><div className="glass-panel p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">داشبورد کارشناس {role === "passive_agent" ? "پسیو" : "اکتیو"}</span><h1 className="mt-3 page-heading">مرکز عملیات پروژه‌ها</h1><p className="mt-2 text-sm text-slate-500">وضعیت پروژه‌های اجرایی، فرم‌ها و صورتجلسه‌های خود را از اینجا پیگیری کنید.</p></div><button type="button" onClick={() => { setLoading(true); load().catch(() => {}); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />به‌روزرسانی</button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([Icon, title, value, color]) => <div key={title} className="metric-card"><span className={`flex size-11 items-center justify-center rounded-2xl ${color}`}><Icon className="size-5" /></span><p className="mt-4 text-sm text-slate-500">{title}</p><strong className="mt-1 block text-3xl">{Number(value).toLocaleString("fa-IR")}</strong></div>)}</div><div className="grid gap-4 md:grid-cols-2"><Link href={`/${role}/assessments`} className="glass-panel p-5 transition hover:-translate-y-0.5"><strong>فرم‌های ارزیابی</strong><p className="mt-2 text-sm text-slate-500">ثبت اطلاعات اولیه و نیازسنجی پروژه</p></Link><Link href={`/${role}/handovers`} className="glass-panel p-5 transition hover:-translate-y-0.5"><strong>صورتجلسه تحویل</strong><p className="mt-2 text-sm text-slate-500">ثبت تحویل فنی بعد از اتمام اجرا</p></Link></div></section>;
}
