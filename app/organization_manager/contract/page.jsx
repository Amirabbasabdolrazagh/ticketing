"use client";

import axios from "axios";
import { CalendarDays, CheckCircle2, FileCheck2, ShieldCheck, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

const labels = { onsiteService: "خدمات حضوری و اعزام کارشناس", secureCall: "تماس امن با پشتیبانی", remoteSupport: "پشتیبانی و دسترسی از راه دور", prioritySupport: "رسیدگی با اولویت ویژه" };
const level = { basic: "پایه", standard: "استاندارد", premium: "ویژه" };
const status = { active: "فعال", expiring: "رو به پایان", expired: "منقضی", draft: "پیش‌نویس" };
const date = (value) => value ? new Date(value).toLocaleDateString("fa-IR-u-ca-persian") : "تعیین نشده";

export default function OrganizationContractPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { axios.get("/api/organization/capabilities").then(({ data: result }) => setData(result)).catch((requestError) => setError(requestError.response?.data?.message || "دریافت قرارداد ناموفق بود")); }, []);
  if (error) return <section className="app-page"><div className="glass-panel p-8 text-center text-rose-600">{error}</div></section>;
  if (!data) return <section className="app-page"><div className="glass-panel grid min-h-52 place-items-center text-slate-400">در حال دریافت قرارداد…</div></section>;
  return <section className="app-page space-y-5" dir="rtl"><header className="glass-panel p-5 sm:p-7"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 text-white"><FileCheck2 /></span><div><h1 className="page-heading">قرارداد پشتیبانی سازمان</h1><p className="mt-1 text-sm text-slate-500">امکانات قابل استفاده در پرتال بر اساس مفاد این قرارداد فعال می‌شوند.</p></div></div></header><article className="glass-panel p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold text-blue-600">{data.organization.name}</p><h2 className="mt-1 text-xl font-black text-slate-950">{data.contract.title || "قرارداد پشتیبانی"}</h2><p className="mt-1 text-xs text-slate-500">کد سازمان: {data.organization.code}</p></div><span className={`rounded-full px-4 py-2 text-xs font-black ${data.contract.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{data.contract.isActive ? "قرارداد قابل استفاده" : status[data.contract.status] || "غیرفعال"}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><Info icon={ShieldCheck} label="سطح قرارداد" value={level[data.contract.level] || "—"} /><Info icon={CalendarDays} label="تاریخ شروع" value={date(data.contract.startAt)} /><Info icon={CalendarDays} label="تاریخ پایان" value={date(data.contract.endAt)} /></div></article><div className="grid gap-4 sm:grid-cols-2">{Object.entries(labels).map(([key, label]) => { const enabled = Boolean(data.features[key]); return <article key={key} className={`rounded-3xl border p-5 ${enabled ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-center gap-3">{enabled ? <CheckCircle2 className="size-6 text-emerald-600" /> : <XCircle className="size-6 text-slate-400" />}<div><h3 className="font-black text-slate-900">{label}</h3><p className="mt-1 text-xs text-slate-500">{enabled ? "در قرارداد شما فعال است و از منوی پرتال قابل استفاده است." : "در قرارداد فعلی فعال نشده است."}</p></div></div></article>; })}</div></section>;
}

function Info({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><span className="flex items-center gap-2 text-[10px] text-slate-500"><Icon className="size-4 text-blue-600" />{label}</span><b className="mt-2 block text-sm text-slate-800">{value}</b></div>; }
